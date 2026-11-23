from decimal import Decimal
from types import SimpleNamespace

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Address
from accounts.serializers import AddressSerializer
from shop.models import Product, ProductVariant

from . import notify, rules
from .models import (CartItem, Order, OrderEvent, OrderItem, PaymentEvent, PaymentSubmission,
                     WishlistItem)
from .serializers import (CartItemSerializer, CheckoutSerializer, OrderDetailSerializer,
                          OrderSerializer, PaymentInputSerializer, VariantLineMixin,
                          WishlistItemSerializer, product_image)


def cart_response(request, http_status=200):
    items = CartItem.objects.filter(user=request.user).select_related('variant__product') \
        .prefetch_related('variant__product__images')
    data = CartItemSerializer(items, many=True, context={'request': request}).data
    subtotal = sum((Decimal(str(i['line_total'])) for i in data), Decimal('0'))
    return Response({'items': data, 'count': sum(i['quantity'] for i in data), 'subtotal': subtotal}, status=http_status)


class StorePolicyView(APIView):
    """Public delivery / return rules, so the bag and checkout pages never hardcode them."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(rules.store_policy())


# ---------------- Wishlist ----------------
class GuestWishlistResolveView(APIView):
    """Guests keep product ids in the browser; this returns the same shape as the real wishlist."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            ids = [int(i) for i in request.query_params.get('ids', '').split(',') if i][:100]
        except ValueError:
            return Response({'detail': 'Bad ids.'}, status=400)
        products = Product.objects.filter(pk__in=ids, is_active=True).prefetch_related('images', 'variants')
        items = [SimpleNamespace(id=p.id, product=p) for p in products]
        return Response(WishlistItemSerializer(items, many=True, context={'request': request}).data)


class WishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = WishlistItem.objects.filter(user=request.user).select_related('product') \
            .prefetch_related('product__images', 'product__variants')
        return Response(WishlistItemSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        try:
            product = Product.objects.get(pk=request.data.get('product_id'), is_active=True)
        except (Product.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Product not found.'}, status=404)
        WishlistItem.objects.get_or_create(user=request.user, product=product)
        return self.get(request)


class WishlistItemView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, product_id):
        WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        return Response(status=204)


class WishlistMergeView(APIView):
    """After login: send the guest wishlist product ids, they are added to the account."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get('product_ids', [])
        if not isinstance(ids, list):
            return Response({'detail': 'product_ids must be a list.'}, status=400)
        for p in Product.objects.filter(pk__in=[i for i in ids if isinstance(i, int)][:100], is_active=True):
            WishlistItem.objects.get_or_create(user=request.user, product=p)
        return WishlistView().get(request)


class WishlistMoveToCartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        try:
            variant = ProductVariant.objects.get(pk=request.data.get('variant_id'), product_id=product_id,
                                                 product__is_active=True)
        except (ProductVariant.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Choose a size/color first.'}, status=400)
        if variant.stock < 1:
            return Response({'detail': 'This option is out of stock.'}, status=400)
        add_to_cart(request.user, variant, 1)
        WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        return cart_response(request)


# ---------------- Cart ----------------
def add_to_cart(user, variant, qty):
    """Add qty, capped at stock. Returns the cart row."""
    item, _ = CartItem.objects.get_or_create(user=user, variant=variant, defaults={'quantity': 0})
    item.quantity = min(item.quantity + qty, max(variant.stock, 1))
    item.save()
    return item


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return cart_response(request)

    def post(self, request):
        try:
            qty = int(request.data.get('quantity', 1))
            variant_id = int(request.data.get('variant_id'))
        except (ValueError, TypeError):
            return Response({'detail': 'Product option not found.'}, status=400)
        if qty < 1:
            return Response({'detail': 'Quantity must be at least 1.'}, status=400)

        with transaction.atomic():
            try:
                variant = ProductVariant.objects.select_for_update().select_related('product').get(
                    pk=variant_id, product__is_active=True)
            except ProductVariant.DoesNotExist:
                return Response({'detail': 'Product option not found.'}, status=400)
            if variant.stock < 1:
                return Response({'detail': 'This option is out of stock.'}, status=400)

            in_bag = CartItem.objects.filter(user=request.user, variant=variant) \
                .values_list('quantity', flat=True).first() or 0
            limit = min(variant.stock, getattr(settings, 'MAX_QTY_PER_ITEM', 10))
            if in_bag + qty > limit:
                room = max(limit - in_bag, 0)
                if in_bag and room == 0:
                    msg = f'You already have the maximum available ({in_bag}) in your bag.'
                elif in_bag:
                    msg = f'You already have {in_bag} in your bag. You can add {room} more.'
                else:
                    msg = f'Only {limit} available for this option.'
                return Response({'detail': msg}, status=409)
            add_to_cart(request.user, variant, qty)
        return cart_response(request, 201)


class CartItemView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            item = CartItem.objects.select_related('variant').get(pk=pk, user=request.user)
            qty = int(request.data.get('quantity'))
        except (CartItem.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Cart item not found.'}, status=404)
        if qty < 1:
            return Response({'detail': 'Quantity must be at least 1. Remove the item instead.'}, status=400)
        limit = min(item.variant.stock, getattr(settings, 'MAX_QTY_PER_ITEM', 10))
        if qty > limit:
            return Response({'detail': f'Only {limit} available for this option.'}, status=400)
        item.quantity = qty
        item.save()
        return cart_response(request)

    def delete(self, request, pk):
        CartItem.objects.filter(pk=pk, user=request.user).delete()
        return cart_response(request)


class CartSaveForLaterView(APIView):
    """Moves a bag line to the wishlist in one step (wishlist is per product, so the size/colour is not kept)."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            item = CartItem.objects.select_related('variant').get(pk=pk, user=request.user)
        except CartItem.DoesNotExist:
            return Response({'detail': 'Cart item not found.'}, status=404)
        WishlistItem.objects.get_or_create(user=request.user, product_id=item.variant.product_id)
        item.delete()
        return cart_response(request)


class CartMergeView(APIView):
    """After login: guest cart lines [{variant_id, quantity}] are merged into the account cart."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lines = request.data.get('items', [])
        if not isinstance(lines, list):
            return Response({'detail': 'items must be a list.'}, status=400)
        for line in lines[:50]:
            try:
                variant = ProductVariant.objects.get(pk=int(line['variant_id']), product__is_active=True)
                qty = max(int(line.get('quantity', 1)), 1)
            except (ProductVariant.DoesNotExist, KeyError, ValueError, TypeError):
                continue
            if variant.stock > 0:
                add_to_cart(request.user, variant, qty)
        return cart_response(request)


class GuestResolveView(VariantLineMixin, APIView):
    """Guests keep {variant_id, quantity} in the browser; this fills in names/prices/stock from the same data."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            ids = [int(i) for i in request.query_params.get('ids', '').split(',') if i][:50]
        except ValueError:
            return Response({'detail': 'Bad ids.'}, status=400)
        qs = ProductVariant.objects.filter(pk__in=ids).select_related('product').prefetch_related('product__images')
        return Response([self.variant_data(v, request) for v in qs])


# ---------------- Checkout ----------------
def my_orders(request):
    # always filtered by user, so another customer's order is a plain 404
    return Order.objects.filter(user=request.user) \
        .prefetch_related('items', 'events', 'payments', 'payment_events')


def order_detail_response(request, order, http_status=200):
    fresh = my_orders(request).get(pk=order.pk)
    return Response(OrderDetailSerializer(fresh, context={'request': request}).data, status=http_status)


def trx_in_use(provider, trx_id):
    return PaymentSubmission.objects.filter(
        provider=provider, trx_id=trx_id, status__in=('submitted', 'verified')).exists()


TRX_USED = {'payment': {'trx_id': ['This transaction ID has already been used. Please check it and try again.']}}


class CheckoutOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = Address.objects.filter(user=request.user)
        cart = cart_response(request).data
        sub = Decimal(str(cart['subtotal']))
        default = addresses.filter(is_default=True).first() or addresses.first()
        profile = getattr(request.user, 'profile', None)
        return Response({
            'payment_methods': rules.payment_options(),
            'addresses': AddressSerializer(addresses, many=True).data,
            'default_address_id': default.id if default else None,
            'buyer': {'name': request.user.first_name, 'phone': profile.phone if profile else ''},
            'cart': cart,
            'delivery_charge': rules.delivery_charge(sub, default.district if default else ''),
            'policy': rules.store_policy(),
            'note': 'Delivery charge is recalculated from the delivery address when you place the order.',
        })


class CheckoutQuoteView(APIView):
    """Live totals while the customer edits the district. The final amount is still recalculated on placing the order."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = cart_response(request).data
        sub = Decimal(str(cart['subtotal']))
        charge = rules.delivery_charge(sub, request.query_params.get('district', ''))
        return Response({'subtotal': sub, 'delivery_charge': charge, 'discount': Decimal('0'), 'total': sub + charge})


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        key = d['idempotency_key']

        # Same key = same click. A double click or a retry returns the order that already exists.
        existing = Order.objects.filter(user=request.user, idempotency_key=key).first()
        if existing:
            return order_detail_response(request, existing, 200)
        try:
            return self._place(request, d)
        except IntegrityError:
            existing = Order.objects.filter(user=request.user, idempotency_key=key).first()
            if existing:
                return order_detail_response(request, existing, 200)
            return Response({'detail': 'We could not place your order. Please check your payment details and try again.'}, status=409)

    @transaction.atomic
    def _place(self, request, d):
        user = request.user
        options = {o['code']: o for o in rules.payment_options()}
        if d['payment_method'] not in options:
            return Response({'payment_method': ['This payment method is not available.']}, status=400)
        is_mobile = d['payment_method'] in rules.MOBILE_METHODS
        pay = d.get('payment') if is_mobile else None

        # ---- who pays, and where it goes ----
        addr_s = None
        save_to_account = False
        if d.get('is_gift'):
            addr_s = AddressSerializer(data={**d['recipient'], 'label': 'other'})
            if not addr_s.is_valid():
                return Response({'recipient': addr_s.errors}, status=400)
            addr = addr_s.validated_data
            buyer_name, buyer_phone = d['buyer']['name'].strip(), d['buyer']['phone']
        elif d.get('address_id'):
            try:
                a = Address.objects.get(pk=d['address_id'], user=user)
            except Address.DoesNotExist:
                return Response({'address': ['Address not found.']}, status=400)
            addr = AddressSerializer(a).data
            buyer_name, buyer_phone = addr['recipient_name'], addr['phone']
        else:
            addr_s = AddressSerializer(data={**d['address'], 'label': 'other'})
            if not addr_s.is_valid():
                return Response({'address': addr_s.errors}, status=400)
            addr = addr_s.validated_data
            save_to_account = bool(d['address'].get('save_address'))
            buyer_name, buyer_phone = addr['recipient_name'], addr['phone']

        # ---- bag, stock (rows locked so two customers cannot buy the last piece together) ----
        cart = list(CartItem.objects.select_for_update().filter(user=user))
        if not cart:
            return Response({'detail': 'Your bag is empty.'}, status=400)
        variants = {v.pk: v for v in ProductVariant.objects.select_for_update()
                    .filter(pk__in=[c.variant_id for c in cart]).select_related('product')}
        problems = []
        for c in cart:
            v = variants[c.variant_id]
            if not v.product.is_active or v.stock < c.quantity:
                problems.append(f'{v.product.name} ({v.size} {v.color}): only {v.stock} left.')
        if problems:
            return Response({'detail': 'Some items are no longer available.', 'items': problems}, status=409)

        if is_mobile and trx_in_use(d['payment_method'], pay['trx_id']):
            return Response(TRX_USED, status=400)

        # ---- everything is valid: from here on we only write ----
        if save_to_account:  # saved as a NEW address; the existing saved ones are never overwritten
            addr_s.save(user=user, is_default=not Address.objects.filter(user=user).exists())

        subtotal = sum((variants[c.variant_id].product.price * c.quantity for c in cart), Decimal('0'))
        charge = rules.delivery_charge(subtotal, addr['district'])
        order = Order.objects.create(
            user=user, idempotency_key=d['idempotency_key'], note=d.get('note', ''),
            payment_method=d['payment_method'],
            payment_status='pending_verification' if is_mobile else 'cod_pending',
            is_gift=bool(d.get('is_gift')), gift_message=d.get('gift_message', '') if d.get('is_gift') else '',
            buyer_name=buyer_name, buyer_phone=buyer_phone,
            recipient_name=addr['recipient_name'], phone=addr['phone'], country=addr.get('country', 'Bangladesh'),
            division=addr['division'], district=addr['district'], upazila=addr.get('upazila', ''),
            area=addr.get('area', ''), street=addr['street'], landmark=addr.get('landmark', ''),
            postal_code=addr.get('postal_code', ''),
            subtotal=subtotal, delivery_charge=charge, discount=Decimal('0'), total=subtotal + charge,
        )
        for c in cart:
            v = variants[c.variant_id]
            OrderItem.objects.create(
                order=order, variant=v, product_name=v.product.name, product_slug=v.product.slug,
                thumbnail=product_image(request, v.product, v.color) or '', size=v.size, color=v.color,
                unit_price=v.product.price, quantity=c.quantity)
            ProductVariant.objects.filter(pk=v.pk).update(stock=F('stock') - c.quantity)
        OrderEvent.objects.create(order=order, status='placed', note='We received your order.')
        if is_mobile:
            PaymentSubmission.objects.create(
                order=order, provider=d['payment_method'], sender_number=pay['sender_number'],
                trx_id=pay['trx_id'], amount_sent=pay['amount_sent'], expected_amount=order.total,
                note=pay.get('note', ''))
            PaymentEvent.objects.create(order=order, status='pending_verification',
                                        note='Payment details received. Awaiting verification.')
        else:
            PaymentEvent.objects.create(order=order, status='cod_pending', note='Pay on delivery.')
        CartItem.objects.filter(user=user).delete()
        notify.order_received_after_commit(order)
        return order_detail_response(request, order, 201)


# ---------------- Orders ----------------
# Quick filters on My Orders -> the real backend statuses they cover
ORDER_GROUPS = {
    'processing': ['placed', 'confirmed', 'processing', 'packed'],
    'shipped': ['shipped', 'in_transit', 'out_for_delivery'],
    'delivered': ['delivered', 'return_requested', 'returned'],
    'cancelled': ['cancelled'],
}


class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = my_orders(request)
        p = request.query_params
        if p.get('q', '').strip():
            qs = qs.filter(number__icontains=p['q'].strip())
        if p.get('group') in ORDER_GROUPS:
            qs = qs.filter(status__in=ORDER_GROUPS[p['group']])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('payment_status'):
            qs = qs.filter(payment_status=p['payment_status'])
        return Response(OrderSerializer(qs, many=True, context={'request': request}).data)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, number):
        try:
            order = my_orders(request).get(number=number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        return Response(OrderDetailSerializer(order, context={'request': request}).data)


class OrderAlertsView(APIView):
    """Tiny summary for the navbar dot. red = a payment was rejected (the customer must act),
    green = a payment was verified."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mine = Order.objects.filter(user=request.user, payment_method__in=list(rules.MOBILE_METHODS))
        action = mine.filter(payment_status='failed').exclude(status__in=list(Order.TERMINAL)) \
            .values_list('number', flat=True)
        paid = mine.filter(payment_status='paid').order_by('-paid_at').values_list('number', flat=True)[:30]
        return Response({'action_needed': list(action), 'verified': list(paid)})


class OrderPaymentView(APIView):
    """After staff rejected a mobile payment, the customer can send corrected details once more."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, number):
        try:
            order = my_orders(request).select_for_update().get(number=number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        if not (order.payment_method in rules.MOBILE_METHODS and order.payment_status == 'failed'
                and order.status not in Order.TERMINAL):
            return Response({'detail': 'Payment details cannot be changed for this order.'}, status=400)
        s = PaymentInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        p = s.validated_data
        if trx_in_use(order.payment_method, p['trx_id']):
            return Response(TRX_USED, status=400)
        PaymentSubmission.objects.create(
            order=order, provider=order.payment_method, sender_number=p['sender_number'], trx_id=p['trx_id'],
            amount_sent=p['amount_sent'], expected_amount=order.total, note=p.get('note', ''))
        order.mark_payment('pending_verification', 'Payment details submitted again. Awaiting verification.', request.user)
        return order_detail_response(request, order)


class OrderReorderView(APIView):
    """Puts the items of an old order that are still available back into the bag.
    Prices and stock are the CURRENT ones, never the old order's."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, number):
        try:
            order = my_orders(request).get(number=number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        limit = getattr(settings, 'MAX_QTY_PER_ITEM', 10)
        added, skipped = [], []
        for item in order.items.select_related('variant__product'):
            v = item.variant
            if v is None or not v.product.is_active or v.stock < 1:
                skipped.append({'name': item.product_name, 'reason': 'No longer available'})
                continue
            in_bag = CartItem.objects.filter(user=request.user, variant=v).values_list('quantity', flat=True).first() or 0
            room = min(v.stock, limit) - in_bag
            if room < 1:
                skipped.append({'name': item.product_name, 'reason': 'Your bag already has the most you can buy'})
                continue
            qty = min(item.quantity, room)
            add_to_cart(request.user, v, qty)
            added.append({'name': item.product_name, 'quantity': qty, 'requested': item.quantity})
        return Response({'added': added, 'skipped': skipped, 'cart': cart_response(request).data})


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, number):
        try:
            order = my_orders(request).select_for_update().get(number=number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        if not rules.can_cancel(order):
            return Response({'detail': 'This order can no longer be cancelled. Please request a return after delivery.'}, status=400)
        reason = str(request.data.get('reason') or 'Cancelled by customer')[:300]
        order.set_status('cancelled', reason, by=request.user)  # also restocks and queues any refund
        return order_detail_response(request, order)


class OrderReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, number):
        try:
            order = my_orders(request).get(number=number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        if not rules.can_return(order):
            return Response({'detail': 'This order is not eligible for return.'}, status=400)
        reason = str(request.data.get('reason') or 'Return requested by customer')[:300]
        order.set_status('return_requested', reason, by=request.user)
        return order_detail_response(request, order)


# ---------------- Dashboard overview ----------------
class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        orders = my_orders(request)
        active = orders.exclude(status__in=['delivered', 'cancelled', 'returned'])
        return Response({
            'counts': {
                'orders': orders.count(),
                'active_orders': active.count(),
                'wishlist': u.wishlist.count(),
                'cart': sum(c.quantity for c in u.cart_items.all()),
                'addresses': u.addresses.count(),
            },
            'recent_orders': OrderSerializer(orders[:3], many=True, context={'request': request}).data,
            'current_order': OrderSerializer(active.first(), context={'request': request}).data if active.exists() else None,
        })