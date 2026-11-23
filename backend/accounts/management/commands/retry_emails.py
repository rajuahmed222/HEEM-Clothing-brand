from django.core.management.base import BaseCommand

from accounts import emailing
from accounts.models import EmailLog


class Command(BaseCommand):
    help = 'Send failed emails again (run it from a scheduler every few minutes, or by hand after a Brevo outage).'

    def add_arguments(self, parser):
        parser.add_argument('--max-attempts', type=int, default=5)

    def handle(self, *args, **opts):
        qs = EmailLog.objects.filter(status=EmailLog.FAILED, retryable=True, attempts__lt=opts['max_attempts'])
        ok = bad = 0
        for log in qs:
            emailing.retry(log)
            ok, bad = (ok + 1, bad) if log.status == EmailLog.SENT else (ok, bad + 1)
        self.stdout.write(f'{ok} sent, {bad} still failing')