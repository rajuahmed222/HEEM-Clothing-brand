"""Numbers shown at the top of the Django admin home page. Read-only: nothing here changes any data."""
from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone

from shop.models import Product, ProductVariant
from shopping.models import Order, PaymentSubmission
from .models import ContactMessage, ReturnRequest

LOW_STOCK = 3


def dashboard_context():
    now = timezone.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_ago = now - timedelta(days=30)
    live = Order.objects.exclude(status__in=Order.TERMINAL)

    def total(qs, field='total'):
        return qs.aggregate(t=Sum(field))['t'] or 0

    active_variants = ProductVariant.objects.filter(product__is_active=True)
    cards = [
        # label, value, admin link, needs attention?
        ('Orders today', Order.objects.filter(created_at__gte=today).count(), '/admin/shopping/order/', False),
        ('New orders to confirm', live.filter(status__in=['placed', 'confirmed']).count(),
         '/admin/shopping/order/?status__exact=placed', True),
        ('Payments to verify', PaymentSubmission.objects.filter(status='submitted').count(),
         '/admin/shopping/paymentsubmission/?status__exact=submitted', True),
        ('COD cash not yet recorded', Order.objects.filter(
            payment_method='cod', payment_status='cod_pending', status='delivered').count(),
         '/admin/shopping/order/?payment_status__exact=cod_pending&status__exact=delivered', True),
        ('Refunds to pay', Order.objects.filter(payment_status='refund_pending').count(),
         '/admin/shopping/order/?payment_status__exact=refund_pending', True),
        ('Open return requests', ReturnRequest.objects.filter(status__in=['submitted', 'reviewing']).count(),
         '/admin/support/returnrequest/?status__exact=submitted', True),
        ('Unanswered messages', ContactMessage.objects.filter(status='new').count(),
         '/admin/support/contactmessage/?status__exact=new', True),
        ('Low stock (variants)', active_variants.filter(stock__gt=0, stock__lte=LOW_STOCK).count(),
         '/admin/shop/product/', True),
        ('Sold out (variants)', active_variants.filter(stock=0).count(), '/admin/shop/product/', False),
    ]
    paid_30 = Order.objects.filter(payment_status='paid', paid_at__gte=month_ago)
    money = [
        ('Paid, last 30 days', total(paid_30), paid_30.count()),
        ('Paid today', total(Order.objects.filter(payment_status='paid', paid_at__gte=today)),
         Order.objects.filter(payment_status='paid', paid_at__gte=today).count()),
    ]
    by_status = (Order.objects.values('status').annotate(n=Count('id')).order_by('-n'))
    labels = dict(Order.STATUSES)
    status_rows = [(labels.get(r['status'], r['status']), r['n']) for r in by_status]
    return {
        'heem_cards': [c for c in cards if c[1] or not c[3]],
        'heem_money': money,
        'heem_status_rows': status_rows,
        'heem_products': Product.objects.filter(is_active=True).count(),
    }