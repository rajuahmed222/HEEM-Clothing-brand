"""PDF invoices (xhtml2pdf). Pure helpers: nothing here changes an order.

    eligible(order)            can this order have an invoice yet?
    get_invoice(order)         the Invoice row (created on first use)
    render_pdf(order)          bytes of the PDF
    attachment_for(order)      the Brevo attachment dict for the "Delivered" email, or None if it cannot be made
    make_link / read_link      short-lived signed download links (so the browser never needs an auth header)

Money is written "BDT 1,200" in the PDF because the standard PDF fonts have no taka sign.
Bengali text in an address or name needs a font file: set INVOICE_FONT_PATH in settings to a .ttf (e.g. Noto Sans Bengali)."""
import base64
import io
from decimal import Decimal
from html import escape as e

from django.conf import settings
from django.core import signing
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Invoice

LINK_SALT = 'heem-invoice'
LINK_MAX_AGE = 600  # seconds
NOT_YET = {'placed', 'cancelled'}


class InvoiceUnavailable(Exception):
    pass


def eligible(order):
    """An invoice exists once the shop has confirmed the order, and never for a cancelled one."""
    return order.status not in NOT_YET


def get_invoice(order):
    try:
        return order.invoice
    except Invoice.DoesNotExist:
        pass
    try:
        with transaction.atomic():
            return Invoice.objects.create(order=order)
    except IntegrityError:  # two requests at once: the other one won
        return Invoice.objects.get(order=order)


def bdt(n):
    n = Decimal(str(n))
    return f'BDT {n:,.0f}' if n == n.to_integral_value() else f'BDT {n:,.2f}'


_font = {'name': None}


def _font_family():
    path = getattr(settings, 'INVOICE_FONT_PATH', '')
    if not path:
        return 'Helvetica'
    if _font['name'] is None:
        try:
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            pdfmetrics.registerFont(TTFont('HeemInvoice', path))
            _font['name'] = 'HeemInvoice'
        except Exception:  # noqa: BLE001 - a bad font path must not stop invoices
            _font['name'] = 'Helvetica'
    return _font['name']


def build_html(order, invoice):
    pay_label = order.get_payment_status_display()
    rows = ''.join(
        f'<tr><td class="c">{e(i.product_name)}<br/><span class="m">{e(" / ".join(x for x in (i.size, i.color) if x))}</span></td>'
        f'<td class="r">{i.quantity}</td><td class="r">{bdt(i.unit_price)}</td><td class="r">{bdt(i.line_total)}</td></tr>'
        for i in order.items.all())
    discount = f'<tr><td class="m">Discount</td><td class="r">-{bdt(order.discount)}</td></tr>' if order.discount else ''
    paid_on = f'<br/>Paid on {timezone.localtime(order.paid_at):%d %b %Y}' if order.paid_at else ''
    return f'''<html><head><meta charset="utf-8"/><style>
@page {{ size: A4; margin: 1.6cm; }}
body {{ font-family: {_font_family()}; font-size: 10pt; color: #1a1716; }}
h1 {{ font-size: 26pt; letter-spacing: 6px; color: #B08D57; margin: 0; }}
h2 {{ font-size: 15pt; margin: 0; }}
td {{ vertical-align: top; }}
.m {{ color: #6b6761; font-size: 8.5pt; }}
.r {{ text-align: right; }}
.head td {{ border-bottom: 1px solid #1a1716; padding: 6px 4px; font-size: 8.5pt; text-transform: uppercase; color: #6b6761; }}
.c {{ padding: 8px 4px; border-bottom: 1px solid #e6dfd2; }}
.items td.r {{ padding: 8px 4px; border-bottom: 1px solid #e6dfd2; }}
.total td {{ font-size: 13pt; border-top: 1px solid #1a1716; padding-top: 6px; }}
</style></head><body>
<table width="100%"><tr>
<td><h1>HEEM</h1><span class="m">Wear your identity<br/>Dhaka, Bangladesh</span></td>
<td class="r"><h2>INVOICE</h2><span class="m">No. {e(invoice.number)}<br/>Date {timezone.localtime(invoice.issued_at):%d %b %Y}<br/>Order {e(order.number)}</span></td>
</tr></table>
<br/><br/>
<table width="100%"><tr>
<td width="50%"><span class="m">BILLED TO</span><br/>{e(order.buyer_name or order.recipient_name)}<br/>{e(order.customer_email)}<br/>{e(order.buyer_phone or order.phone)}</td>
<td width="50%"><span class="m">DELIVERED TO</span><br/>{e(order.recipient_name)}<br/>{e(order.address_summary)}<br/>{e(order.phone)}</td>
</tr></table>
<br/><br/>
<table width="100%" class="items" cellpadding="0" cellspacing="0">
<tr class="head"><td>Item</td><td class="r">Qty</td><td class="r">Price</td><td class="r">Total</td></tr>
{rows}
</table>
<br/>
<table width="45%" align="right" cellpadding="3" cellspacing="0">
<tr><td class="m">Subtotal</td><td class="r">{bdt(order.subtotal)}</td></tr>
<tr><td class="m">Delivery</td><td class="r">{bdt(order.delivery_charge) if order.delivery_charge else 'Free'}</td></tr>
{discount}
<tr class="total"><td>Total</td><td class="r">{bdt(order.total)}</td></tr>
</table>
<br/><br/><br/><br/>
<p><span class="m">PAYMENT</span><br/>{e(order.get_payment_method_display())} &#8212; {e(pay_label)}{paid_on}</p>
<p class="m">Thank you for choosing HEEM. This invoice was generated automatically and needs no signature.</p>
</body></html>'''


def render_pdf(order):
    try:
        from xhtml2pdf import pisa
    except ImportError as ex:
        raise InvoiceUnavailable('xhtml2pdf is not installed. Run: pip install xhtml2pdf') from ex
    order = type(order).objects.prefetch_related('items').select_related('user').get(pk=order.pk)
    html = build_html(order, get_invoice(order))
    out = io.BytesIO()
    result = pisa.CreatePDF(src=html, dest=out, encoding='utf-8')
    if result.err:
        raise InvoiceUnavailable('The invoice could not be drawn.')
    return out.getvalue()


def attachment_for(order):
    """For the Delivered email. Returns None (and the email still goes out) if the PDF cannot be made."""
    try:
        if not eligible(order):
            return None
        pdf = render_pdf(order)
        return [{'name': f'{get_invoice(order).number}.pdf', 'content': base64.b64encode(pdf).decode()}]
    except Exception:  # noqa: BLE001
        return None


def make_link(order):
    return signing.dumps({'o': order.pk}, salt=LINK_SALT)


def read_link(token):
    """Returns the order pk, or None for a bad or expired link."""
    try:
        return signing.loads(token, salt=LINK_SALT, max_age=LINK_MAX_AGE)['o']
    except (signing.BadSignature, KeyError, TypeError):
        return None