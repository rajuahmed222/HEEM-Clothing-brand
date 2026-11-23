import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address, Profile

User = get_user_model()
PHONE_RE = re.compile(r'^(?:\+?88)?01[3-9]\d{8}$|^\+?\d{7,15}$')  # BD mobile or generic intl


def check_phone(value):
    value = (value or '').replace(' ', '').replace('-', '')
    if value and not PHONE_RE.match(value):
        raise serializers.ValidationError('Enter a valid phone number.')
    return value


def pending_user(email):
    """An account that signed up but never entered its code (inactive and not verified), or None."""
    u = User.objects.filter(email__iexact=email, is_active=False).first()
    if u and Profile.objects.filter(user=u, email_verified=False).exists():
        return u
    return None


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128)
    confirm_password = serializers.CharField(write_only=True, max_length=128)

    def validate_full_name(self, value):
        value = ' '.join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError('Enter your full name.')
        return value

    def validate_email(self, value):
        value = value.lower().strip()
        existing = User.objects.filter(email__iexact=value).first()
        if existing and not pending_user(value):
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'The two passwords do not match.'})
        probe = User(username=data['email'], email=data['email'], first_name=data['full_name'])
        try:
            validate_password(data['password'], probe)
        except Exception as e:  # DjangoValidationError
            raise serializers.ValidationError({'password': list(getattr(e, 'messages', [str(e)]))})
        return data

    def create(self, data):
        """New accounts start inactive. Someone who retries sign-up before verifying just refreshes their pending account."""
        user = pending_user(data['email'])
        if user:
            user.first_name = data['full_name']
            user.set_password(data['password'])
            user.save()
        else:
            user = User.objects.create_user(username=data['email'], email=data['email'], password=data['password'],
                                            first_name=data['full_name'], is_active=False)
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.email_verified = False
        profile.save(update_fields=['email_verified'])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=12)


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UserSerializer(serializers.ModelSerializer):
    """Account + profile in one object, so the frontend needs a single call."""
    full_name = serializers.CharField(source='first_name', max_length=150)
    phone = serializers.CharField(source='profile.phone', required=False, allow_blank=True)
    date_of_birth = serializers.DateField(source='profile.date_of_birth', required=False, allow_null=True)
    gender = serializers.ChoiceField(source='profile.gender', choices=Profile.GENDERS, required=False, allow_blank=True)
    avatar = serializers.ImageField(source='profile.avatar', required=False, allow_null=True)
    profile_completion = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'avatar', 'profile_completion']
        read_only_fields = ['id', 'email']  # email change needs verification, not supported yet

    def validate_phone(self, value):
        return check_phone(value)

    def get_profile_completion(self, user):
        p = getattr(user, 'profile', None)
        checks = [bool(user.first_name), bool(user.email), bool(p and p.phone),
                  bool(p and p.date_of_birth), bool(p and p.gender), bool(p and p.avatar),
                  user.addresses.exists()]
        return round(100 * sum(checks) / len(checks))

    def update(self, user, data):
        pdata = data.pop('profile', {})
        for k, v in data.items():
            setattr(user, k, v)
        user.save()
        profile, _ = Profile.objects.get_or_create(user=user)
        for k, v in pdata.items():
            setattr(profile, k, v)
        profile.save()
        return user


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        exclude = ['user']
        read_only_fields = ['id', 'created_at']

    def validate_phone(self, value):
        value = check_phone(value)
        if not value:
            raise serializers.ValidationError('Phone number is required.')
        return value

    def validate(self, data):
        if (data.get('country', 'Bangladesh') == 'Bangladesh') and data.get('postal_code') \
                and not re.fullmatch(r'\d{4}', data['postal_code']):
            raise serializers.ValidationError({'postal_code': 'Bangladesh postal codes have 4 digits.'})
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)