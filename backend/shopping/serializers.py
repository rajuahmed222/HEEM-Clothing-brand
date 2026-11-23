import re
from decimal import Decimal

from rest_framework import serializers

from accounts.serializers import check_phone

from . import rules
from .models import CartItem, Order, OrderEvent, OrderItem, PaymentEvent, WishlistItem

BD_MOBILE = re.compile(r'^(?:\+?88)?01[3-9]\d{8}$')
TRX_RE = re.compile(r'^[A-Za-z0-9]{6,20}$')


def product_image(request, product, color=''):
    """The photo to show for a product. For a bag/order line pass the variant's colour to get that colour's photo.
    Falls back to a photo shared by all colours, then to the first photo. (Images are already sorted by `order`.)"""
    images = list(product.images.all())
    img = next((i for i in images if color and i.color == color), None) \
        or next((i for i in images if not i.color), None) \
        or (images[0] if images else None)
    if not img:
        return None
    return request.build_absolute_uri(img.image.url) if request else img.image.url


class VariantLineMixin:
    """Shared shape for cart lines (and guest-cart resolve) so both use one format."""

    def variant_data(self, variant, request):
        p = variant.product
        return {
            'variant_id': variant.id,
            'product_id': p.id,
            'slug': p.slug,
            'name': p.name,
            'price': p.price,
            'size': variant.size,
            'color': variant.color,
            'stock': variant.stock,
            'in_stock': variant.stock > 0 and p.is_active,
            'image': product_image(request, p, variant.color),
        }


class CartItemSerializer(VariantLineMixin, serializers.ModelSerializer):
    def to_representation(self, item):
        data = self.variant_data(item.variant, self.context.get('request'))
        data['id'] = item.id
        data['quantity'] = item.quantity
        data['line_total'] = item.quantity * item.variant.product.price
        data['quantity_exceeds_stock'] = item.quantity > item.variant.stock
        return data

    class Meta:
        model = CartItem
        fields = []


class WishlistItemSerializer(serializers.ModelSerializer):
    def to_representation(self, item):
        p = item.product
        request = self.context.get('request')
        variants = [{'variant_id': v.id, 'size': v.size, 'color': v.color, 'stock': v.stock} for v in p.variants.all()]
        return {
            'id': item.id,
            'product_id': p.id,
            'slug': p.slug,
            'name': p.name,
            'price': p.price,
            'image': product_image(request, p),
            'variants': variants,
            'in_stock': p.is_active and any(v['stock'] > 0 for v in variants),
        }

    class Meta:
        model = WishlistItem
        fields = []


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product_name', 'product_slug', 'thumbnail', 'size', 'color', 'unit_price', 'quantity', 'line_total']


class OrderEventSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OrderEvent
        fields = ['status', 'label', 'note', 'created_at']  # `by` (which staff member) stays private


class PaymentEventSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PaymentEvent
        fields = ['status', 'label', 'note', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_label = serializers.CharField(source='get_payment_status_display', read_only=True)
    payment_method_label = serializers.CharField(source='get_payment_method_display', read_only=True)
    address_summary = serializers.CharField(read_only=True)
    can_cancel = serializers.SerializerMethodField()
    can_return = serializers.SerializerMethodField()
    can_resubmit_payment = serializers.SerializerMethodField()
    can_invoice = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['number', 'status', 'status_label', 'payment_method', 'payment_method_label',
                  'payment_status', 'payment_status_label', 'paid_at', 'payment',
                  'is_gift', 'gift_message', 'buyer_name', 'buyer_phone',
                  'recipient_name', 'phone', 'country',
                  'division', 'district', 'upazila', 'area', 'street', 'landmark', 'postal_code',
                  'address_summary', 'subtotal', 'delivery_charge', 'discount', 'total', 'note',
                  'courier', 'tracking_code', 'created_at', 'items',
                  'can_cancel', 'can_return', 'can_resubmit_payment', 'can_invoice']

    def get_can_invoice(self, o):
        return o.status not in ('placed', 'cancelled')

    def get_can_cancel(self, o):
        return rules.can_cancel(o)

    def get_can_return(self, o):
        return rules.can_return(o)

    def get_can_resubmit_payment(self, o):
        return o.payment_method in rules.MOBILE_METHODS and o.payment_status == 'failed' and o.status not in Order.TERMINAL

    def get_payment(self, o):
        """The latest mobile-payment details the customer submitted (None for COD)."""
        sub = next(iter(o.payments.all()), None)
        if not sub:
            return None
        return {
            'provider': sub.provider,
            'provider_label': sub.get_provider_display(),
            'sender_number': sub.sender_number,
            'trx_id': sub.trx_id,
            'amount_sent': sub.amount_sent,
            'expected_amount': sub.expected_amount,
            'amount_matches': sub.amount_matches,
            'status': sub.status,
            'status_label': sub.get_status_display(),
            'review_note': sub.review_note if sub.status == 'rejected' else '',
            'submitted_at': sub.created_at,
        }


class OrderDetailSerializer(OrderSerializer):
    timeline = serializers.SerializerMethodField()
    payment_timeline = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ['timeline', 'payment_timeline']

    def get_timeline(self, o):
        """Only real events from the DB. `done` steps happened, the rest of FLOW are shown as upcoming."""
        events = OrderEventSerializer(o.events.all(), many=True).data
        reached = {e['status'] for e in events}
        upcoming = []
        if o.status in Order.FLOW:
            idx = Order.FLOW.index(o.status)
            labels = dict(Order.STATUSES)
            upcoming = [{'status': s, 'label': labels[s]} for s in Order.FLOW[idx + 1:]
                        if s not in reached and s not in Order.OPTIONAL_STEPS]
        return {'events': events, 'upcoming': upcoming}

    def get_payment_timeline(self, o):
        return PaymentEventSerializer(o.payment_events.all(), many=True).data


# ---------------- Checkout input ----------------
class CheckoutAddressSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=80, default='Bangladesh')
    division = serializers.CharField(max_length=80)
    district = serializers.CharField(max_length=80)
    upazila = serializers.CharField(max_length=80, required=False, allow_blank=True)
    area = serializers.CharField(max_length=120, required=False, allow_blank=True)
    street = serializers.CharField(max_length=255)
    landmark = serializers.CharField(max_length=160, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=12, required=False, allow_blank=True)
    save_address = serializers.BooleanField(required=False, default=False)


