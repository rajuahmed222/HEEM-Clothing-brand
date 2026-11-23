"""Ordering without an account, and looking an order up without one.
A guest order has no user. It is reached by a long random link token (sent by email), or by order number + the
email used at checkout. The order number alone never opens anything."""
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.serializers import AddressSerializer
from shop.models import ProductVariant

from . import notify, rules
from .models import Order, OrderEvent, OrderItem, PaymentEvent, PaymentSubmission
from .serializers import GuestCheckoutSerializer, GuestQuoteSerializer, OrderDetailSerializer, product_image
from .views import TRX_USED, trx_in_use

NOT_FOUND = {'detail': 'We could not find an order with those details.'}


def attach_guest_orders(user):
    """Gives earlier guest orders to a customer, but only when they have proved they own that email address.
    Called after email verification, social sign-in and sign-in. Returns how many orders moved."""
    if not user or not user.email:
        return 0
    profile = getattr(user, 'profile', None)
    if profile is not None and not profile.email_verified:
        return 0
    return Order.objects.filter(user__isnull=True, guest_email__iexact=user.email).update(user=user)


class PublicOrderSerializer(OrderDetailSerializer):
    """The order as someone without a login sees it: same details and timeline, but no account actions."""
    def get_can_cancel(self, o):
        # Only guest orders can be cancelled from here; a customer with an account signs in to do it.
        return (not o.user_id) and rules.can_cancel(o)

    def get_can_return(self, o):
        return False

    def get_can_resubmit_payment(self, o):
        return False


def public_order(request, order):
    fresh = Order.objects.prefetch_related('items', 'events', 'payments', 'payment_events').get(pk=order.pk)
    data = dict(PublicOrderSerializer(fresh, context={'request': request}).data)
    data['is_guest'] = not fresh.user_id
    return data


class GuestCheckoutOptionsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'payment_methods': rules.payment_options(), 'policy': rules.store_policy()})


def _lines(items):
    wanted = {}
    for line in items:
        wanted[line['variant_id']] = wanted.get(line['variant_id'], 0) + line['quantity']
    return wanted


def _problems(wanted, variants):
    limit = getattr(settings, 'MAX_QTY_PER_ITEM', 10)
    out = []
    for vid, qty in wanted.items():
        v = variants.get(vid)
        if not v or not v.product.is_active:
            out.append('An item in your bag is no longer available.')
        elif v.stock < qty:
            out.append(f'{v.product.name} ({v.size} {v.color}): only {v.stock} left.')
        elif qty > limit:
            out.append(f'{v.product.name}: you can order at most {limit} of each item.')
    return out


