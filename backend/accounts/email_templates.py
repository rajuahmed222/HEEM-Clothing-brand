"""HEEM email designs. Pure functions: render(kind, ctx) -> {'subject', 'html', 'text'}.
Table layout and inline styles only, so Gmail, Outlook and phone mail apps all draw the same page.
Add a new email by writing one function and registering it in TEMPLATES (order emails reuse `layout`)."""
from html import escape as e

BLACK, GOLD, PAPER, GREY = '#080808', '#B08D57', '#F7F4EF', '#6b6761'
SERIF = "Georgia,'Times New Roman',serif"
SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif"


def button(label, url):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr>'
            f'<td bgcolor="{BLACK}" style="border-radius:0"><a href="{e(url, quote=True)}" target="_blank" '
            f'style="display:inline-block;padding:15px 34px;font:600 12px {SANS};letter-spacing:.22em;text-transform:uppercase;'
            f'color:#ffffff;text-decoration:none;border:1px solid {BLACK}">{e(label)}</a></td></tr></table>')


def layout(title, body, preheader=''):
    """Shared frame: black masthead with the HEEM wordmark, white card, quiet footer."""
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>{e(title)}</title></head>
<body style="margin:0;padding:0;background:{PAPER};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{PAPER}">{e(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td align="center" bgcolor="{BLACK}" style="padding:34px 20px"><span style="font:400 34px {SERIF};letter-spacing:.42em;color:{GOLD};padding-left:.42em">HEEM</span></td></tr>
<tr><td bgcolor="#ffffff" style="padding:44px 36px;font:400 16px/1.7 {SANS};color:#1a1716">{body}</td></tr>
<tr><td align="center" style="padding:26px 20px;font:400 12px/1.7 {SANS};color:{GREY}">
HEEM · Wear your identity<br>Dhaka, Bangladesh<br><span style="color:#9a958e">You are receiving this because of activity on your HEEM account or order.</span></td></tr>
</table></td></tr></table></body></html>'''


def h(text):
    return f'<h1 style="margin:0 0 18px;font:400 30px/1.2 {SERIF};color:{BLACK}">{e(text)}</h1>'


def p(text, muted=False):
    return f'<p style="margin:0 0 16px;color:{GREY if muted else "#1a1716"}">{text}</p>'


def otp(c):
    code = ' '.join(c['code'])
    body = (h('Verify your email') + p(f"Hello {e(c['name'])},") +
            p('Use this code to finish creating your HEEM account.') +
            f'<div style="margin:26px 0;padding:22px;background:{PAPER};border:1px solid #e6dfd2;text-align:center;font:600 34px {SERIF};letter-spacing:.3em;color:{BLACK}">{e(code)}</div>' +
            p(f"This code expires in <strong>{int(c['minutes'])} minutes</strong>. HEEM will never ask you for it by phone or chat.") +
            p('If you did not create an account, you can safely ignore this email.', True))
    return dict(subject=f"{c['code']} is your HEEM verification code", html=layout('Verify your email', body, f"Your code is {c['code']}"),
                text=f"Hello {c['name']},\n\nYour HEEM verification code is {c['code']}.\nIt expires in {int(c['minutes'])} minutes.\n\nIf you did not create an account, ignore this email.\n")


def welcome(c):
    body = (h('Welcome to HEEM') + p(f"Hello {e(c['name'])},") +
            p('Your account is ready. We design pieces to be worn for years, in fabrics you can feel and cuts that stay quiet.') +
            p('Save your addresses, follow your orders and keep a wishlist, all in one place.') +
            button('Explore the collection', c['shop_url']) +
            p('Wear your identity.', True))
    return dict(subject='Welcome to HEEM', html=layout('Welcome to HEEM', body, 'Your HEEM account is ready.'),
                text=f"Welcome to HEEM, {c['name']}.\n\nYour account is ready. Start here: {c['shop_url']}\n\nWear your identity.\n")


def reset(c):
    body = (h('Reset your password') + p(f"Hello {e(c['name'])},") +
            p('We received a request to choose a new password for your HEEM account.') +
            button('Choose a new password', c['link']) +
            p(f"This link works once and expires in <strong>{int(c['minutes'])} minutes</strong>.") +
            p(f'If the button does not work, copy this address into your browser:<br><span style="word-break:break-all;color:{GREY};font-size:13px">{e(c["link"])}</span>', True) +
            p('If you did not ask for this, ignore this email. Your password stays the same.', True))
    return dict(subject='Reset your HEEM password', html=layout('Reset your password', body, 'Choose a new password for your HEEM account.'),
                text=f"Hello {c['name']},\n\nChoose a new password (works once, expires in {int(c['minutes'])} minutes):\n{c['link']}\n\nIf you did not ask for this, ignore this email.\n")


def password_changed(c):
    body = (h('Your password was changed') + p(f"Hello {e(c['name'])},") +
            p(f"The password for your HEEM account was changed on <strong>{e(c['when'])}</strong>.") +
            p('If this was you, there is nothing more to do.') +
            p(f"If it was not you, reset your password straight away and contact us at <a href=\"{e(c['contact_url'], quote=True)}\" style=\"color:{GOLD}\">our contact page</a>.") +
            button('Reset password', c['reset_url']))
    return dict(subject='Your HEEM password was changed', html=layout('Password changed', body, 'Your HEEM password was changed.'),
                text=f"Hello {c['name']},\n\nYour HEEM password was changed on {c['when']}.\nIf this was not you, reset it now: {c['reset_url']}\n")


def order_received(c):
    rows = ''.join(
        f'<tr><td style="padding:12px 0;border-bottom:1px solid #eee;font:400 14px/1.5 {SANS}">{e(i["name"])}'
        f'<br><span style="color:{GREY};font-size:12px">{e(" · ".join(x for x in (i["size"], i["color"]) if x))} &nbsp;×&nbsp; {i["qty"]}</span></td>'
        f'<td align="right" style="padding:12px 0;border-bottom:1px solid #eee;font:400 14px {SANS};white-space:nowrap">{e(i["total"])}</td></tr>'
        for i in c['items'])

    def line(label, value, bold=False):
        w = '600' if bold else '400'
        return (f'<tr><td style="padding:6px 0;font:{w} 14px {SANS};color:{GREY if not bold else BLACK}">{label}</td>'
                f'<td align="right" style="padding:6px 0;font:{w} {16 if bold else 14}px {SANS}">{e(value)}</td></tr>')

    totals = line('Subtotal', c['subtotal']) + line('Delivery', c['delivery']) + (line('Discount', '-' + c['discount']) if c.get('discount') else '') + line('Total', c['total'], True)
    pay_note = ('We will check your payment and confirm your order shortly.' if c['is_mobile_payment']
                else 'You will pay in cash when your order arrives.')
    body = (h('Thank you for your order') + p(f"Hello {e(c['name'])}, we have received your order.") +
            f'<div style="margin:22px 0;padding:18px;background:{PAPER};border:1px solid #e6dfd2;text-align:center">'
            f'<span style="font:400 11px {SANS};letter-spacing:.25em;text-transform:uppercase;color:{GREY}">Order number</span><br>'
            f'<span style="font:600 22px {SERIF};letter-spacing:.08em">{e(c["number"])}</span></div>' +
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{rows}</table>' +
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px">{totals}</table>' +
            p(f'<strong>Payment:</strong> {e(c["payment_method"])} ({e(c["payment_status"])}). {e(pay_note)}') +
            p(f'<strong>Delivering to:</strong> {e(c["address"])}<br>{e(c["phone"])}') +
            button('Track your order' if c['is_guest'] else 'View your order', c['track_url']) +
            (p('Keep this email: the button above is your private link to follow this order without an account.', True) if c['is_guest'] else ''))
    text = (f"Hello {c['name']},\n\nWe have received your HEEM order {c['number']}.\n\n" +
            '\n'.join(f"- {i['name']} ({i['size']} {i['color']}) x{i['qty']}  {i['total']}" for i in c['items']) +
            f"\n\nTotal: {c['total']}\nPayment: {c['payment_method']} ({c['payment_status']})\nDelivering to: {c['address']}\n\nTrack your order: {c['track_url']}\n")
    return dict(subject=f"We received your order {c['number']}", html=layout('Order received', body, f"Order {c['number']} received"), text=text)


# ---- order status emails ---------------------------------------------------------------------------------------
# One shared design; each kind only differs in its words. (title, intro line, button label, preheader)
STATUS_COPY = {
    'order_confirmed': ('Your order is confirmed', 'Good news: we have confirmed your order and will start preparing it shortly.', 'Track your order', 'Your order is confirmed'),
    'order_processing': ('We are preparing your order', 'Your order is now being prepared by our team. Every piece is checked before it leaves us.', 'Track your order', 'Your order is being prepared'),
    'order_shipped': ('Your order is on its way', 'Your order has been handed to the courier.', 'Track your order', 'Your order has shipped'),
    'order_out_for_delivery': ('Out for delivery today', 'Your order is out for delivery. Please keep your phone close so the courier can reach you.', 'Track your order', 'Your order is out for delivery'),
    'order_delivered': ('Your order has been delivered', 'Your order has arrived. We hope you love it.', 'View your order', 'Your order has been delivered'),
    'order_cancelled': ('Your order was cancelled', 'Your order has been cancelled and the items are back in stock.', 'View your order', 'Your order was cancelled'),
    'payment_confirmed': ('Payment received', 'We have verified your payment. Thank you.', 'View your order', 'Your payment is confirmed'),
    'payment_failed': ('We could not verify your payment', 'We were not able to verify the payment for this order.', 'Fix your payment', 'Payment could not be verified'),
    'order_refunded': ('Your refund has been sent', 'We have sent your refund. It can take a few working days to show in your account.', 'View your order', 'Your refund has been sent'),
}


def _order_box(c):
    return (f'<div style="margin:22px 0;padding:18px;background:{PAPER};border:1px solid #e6dfd2;text-align:center">'
            f'<span style="font:400 11px {SANS};letter-spacing:.25em;text-transform:uppercase;color:{GREY}">Order number</span><br>'
            f'<span style="font:600 22px {SERIF};letter-spacing:.08em">{e(c["number"])}</span></div>')


def _order_lines(c):
    rows = ''.join(
        f'<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font:400 14px/1.5 {SANS}">{e(i["name"])}'
        f'<br><span style="color:{GREY};font-size:12px">{e(" · ".join(x for x in (i["size"], i["color"]) if x))} &nbsp;×&nbsp; {i["qty"]}</span></td>'
        f'<td align="right" style="padding:10px 0;border-bottom:1px solid #eee;font:400 14px {SANS};white-space:nowrap">{e(i["total"])}</td></tr>'
        for i in c['items'])
    total = (f'<tr><td style="padding:10px 0;font:600 15px {SANS}">Total</td>'
             f'<td align="right" style="padding:10px 0;font:600 16px {SANS}">{e(c["total"])}</td></tr>')
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{rows}{total}</table>'


def _status_email(kind):
    title, intro, button_label, pre = STATUS_COPY[kind]

    def build(c):
        extra = ''
        text_extra = ''
        if kind == 'order_shipped' or kind == 'order_out_for_delivery':
            bits = [x for x in (('Courier: ' + c['courier']) if c.get('courier') else '', ('Tracking code: ' + c['tracking_code']) if c.get('tracking_code') else '') if x]
            if bits:
                extra += p('<strong>' + e(' · '.join(bits)) + '</strong>')
                text_extra += ' · '.join(bits) + '\n'
        if kind == 'order_cancelled':
            if c.get('reason'):
                extra += p(f'<strong>Reason:</strong> {e(c["reason"])}')
                text_extra += f'Reason: {c["reason"]}\n'
            if c.get('refund_due'):
                extra += p('Because you had already paid, we will refund the amount. We will email you again when it has been sent.')
                text_extra += 'We will refund the amount you paid and email you when it is sent.\n'
        if kind == 'payment_confirmed':
            extra += p(f'<strong>Payment:</strong> {e(c["payment_method"])}, {e(c["total"])}')
        if kind == 'payment_failed':
            if c.get('reason'):
                extra += p(f'<strong>Reason:</strong> {e(c["reason"])}')
                text_extra += f'Reason: {c["reason"]}\n'
            extra += p('Open your order and send the payment details again, or contact us with your order number.')
        if kind == 'order_delivered' and c.get('has_invoice'):
            extra += p('Your invoice is attached to this email as a PDF.')
            text_extra += 'Your invoice is attached as a PDF.\n'
        if kind == 'order_delivered':
            extra += p('If something is not right, reply to this email or contact us within the return window.', True)
        body = (h(title) + p(f"Hello {e(c['name'])},") + p(intro) + _order_box(c) + extra + _order_lines(c) +
                button(button_label, c['track_url']) +
                (p('This is your private link to follow the order without an account.', True) if c.get('is_guest') else ''))
        text = (f"Hello {c['name']},\n\n{intro}\nOrder {c['number']}\n{text_extra}\nTotal: {c['total']}\n\n{button_label}: {c['track_url']}\n")
        return dict(subject=f"{title} · {c['number']}", html=layout(title, body, f"{pre}: {c['number']}"), text=text)
    return build


TEMPLATES = {'order_received': order_received, 'otp': otp, 'welcome': welcome, 'reset': reset, 'password_changed': password_changed,
             **{k: _status_email(k) for k in STATUS_COPY}}


def render(kind, ctx):
    return TEMPLATES[kind](ctx)