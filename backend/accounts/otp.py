"""Sign-up code rules. Codes are hashed with a key derived from SECRET_KEY; a database leak alone reveals nothing."""
import hmac
import secrets
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.crypto import salted_hmac

from .models import EmailOTP

TTL_SECONDS = 300          # a code works for 5 minutes
MAX_ATTEMPTS = 5           # wrong guesses allowed per code
COOLDOWN_SECONDS = 60      # wait between two sends
MAX_SENDS_PER_HOUR = 5


def _hash(user_id, code):
    return salted_hmac('heem.signup.otp', f'{user_id}:{code}', algorithm='sha256').hexdigest()


def send_allowed(user):
    """(ok, wait_seconds). Cooldown between sends plus an hourly cap."""
    now = timezone.now()
    last = EmailOTP.objects.filter(user=user).first()
    if last:
        wait = COOLDOWN_SECONDS - int((now - last.created_at).total_seconds())
        if wait > 0:
            return False, wait
    if EmailOTP.objects.filter(user=user, created_at__gte=now - timedelta(hours=1)).count() >= MAX_SENDS_PER_HOUR:
        return False, 3600
    return True, 0


def issue(user):
    """Create a fresh code (older unused ones stop working) and return it in plain form, once, for the email."""
    code = f'{secrets.randbelow(10 ** 6):06d}'
    now = timezone.now()
    with transaction.atomic():
        EmailOTP.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        EmailOTP.objects.create(user=user, code_hash=_hash(user.pk, code), expires_at=now + timedelta(seconds=TTL_SECONDS))
    return code


def check(user, code):
    """'ok' | 'invalid' | 'expired' | 'locked'. A correct code is used up immediately."""
    code = ''.join(ch for ch in str(code or '') if ch.isdigit())
    with transaction.atomic():
        otp = EmailOTP.objects.select_for_update().filter(user=user, used_at__isnull=True).first()
        if otp is None:
            return 'expired'
        if otp.expires_at <= timezone.now():
            return 'expired'
        if otp.attempts >= MAX_ATTEMPTS:
            return 'locked'
        if len(code) == 6 and hmac.compare_digest(otp.code_hash, _hash(user.pk, code)):
            otp.used_at = timezone.now()
            otp.save(update_fields=['used_at'])
            return 'ok'
        EmailOTP.objects.filter(pk=otp.pk).update(attempts=F('attempts') + 1)
        return 'locked' if otp.attempts + 1 >= MAX_ATTEMPTS else 'invalid'