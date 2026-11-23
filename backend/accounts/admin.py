from django.contrib import admin, messages

from . import emailing
from .models import Address, EmailLog, EmailOTP, Profile, SocialAccount


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'email', 'email_verified', 'phone')
    list_filter = ('email_verified',)
    search_fields = ('user__email', 'user__first_name', 'phone')

    @admin.display(description='Email')
    def email(self, obj):
        return obj.user.email


admin.site.register(Address)


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'email', 'created_at')
    list_filter = ('provider',)
    search_fields = ('user__email', 'email')


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    """Read-only. Codes are stored hashed, so nobody can read one from here."""
    list_display = ('user', 'created_at', 'expires_at', 'attempts', 'used_at')
    readonly_fields = [f.name for f in EmailOTP._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'kind', 'to_email', 'status', 'attempts', 'reference')
    list_filter = ('status', 'kind')
    search_fields = ('to_email', 'reference', 'subject')
    readonly_fields = [f.name for f in EmailLog._meta.fields]
    actions = ['retry_selected']

    def has_add_permission(self, request):
        return False

    @admin.action(description='Retry selected failed emails')
    def retry_selected(self, request, queryset):
        sent = failed = 0
        for log in queryset.filter(status=EmailLog.FAILED):
            emailing.retry(log)
            sent, failed = (sent + 1, failed) if log.status == EmailLog.SENT else (sent, failed + 1)
        self.message_user(request, f'Retried: {sent} sent, {failed} still failing.', messages.INFO if not failed else messages.WARNING)