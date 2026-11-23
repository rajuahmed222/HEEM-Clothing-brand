"""Sends email through the Brevo Transactional Email API (server side only: the key never reaches React).
Every attempt is written to EmailLog. send() never raises, so a Brevo outage cannot break sign-up or checkout."""
import json
import re
import urllib.error
import urllib.request

from django.conf import settings
from django.utils import timezone

from . import email_templates
from .models import EmailLog

BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
TIMEOUT = 12


class NotConfigured(Exception):
    pass


def configured():
    return bool(getattr(settings, 'BREVO_API_KEY', '') and getattr(settings, 'BREVO_SENDER_EMAIL', ''))


def dev_console():
    return bool(getattr(settings, 'EMAIL_DEV_CONSOLE', False) and settings.DEBUG)


def available():
    """False when no email can go out at all (no Brevo key and no developer console mode)."""
    return configured() or dev_console()


def _post(to_email, to_name, rendered, attachments=None):
    """Returns Brevo's messageId. Raises on any failure."""
    if not configured():
        raise NotConfigured('BREVO_API_KEY and BREVO_SENDER_EMAIL are not set.')
    body = {
        'sender': {'name': settings.BREVO_SENDER_NAME, 'email': settings.BREVO_SENDER_EMAIL},
        'to': [{'email': to_email, 'name': to_name or to_email}],
        'subject': rendered['subject'],
        'htmlContent': rendered['html'],
        'textContent': rendered['text'],
    }
    if attachments:  # [{'name': 'invoice.pdf', 'content': <base64 str>}]
        body['attachment'] = attachments
    req = urllib.request.Request(BREVO_URL, data=json.dumps(body).encode(), method='POST', headers={
        'api-key': settings.BREVO_API_KEY, 'accept': 'application/json', 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return (json.loads(r.read() or b'{}')).get('messageId', '')
    except urllib.error.HTTPError as ex:
        detail = ex.read().decode('utf-8', 'replace')[:400]
        raise RuntimeError(f'Brevo {ex.code}: {detail}') from None
    except (urllib.error.URLError, TimeoutError, OSError) as ex:
        raise RuntimeError(f'Could not reach Brevo: {ex}') from None


def deliver(log, rendered, to_name='', attachments=None):
    """One attempt for an existing log row. Updates the row and returns it."""
    log.attempts += 1
    log.last_attempt_at = timezone.now()
    # secret emails (OTP, reset): the subject may contain the code, so the log keeps it masked
    log.subject = (rendered['subject'] if log.retryable else re.sub(r'\b\d{6}\b', '******', rendered['subject']))[:200]
    try:
        if not configured() and dev_console():
            # opt-in developer mode (EMAIL_DEV_CONSOLE=1): prints instead of sending, and the log says so
            print(f"\n----- EMAIL (console, not sent) to {log.to_email} -----\n{rendered['subject']}\n{rendered['text']}-----\n")
            log.provider_id = 'console'
        else:
            log.provider_id = _post(log.to_email, to_name, rendered, attachments)
        log.status, log.sent_at, log.error = EmailLog.SENT, timezone.now(), ''
    except Exception as ex:  # noqa: BLE001 - any failure is logged, never raised
        log.status, log.error = EmailLog.FAILED, str(ex)[:1000]
    log.save()
    return log


def send(kind, to_email, ctx, *, user=None, to_name='', retryable=True, reference='', dedupe_key='', attachments=None):
    """Render, log and send one email. A second call with the same dedupe_key does nothing (one email per event)."""
    if dedupe_key:
        done = EmailLog.objects.filter(dedupe_key=dedupe_key, status__in=[EmailLog.SENT, EmailLog.QUEUED]).first()
        if done:
            return done
    log = EmailLog.objects.create(kind=kind, to_email=to_email, user=user, reference=reference, dedupe_key=dedupe_key,
                                  retryable=retryable, payload=ctx if retryable else {})
    return deliver(log, email_templates.render(kind, ctx), to_name, attachments)


def retry(log):
    """Send a failed email again from its saved payload. Secret emails (OTP, reset link) cannot be retried."""
    if log.status == EmailLog.SENT:
        return log
    if not log.retryable:
        log.error = 'This email contains a one-time secret and cannot be re-sent. The customer must ask for a new one.'
        log.save(update_fields=['error'])
        return log
    attachments = None
    if log.kind == 'order_delivered' and log.reference:  # the invoice PDF is drawn again; it is never stored in the log
        try:
            from shopping.invoices import attachment_for
            from shopping.models import Order
            attachments = attachment_for(Order.objects.get(number=log.reference))
        except Exception:  # noqa: BLE001
            attachments = None
    return deliver(log, email_templates.render(log.kind, log.payload), attachments=attachments)


# ---- the four account emails -------------------------------------------------------------------------------------

def _name(user):
    return (user.first_name or user.email.split('@')[0]).strip()


def send_otp(user, code, minutes):
    return send('otp', user.email, {'name': _name(user), 'code': code, 'minutes': minutes}, user=user, to_name=_name(user), retryable=False)


def send_welcome(user):
    return send('welcome', user.email, {'name': _name(user), 'shop_url': f'{settings.FRONTEND_URL}/new'}, user=user,
                to_name=_name(user), dedupe_key=f'welcome:{user.pk}')


def send_reset(user, link, minutes):
    return send('reset', user.email, {'name': _name(user), 'link': link, 'minutes': minutes}, user=user, to_name=_name(user), retryable=False)


def send_password_changed(user):
    when = timezone.now().strftime('%d %b %Y, %H:%M UTC')
    return send('password_changed', user.email,
                {'name': _name(user), 'when': when, 'contact_url': f'{settings.FRONTEND_URL}/contact', 'reset_url': f'{settings.FRONTEND_URL}/forgot-password'},
                user=user, to_name=_name(user))