class GuestQuoteView(APIView):
    """Live totals for the guest's bag. The final amount is calculated again when the order is placed."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        s = GuestQuoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        wanted = _lines(s.validated_data['items'])
        variants = {v.pk: v for v in ProductVariant.objects.filter(pk__in=list(wanted)).select_related('product')}
        sub = sum((variants[i].product.price * q for i, q in wanted.items() if i in variants), Decimal('0'))
        charge = rules.delivery_charge(sub, s.validated_data.get('district', ''))
        return Response({'subtotal': sub, 'delivery_charge': charge, 'discount': Decimal('0'), 'total': sub + charge,
                         'problems': _problems(wanted, variants)})


class GuestCheckoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'guest_checkout'

    def post(self, request):
        s = GuestCheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        email = d['email'].strip().lower()

        # same key + same email = same click: a double click or retry returns the order that already exists
        existing = Order.objects.filter(user__isnull=True, idempotency_key=d['idempotency_key'], guest_email__iexact=email).first()
        if existing:
            return self._done(request, existing, 200)
        try:
            return self._place(request, d, email)
        except IntegrityError:
            existing = Order.objects.filter(user__isnull=True, idempotency_key=d['idempotency_key'], guest_email__iexact=email).first()
            if existing:
                return self._done(request, existing, 200)
            return Response({'detail': 'We could not place your order. Please check your payment details and try again.'}, status=409)

    def _done(self, request, order, http_status):
        data = public_order(request, order)
        data['track_token'] = order.track_token
        data['track_url'] = notify.track_url(order)
        return Response(data, status=http_status)

    @transaction.atomic
    def _place(self, request, d, email):
        options = {o['code']: o for o in rules.payment_options()}
        if d['payment_method'] not in options:
            return Response({'payment_method': ['This payment method is not available.']}, status=400)
        is_mobile = d['payment_method'] in rules.MOBILE_METHODS
        pay = d.get('payment') if is_mobile else None

        addr_s = AddressSerializer(data={**d['address'], 'label': 'other'})
        if not addr_s.is_valid():
            return Response({'address': addr_s.errors}, status=400)
        addr = addr_s.validated_data

        # stock rows locked, so two customers cannot buy the last piece together
        wanted = _lines(d['items'])
        variants = {v.pk: v for v in ProductVariant.objects.select_for_update()
                    .filter(pk__in=list(wanted)).select_related('product')}
        problems = _problems(wanted, variants)
        if problems:
            return Response({'detail': 'Some items are no longer available.', 'items': problems}, status=409)
        if is_mobile and trx_in_use(d['payment_method'], pay['trx_id']):
            return Response(TRX_USED, status=400)

        subtotal = sum((variants[i].product.price * q for i, q in wanted.items()), Decimal('0'))
        charge = rules.delivery_charge(subtotal, addr['district'])
        order = Order.objects.create(
            user=None, guest_email=email, track_token=Order.new_track_token(),
            idempotency_key=d['idempotency_key'], note=d.get('note', ''),
            payment_method=d['payment_method'],
            payment_status='pending_verification' if is_mobile else 'cod_pending',
            buyer_name=addr['recipient_name'], buyer_phone=addr['phone'],
            recipient_name=addr['recipient_name'], phone=addr['phone'], country=addr.get('country', 'Bangladesh'),
            division=addr['division'], district=addr['district'], upazila=addr.get('upazila', ''),
            area=addr.get('area', ''), street=addr['street'], landmark=addr.get('landmark', ''),
            postal_code=addr.get('postal_code', ''),
            subtotal=subtotal, delivery_charge=charge, discount=Decimal('0'), total=subtotal + charge,
        )
        for vid, qty in wanted.items():
            v = variants[vid]
            OrderItem.objects.create(
                order=order, variant=v, product_name=v.product.name, product_slug=v.product.slug,
                thumbnail=product_image(request, v.product, v.color) or '', size=v.size, color=v.color,
                unit_price=v.product.price, quantity=qty)
            ProductVariant.objects.filter(pk=v.pk).update(stock=F('stock') - qty)
        OrderEvent.objects.create(order=order, status='placed', note='We received your order.')
        if is_mobile:
            PaymentSubmission.objects.create(
                order=order, provider=d['payment_method'], sender_number=pay['sender_number'], trx_id=pay['trx_id'],
                amount_sent=pay['amount_sent'], expected_amount=order.total, note=pay.get('note', ''))
            PaymentEvent.objects.create(order=order, status='pending_verification',
                                        note='Payment details received. Awaiting verification.')
        else:
            PaymentEvent.objects.create(order=order, status='cod_pending', note='Pay on delivery.')
        notify.order_received_after_commit(order)
        return self._done(request, order, 201)


class GuestOrderView(APIView):
    """Opens a guest order from the secure link in the confirmation email."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'track'

    def get(self, request, token):
        order = Order.objects.filter(track_token=token).first() if 20 <= len(token) <= 64 else None
        if not order:
            return Response(NOT_FOUND, status=404)
        return Response(public_order(request, order))


class TrackOrderView(APIView):
    """Order number + the email used at checkout. One answer for every kind of miss, so nobody can probe numbers."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'track'

    def post(self, request):
        number = str(request.data.get('number') or '').strip().upper()
        email = str(request.data.get('email') or '').strip().lower()
        order = Order.objects.select_related('user').filter(number=number).first() if number and email else None
        if not order or order.customer_email.strip().lower() != email:
            return Response(NOT_FOUND, status=404)
        return Response(public_order(request, order))


class GuestCancelView(APIView):
    """Cancels a guest order that has not left the shop yet. Proof of ownership is the same as for viewing it:
    the private link token, or order number + checkout email. Stock is returned and any payment is queued for refund."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'track'

    @transaction.atomic
    def post(self, request):
        token = str(request.data.get('token') or '').strip()
        number = str(request.data.get('number') or '').strip().upper()
        email = str(request.data.get('email') or '').strip().lower()
        order = None
        if 20 <= len(token) <= 64:
            order = Order.objects.select_for_update().filter(track_token=token).first()
        elif number and email:
            order = Order.objects.select_for_update().filter(number=number).first()
            if order and order.customer_email.strip().lower() != email:
                order = None
        if not order or order.user_id:
            return Response(NOT_FOUND, status=404)
        if not rules.can_cancel(order):
            return Response({'detail': 'This order can no longer be cancelled. Please contact us with your order number.'}, status=400)
        reason = str(request.data.get('reason') or '').strip()[:300] or 'Cancelled by customer'
        order.set_status('cancelled', reason)
        return Response(public_order(request, order))


class ClaimGuestOrdersView(APIView):
    """A signed-in customer with a verified email picks up the orders they placed earlier as a guest."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'claimed': attach_guest_orders(request.user)})