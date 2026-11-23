"""Customer emails about orders. Sent in a background thread after the order is saved, so a slow mail
service never makes the customer wait at checkout. The result is always written to the email log."""
import threading
from decimal import Decimal

from django.conf import settings
from django.db import close_old_connections, transaction

from accounts import emailing

from .models import Order


def money(n):
    n = Decimal(str(n))
    return f'৳{n:,.0f}' if n == n.to_integral_value() else f'৳{n:,.2f}'


def track_url(order):
    base = settings.FRONTEND_URL
    return f'{base}/track/{order.track_token}' if not order.user_id and order.track_token else f'{base}/account/orders/{order.number}'


def order_context(order):
    return {
        'name': order.recipient_name or order.buyer_name or 'there',
        'number': order.number,
        'items': [{'name': i.product_name, 'size': i.size, 'color': i.color, 'qty': i.quantity,
                   'price': money(i.unit_price), 'total': money(i.line_total)} for i in order.items.all()],
        'subtotal': money(order.subtotal),
        'delivery': money(order.delivery_charge),
        'discount': money(order.discount) if order.discount else '',
        'total': money(order.total),
        'payment_method': order.get_payment_method_display(),
        'payment_status': order.get_payment_status_display(),
        'is_mobile_payment': order.payment_method != 'cod',
        'address': order.address_summary,
        'phone': order.phone,
        'is_guest': not order.user_id,
        'track_url': track_url(order),
    }


def send_order_received(order_id):
    order = Order.objects.select_related('user').prefetch_related('items').get(pk=order_id)
    email = order.customer_email
    if not email:
        return None
    return emailing.send('order_received', email, order_context(order), user=order.user, to_name=order.recipient_name,
                         reference=order.number, dedupe_key=f'order_received:{order.number}')


def _background(fn):
    """Runs fn(order_pk-free closure) in a thread once the surrounding transaction commits."""
    def run():
        close_old_connections()
        try:
            fn()
        except Exception:  # noqa: BLE001 - an email problem must never surface to the customer
            pass
        finally:
            close_old_connections()

    transaction.on_commit(lambda: threading.Thread(target=run, daemon=True).start())


def order_received_after_commit(order):
    """Call inside the order transaction. The email goes out only if the order was really saved."""
    pk = order.pk
    _background(lambda: send_order_received(pk))


# ---- status and payment emails: triggered from Order.set_status / Order.mark_payment -------------------------------
STATUS_KIND = {
    'confirmed': 'order_confirmed', 'processing': 'order_processing', 'shipped': 'order_shipped',
    'out_for_delivery': 'order_out_for_delivery', 'delivered': 'order_delivered', 'cancelled': 'order_cancelled',
}
PAYMENT_KIND = {'paid': 'payment_confirmed', 'failed': 'payment_failed', 'refunded': 'order_refunded'}


def send_update(order_id, kind, dedupe_key, reason=''):
    order = Order.objects.select_related('user').prefetch_related('items').get(pk=order_id)
    email = order.customer_email
    if not email:
        return None
    ctx = order_context(order)
    ctx.update({'courier': order.courier, 'tracking_code': order.tracking_code, 'reason': reason,
                'refund_due': order.payment_status in ('refund_pending', 'refunded')})
    attachments = None
    if kind == 'order_delivered':
        from . import invoices
        attachments = invoices.attachment_for(order)
        ctx['has_invoice'] = bool(attachments)
    return emailing.send(kind, email, ctx, user=order.user, to_name=order.recipient_name, reference=order.number,
                         dedupe_key=dedupe_key, attachments=attachments)


def status_changed_after_commit(order, status, note=''):
    kind = STATUS_KIND.get(status)
    if not kind:
        return
    pk, number = order.pk, order.number
    reason = note if status == 'cancelled' else ''
    _background(lambda: send_update(pk, kind, f'{kind}:{number}', reason))


def payment_changed_after_commit(order, status, note='', event_id=0):
    kind = PAYMENT_KIND.get(status)
    if not kind:
        return
    pk, number = order.pk, order.number
    # a payment can fail more than once (customer retries), so a failure is keyed by its own history row
    key = f'{kind}:{number}:{event_id}' if status == 'failed' else f'{kind}:{number}'
    reason = note if status == 'failed' else ''
    _background(lambda: send_update(pk, kind, key, reason))