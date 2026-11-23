"""Store business rules in one place. Change the numbers in settings.py, not here."""
import re
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

CANCELLABLE = ('placed', 'confirmed')  # before it starts processing


def can_cancel(order):
    return order.status in CANCELLABLE


def can_return(order):
    if order.status != 'delivered':
        return False
    days = getattr(settings, 'RETURN_WINDOW_DAYS', 7)
    delivered = order.events.filter(status='delivered').order_by('-created_at').first()
    since = delivered.created_at if delivered else order.updated_at
    return timezone.now() <= since + timedelta(days=days)


def delivery_charge(subtotal, district):
    free_over = Decimal(str(getattr(settings, 'FREE_DELIVERY_OVER', 10000)))
    if subtotal >= free_over:
        return Decimal('0')
    inside = Decimal(str(getattr(settings, 'DELIVERY_CHARGE_DHAKA', 80)))
    outside = Decimal(str(getattr(settings, 'DELIVERY_CHARGE_OUTSIDE', 130)))
    return inside if (district or '').strip().lower() == 'dhaka' else outside


def store_policy():
    """Public store rules, so the pages never hardcode them."""
    return {
        'delivery_dhaka': getattr(settings, 'DELIVERY_CHARGE_DHAKA', 80),
        'delivery_outside': getattr(settings, 'DELIVERY_CHARGE_OUTSIDE', 130),
        'free_over': getattr(settings, 'FREE_DELIVERY_OVER', 10000),
        'return_days': getattr(settings, 'RETURN_WINDOW_DAYS', 7),
        'max_per_item': getattr(settings, 'MAX_QTY_PER_ITEM', 10),
    }


# ---- Payment methods ----
# Mobile wallets are manual: the customer sends money to OUR number, then submits the TrxID for staff to verify.
MOBILE_METHODS = {'bkash': 'bKash', 'nagad': 'Nagad', 'rocket': 'Rocket'}
_NUMBER_RE = re.compile(r'^\+?\d{10,15}$')


def _configured_number(code):
    raw = str(getattr(settings, f'HEEM_{code.upper()}_NUMBER', '') or '')
    number = raw.replace(' ', '').replace('-', '')
    return number if _NUMBER_RE.match(number) else ''


def payment_options():
    """Only methods that are really usable. A wallet without a valid configured number is left out entirely."""
    options = []
    for code, label in MOBILE_METHODS.items():
        number = _configured_number(code)
        if number:
            options.append({'code': code, 'label': label, 'kind': 'mobile', 'available': True, 'number': number})
    options.append({'code': 'cod', 'label': 'Cash on Delivery', 'kind': 'cod', 'available': True})
    return options