from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import emailing, otp, social
from .models import Address, EmailLog, EmailOTP, Profile, SocialAccount
from .serializers import (AddressSerializer, ChangePasswordSerializer, ForgotPasswordSerializer,
                          LoginSerializer, RegisterSerializer, ResendOTPSerializer, ResetPasswordSerializer,
                          UserSerializer, VerifyEmailSerializer, pending_user)

User = get_user_model()
RESET_MAX_PER_HOUR = 5


def auth_payload(user):
    try:  # earlier guest orders placed with this (verified) email become theirs
        from shopping.guest import attach_guest_orders
        attach_guest_orders(user)
    except Exception:  # noqa: BLE001 - never block a sign-in because of this
        pass
    token, _ = Token.objects.get_or_create(user=user)
    return {'token': token.key, 'user': UserSerializer(user).data}


def send_code(user, *, first_time=False):
    """Create and email a fresh sign-up code. `first_time` (right after the form) treats an already-sent
    code as success, so a double click never shows an error."""
    ok, wait = otp.send_allowed(user)
    if not ok:
        if first_time:
            return Response({'email': user.email, 'resend_in': wait, 'expires_in': otp.TTL_SECONDS,
                             'detail': 'A code was just sent to your email.'})
        return Response({'detail': 'Please wait a moment before requesting another code.', 'retry_after': wait},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    code = otp.issue(user)
    log = emailing.send_otp(user, code, otp.TTL_SECONDS // 60)
    if log.status != EmailLog.SENT:
        EmailOTP.objects.filter(user=user, used_at__isnull=True).delete()  # nothing reached the customer: no cooldown
        return Response({'detail': 'We could not send the verification email. Please try again in a moment.'},
                        status=status.HTTP_502_BAD_GATEWAY)
    return Response({'email': user.email, 'resend_in': otp.COOLDOWN_SECONDS, 'expires_in': otp.TTL_SECONDS,
                     'detail': 'We sent a 6-digit code to your email.'},
                    status=status.HTTP_201_CREATED if first_time else status.HTTP_200_OK)


class RegisterView(APIView):
    """Step 1 of sign-up. Creates an inactive account and emails a code. No token is issued until the code is verified."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not emailing.available():
            return Response({'detail': 'Sign-up is temporarily unavailable because email delivery is not configured.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        with transaction.atomic():
            user = s.save()
        return send_code(user, first_time=True)


class VerifyEmailView(APIView):
    """Step 2: the 6-digit code. Success activates the account, signs the customer in and sends the Welcome email."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    MESSAGES = {
        'invalid': 'That code is not correct.',
        'expired': 'This code has expired. Request a new one.',
        'locked': 'Too many wrong attempts. Request a new code.',
    }

    def post(self, request):
        s = VerifyEmailSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = pending_user(s.validated_data['email'].lower().strip())
        if not user:  # unknown, already verified or never signed up: one answer for all, nothing to probe
            return Response({'detail': 'That code is not correct or has expired.', 'code': 'invalid'}, status=400)
        result = otp.check(user, s.validated_data['code'])
        if result != 'ok':
            return Response({'detail': self.MESSAGES[result], 'code': result}, status=400)
        with transaction.atomic():
            user.is_active = True
            user.save(update_fields=['is_active'])
            Profile.objects.filter(user=user).update(email_verified=True)
        emailing.send_welcome(user)  # deduplicated, so it goes out once per account
        return Response(auth_payload(user))


class ResendCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        s = ResendOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = pending_user(s.validated_data['email'].lower().strip())
        if user:
            ok, wait = otp.send_allowed(user)
            if not ok:
                return Response({'detail': 'Please wait a moment before requesting another code.', 'retry_after': wait},
                                status=status.HTTP_429_TOO_MANY_REQUESTS)
            resp = send_code(user)
            if resp.status_code >= 400:
                return resp
        # same answer whether or not the email is waiting for verification
        return Response({'detail': 'If that email is waiting for verification, a new code has been sent.',
                         'resend_in': otp.COOLDOWN_SECONDS, 'expires_in': otp.TTL_SECONDS})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email, password = s.validated_data['email'].lower(), s.validated_data['password']
        user = authenticate(username=email, password=password)
        if not user:
            # right password but the email was never verified: send them to the code page instead of "incorrect password"
            waiting = pending_user(email)
            if waiting and waiting.check_password(password):
                if otp.send_allowed(waiting)[0]:
                    send_code(waiting)
                return Response({'detail': 'Please verify your email to finish creating your account. We sent you a code.',
                                 'code': 'email_not_verified', 'email': waiting.email}, status=status.HTTP_403_FORBIDDEN)
            return Response({'detail': 'Incorrect email or password.'}, status=status.HTTP_400_BAD_REQUEST)
        Profile.objects.get_or_create(user=user)
        return Response(auth_payload(user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        Profile.objects.get_or_create(user=request.user)
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        s = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = ChangePasswordSerializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        if not request.user.check_password(s.validated_data['current_password']):
            return Response({'current_password': ['Current password is incorrect.']}, status=400)
        request.user.set_password(s.validated_data['new_password'])
        request.user.save()
        Token.objects.filter(user=request.user).delete()  # sign out everywhere
        emailing.send_password_changed(request.user)
        return Response(auth_payload(request.user))


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.check_password(request.data.get('password', '')):
            return Response({'password': ['Password is incorrect.']}, status=400)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        s = ForgotPasswordSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data['email'].strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        recent = EmailLog.objects.filter(kind='reset', to_email__iexact=email,
                                         created_at__gte=timezone.now() - timedelta(hours=1)).count()
        if user and recent < RESET_MAX_PER_HOUR:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)  # single use: it stops working once the password changes
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            emailing.send_reset(user, link, int(getattr(settings, 'PASSWORD_RESET_TIMEOUT', 3600)) // 60)
        # same answer either way, so nobody can probe which emails exist
        return Response({'detail': 'If an account exists for that email, a reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        s = ResetPasswordSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        bad = Response({'detail': 'This reset link is invalid or has expired.'}, status=400)
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(s.validated_data['uid'])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return bad
        if not user.is_active or not default_token_generator.check_token(user, s.validated_data['token']):
            return bad
        try:
            validate_password(s.validated_data['new_password'], user)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=400)
        user.set_password(s.validated_data['new_password'])
        user.save()
        Token.objects.filter(user=user).delete()
        emailing.send_password_changed(user)
        return Response({'detail': 'Password updated. You can sign in now.'})


# ---- Google / Facebook sign-in -----------------------------------------------------------------------------------

LINK_SALT, LINK_MAX_AGE = 'heem.social.link', 600


class SocialConfigView(APIView):
    """Public ids the browser needs to open the Google / Facebook window. Empty = not configured."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(social.config())


class SocialLoginView(APIView):
    """The browser sends the provider's access token. We ask the provider whether it is real, and for whom.
    An email that already belongs to a HEEM account is never linked silently: the customer must prove they own it."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request, provider):
        if provider not in social.PROVIDERS:
            return Response(status=404)
        token = str(request.data.get('access_token') or '').strip()
        if not token:
            return Response({'detail': 'Missing sign-in token.'}, status=400)
        try:
            info = social.verify(provider, token)
        except social.NotConfigured as e:
            return Response({'detail': str(e), 'code': 'not_configured'}, status=503)
        except social.SocialError as e:
            return Response({'detail': str(e)}, status=400)

        linked = SocialAccount.objects.select_related('user').filter(provider=provider, uid=info['uid']).first()
        if linked:
            if not linked.user.is_active:
                return Response({'detail': 'This account is not active.'}, status=403)
            return Response(auth_payload(linked.user))

        email = info['email']
        if not email:
            return Response({'detail': f'{provider.title()} did not share an email address. Allow email access, or sign up with your email.',
                             'code': 'no_email'}, status=400)

        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            waiting = pending_user(email)
            if waiting and provider == 'google' and info['verified']:
                # Google just proved this address is theirs; the half-finished sign-up never did
                with transaction.atomic():
                    waiting.set_unusable_password()
                    waiting.is_active = True
                    waiting.save()
                    Profile.objects.update_or_create(user=waiting, defaults={'email_verified': True})
                    SocialAccount.objects.create(user=waiting, provider=provider, uid=info['uid'], email=email)
                emailing.send_welcome(waiting)
                return Response(auth_payload(waiting))
            if not existing.is_active:
                code = 'email_pending' if waiting else 'inactive'
                msg = ('Finish verifying your email first, or sign in with Google.' if waiting
                       else 'This account is not active.')
                return Response({'detail': msg, 'code': code}, status=409 if waiting else 403)
            if not existing.has_usable_password():
                return Response({'detail': 'This email is already registered with another sign-in method. Please sign in with that one.',
                                 'code': 'use_other_method'}, status=409)
            link_token = signing.dumps({'p': provider, 'u': info['uid'], 'e': email}, salt=LINK_SALT)
            return Response({'detail': 'An HEEM account already exists for this email.', 'code': 'link_required',
                             'email': email, 'provider': provider, 'link_token': link_token}, status=409)

        with transaction.atomic():
            user = User.objects.create_user(username=email, email=email, password=None,  # no password: unusable until they set one
                                            first_name=(info['name'] or email.split('@')[0])[:150])
            Profile.objects.update_or_create(user=user, defaults={'email_verified': info['verified']})
            SocialAccount.objects.create(user=user, provider=provider, uid=info['uid'], email=email)
        emailing.send_welcome(user)
        return Response(auth_payload(user), status=status.HTTP_201_CREATED)


class SocialLinkView(APIView):
    """Second step when the email already exists: the customer types their HEEM password to prove it is their account."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        try:
            data = signing.loads(str(request.data.get('link_token') or ''), salt=LINK_SALT, max_age=LINK_MAX_AGE)
        except signing.BadSignature:
            return Response({'detail': 'This link request expired. Please try again.'}, status=400)
        user = User.objects.filter(email__iexact=data['e'], is_active=True).first()
        if not user or not user.has_usable_password() or not user.check_password(str(request.data.get('password') or '')):
            return Response({'detail': 'Incorrect password.'}, status=400)
        SocialAccount.objects.get_or_create(provider=data['p'], uid=data['u'], defaults={'user': user, 'email': data['e']})
        return Response(auth_payload(user))


class AddressViewSet(viewsets.ModelViewSet):
    """Every query is filtered by request.user, so nobody can see another customer's addresses."""
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        first = not self.get_queryset().exists()
        serializer.save(user=self.request.user, is_default=first or serializer.validated_data.get('is_default', False))

    def perform_destroy(self, instance):
        was_default = instance.is_default
        user = instance.user
        instance.delete()
        if was_default:
            nxt = Address.objects.filter(user=user).first()
            if nxt:
                nxt.is_default = True
                nxt.save()

    @action(detail=True, methods=['post'], url_path='default')
    def make_default(self, request, pk=None):
        a = self.get_object()
        a.is_default = True
        a.save()
        return Response(self.get_serializer(a).data)