class BuyerContactSerializer(serializers.Serializer):
    """The person placing a gift order (the delivery address belongs to the recipient)."""
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value):
        return check_phone(value)


class PaymentInputSerializer(serializers.Serializer):
    """What the customer types AFTER sending money. We never ask for a PIN or OTP."""
    sender_number = serializers.CharField(max_length=20)
    trx_id = serializers.CharField(max_length=40)
    amount_sent = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('1'))
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_sender_number(self, value):
        value = value.replace(' ', '').replace('-', '')
        if not BD_MOBILE.match(value):
            raise serializers.ValidationError('Enter the mobile number you sent the money from (01XXXXXXXXX).')
        return value

    def validate_trx_id(self, value):
        value = value.strip()
        if not TRX_RE.match(value):
            raise serializers.ValidationError('Enter the transaction ID exactly as in your payment message (letters and numbers only).')
        return value.upper()


class CheckoutSerializer(serializers.Serializer):
    idempotency_key = serializers.CharField(min_length=8, max_length=64)
    address_id = serializers.IntegerField(required=False)
    address = CheckoutAddressSerializer(required=False)
    is_gift = serializers.BooleanField(required=False, default=False)
    buyer = BuyerContactSerializer(required=False)
    recipient = CheckoutAddressSerializer(required=False)
    gift_message = serializers.CharField(required=False, allow_blank=True, max_length=300)
    payment_method = serializers.CharField()
    payment = PaymentInputSerializer(required=False)
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)

    def validate(self, data):
        if data.get('is_gift'):
            if not data.get('recipient'):
                raise serializers.ValidationError({'recipient': 'Enter the gift recipient\u2019s delivery address.'})
            if not data.get('buyer'):
                raise serializers.ValidationError({'buyer': 'Enter your name and mobile number.'})
        elif not data.get('address_id') and not data.get('address'):
            raise serializers.ValidationError({'address': 'Choose a saved address or add a new one.'})
        if data['payment_method'] in rules.MOBILE_METHODS and not data.get('payment'):
            raise serializers.ValidationError({'payment': 'Enter your payment details after sending the money.'})
        return data


# ---------------- Guest checkout input ----------------
class GuestLineSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class GuestCheckoutSerializer(serializers.Serializer):
    """Everything a visitor without an account sends. The bag lives in their browser, so the lines come with the order."""
    idempotency_key = serializers.CharField(min_length=8, max_length=64)
    email = serializers.EmailField()
    address = CheckoutAddressSerializer()          # full name, contact number, shipping address, district, area, postal code
    items = GuestLineSerializer(many=True, allow_empty=False, max_length=50)
    payment_method = serializers.CharField()
    payment = PaymentInputSerializer(required=False)
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)

    def validate(self, data):
        if data['payment_method'] in rules.MOBILE_METHODS and not data.get('payment'):
            raise serializers.ValidationError({'payment': 'Enter your payment details after sending the money.'})
        return data


class GuestQuoteSerializer(serializers.Serializer):
    items = GuestLineSerializer(many=True, allow_empty=False, max_length=50)
    district = serializers.CharField(required=False, allow_blank=True, max_length=80)