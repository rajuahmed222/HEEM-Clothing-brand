from django.conf import settings
from django.db import models


class Profile(models.Model):
    GENDERS = [('female', 'Female'), ('male', 'Male'), ('other', 'Other'), ('na', 'Prefer not to say')]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDERS, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    # True for every account that existed before email verification was added. New sign-ups start False
    # and become True only after the 6-digit code is entered.
    email_verified = models.BooleanField(default=True)

    def __str__(self):
        return f'Profile of {self.user.email}'


class Address(models.Model):
    LABELS = [('home', 'Home'), ('office', 'Office'), ('other', 'Other')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=10, choices=LABELS, default='home')
    recipient_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    country = models.CharField(max_length=80, default='Bangladesh')
    division = models.CharField(max_length=80)           # Division / State
    district = models.CharField(max_length=80)           # District / City
    upazila = models.CharField(max_length=80, blank=True)  # Thana / Upazila
    area = models.CharField(max_length=120, blank=True)
    street = models.CharField(max_length=255)            # House / Road / Street
    landmark = models.CharField(max_length=160, blank=True)
    postal_code = models.CharField(max_length=12, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name_plural = 'addresses'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:  # only one default per user
            Address.objects.filter(user=self.user).exclude(pk=self.pk).update(is_default=False)

    def __str__(self):
        return f'{self.label} - {self.recipient_name}'


class EmailOTP(models.Model):
    """One 6-digit sign-up code. Only a keyed hash is stored, never the code itself."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='email_otps')
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f'OTP for {self.user.email} ({self.created_at:%Y-%m-%d %H:%M})'


class EmailLog(models.Model):
    """Every email HEEM tries to send, with the outcome. Admin can see failures and retry them."""
    QUEUED, SENT, FAILED = 'queued', 'sent', 'failed'
    STATUSES = [(QUEUED, 'Queued'), (SENT, 'Sent'), (FAILED, 'Failed')]

    kind = models.CharField(max_length=40, db_index=True)            # otp, welcome, reset, password_changed, order_*...
    to_email = models.EmailField()
    subject = models.CharField(max_length=200, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='email_logs')
    reference = models.CharField(max_length=60, blank=True, db_index=True)   # e.g. an order number
    dedupe_key = models.CharField(max_length=120, blank=True, db_index=True)  # one email per event
    status = models.CharField(max_length=10, choices=STATUSES, default=QUEUED, db_index=True)
    provider_id = models.CharField(max_length=120, blank=True)       # Brevo messageId
    error = models.TextField(blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    # Secret emails (OTP, reset links) are not retryable and keep no payload: the person simply asks again.
    retryable = models.BooleanField(default=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.kind} to {self.to_email} [{self.status}]'


class SocialAccount(models.Model):
    """A Google or Facebook identity linked to one HEEM account. (provider, uid) is unique, so one Google
    account can never belong to two customers."""
    GOOGLE, FACEBOOK = 'google', 'facebook'
    PROVIDERS = [(GOOGLE, 'Google'), (FACEBOOK, 'Facebook')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='social_accounts')
    provider = models.CharField(max_length=20, choices=PROVIDERS)
    uid = models.CharField(max_length=191)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['provider', 'uid'], name='uniq_social_identity')]

    def __str__(self):
        return f'{self.provider}:{self.user.email}'