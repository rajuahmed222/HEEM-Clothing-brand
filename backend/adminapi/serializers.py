from decimal import Decimal

from rest_framework import serializers

from shop.models import Category, Collection, Product, ProductImage, ProductVariant
from shopping.models import Order, OrderEvent, OrderItem, PaymentEvent, PaymentSubmission
from support.models import ContactMessage

MAX_IMAGE_BYTES = 5 * 1024 * 1024


class OrderListSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_label = serializers.CharField(source='get_payment_status_display', read_only=True)
    payment_method_label = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'number', 'created_at', 'customer', 'recipient_name', 'phone', 'district', 'item_count',
                  'status', 'status_label', 'payment_method', 'payment_method_label', 'payment_status',
                  'payment_status_label', 'total']

    def get_customer(self, o):
        return o.user.email if o.user_id else o.guest_email 


class _ItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'product_slug', 'thumbnail', 'size', 'color', 'unit_price', 'quantity', 'line_total']


class _EventSerializer(serializers.ModelSerializer):
    status_label = serializers.SerializerMethodField()
    by = serializers.SerializerMethodField()

    class Meta:
        model = OrderEvent
        fields = ['status', 'status_label', 'note', 'by', 'created_at']

    def get_status_label(self, e):
        return e.get_status_display()

    def get_by(self, e):
        return e.by.email if e.by_id else 'System'


class _PayEventSerializer(_EventSerializer):
    class Meta(_EventSerializer.Meta):
        model = PaymentEvent


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.number', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_total = serializers.DecimalField(source='order.total', max_digits=10, decimal_places=2, read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    customer = serializers.SerializerMethodField()
    provider_label = serializers.CharField(source='get_provider_display', read_only=True)
    amount_matches = serializers.BooleanField(read_only=True)
    reviewed_by = serializers.SerializerMethodField()

    class Meta:
        model = PaymentSubmission
        fields = ['id', 'order_id', 'order_number', 'order_total', 'order_status', 'customer', 'provider',
                  'provider_label', 'sender_number', 'trx_id', 'amount_sent', 'expected_amount', 'amount_matches',
                  'note', 'status', 'review_note', 'reviewed_by', 'reviewed_at', 'created_at']

    def get_customer(self, s):
        return s.order.user.email if s.order.user_id else s.order.guest_email

    def get_reviewed_by(self, s):
        return s.reviewed_by.email if s.reviewed_by_id else ''


class OrderDetailSerializer(OrderListSerializer):
    items = _ItemSerializer(many=True, read_only=True)
    events = _EventSerializer(many=True, read_only=True)
    payment_events = _PayEventSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    next_statuses = serializers.SerializerMethodField()
    address = serializers.CharField(source='address_summary', read_only=True)
    can_collect_cod = serializers.SerializerMethodField()
    can_mark_refunded = serializers.SerializerMethodField()

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + [
            'buyer_name', 'buyer_phone', 'note', 'is_gift', 'gift_message', 'country', 'division', 'upazila',
            'area', 'street', 'landmark', 'postal_code', 'address', 'subtotal', 'delivery_charge', 'discount',
            'courier', 'tracking_code', 'paid_at', 'updated_at', 'items', 'events', 'payment_events', 'payments',
            'next_statuses', 'can_collect_cod', 'can_mark_refunded']

    def get_next_statuses(self, o):
        return [{'value': v, 'label': l} for v, l in Order.STATUSES if Order.transition_allowed(o.status, v)]

    def get_can_collect_cod(self, o):
        return o.payment_method == 'cod' and o.payment_status == 'cod_pending' and o.status == 'delivered'

    def get_can_mark_refunded(self, o):
        return o.payment_status == 'refund_pending'


# ------------------------------- Products -------------------------------

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt', 'order', 'color']
        read_only_fields = ['id', 'order']

    def validate_image(self, f):
        if f.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError('Each photo must be 5 MB or smaller.')
        return f


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'stock', 'sku']


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    collection_name = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'sku', 'price', 'compare_at_price', 'category_name', 'collection_name',
                  'stock', 'variant_count', 'thumbnail', 'is_active', 'is_new', 'is_signature']

    def get_collection_name(self, p):
        return p.collection.name if p.collection_id else ''

    def get_stock(self, p):
        return sum(v.stock for v in p.variants.all())

    def get_variant_count(self, p):
        return len(p.variants.all())

    def get_thumbnail(self, p):
        imgs = list(p.images.all())
        return imgs[0].image.url if imgs else ''


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    placements = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all(), required=False)
    collection = serializers.PrimaryKeyRelatedField(queryset=Collection.objects.all(), allow_null=True, required=False)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'short_description', 'description', 'price', 'compare_at_price', 'category', 'placements',
                  'collection', 'season', 'tags', 'sku', 'fabric', 'fit', 'model_height', 'model_wears', 'care',
                  'is_signature', 'is_new', 'is_active', 'images', 'variants', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

    def validate_price(self, v):
        if v <= 0:
            raise serializers.ValidationError('Price must be more than zero.')
        return v

    def validate(self, attrs):
        price = attrs.get('price', getattr(self.instance, 'price', None))
        cmp_ = attrs.get('compare_at_price', getattr(self.instance, 'compare_at_price', None))
        if cmp_ is not None and price is not None and cmp_ <= price:
            raise serializers.ValidationError(
                {'compare_at_price': 'The original price must be higher than the selling price. Leave it empty if there is no discount.'})
        return attrs


def clean_variants(rows):
    """Validate the size/colour/stock table sent by the product form. Returns normalised rows."""
    if not isinstance(rows, list):
        raise serializers.ValidationError({'variants': 'Send a list of variants.'})
    out, seen = [], set()
    for i, r in enumerate(rows, start=1):
        if not isinstance(r, dict):
            raise serializers.ValidationError({'variants': f'Row {i} is not valid.'})
        size = str(r.get('size', '')).strip().upper()[:10]
        color = str(r.get('color', '')).strip().title()[:40]
        sku = str(r.get('sku', '')).strip()[:40]
        try:
            stock = int(r.get('stock', 0))
        except (TypeError, ValueError):
            raise serializers.ValidationError({'variants': f'Row {i}: stock must be a whole number.'})
        if stock < 0:
            raise serializers.ValidationError({'variants': f'Row {i}: stock cannot be negative.'})
        if (size, color) in seen:
            raise serializers.ValidationError({'variants': f'Row {i}: the size/colour combination appears twice.'})
        seen.add((size, color))
        vid = r.get('id')
        out.append({'id': int(vid) if isinstance(vid, int) or (isinstance(vid, str) and vid.isdigit()) else None,
                    'size': size, 'color': color, 'stock': stock, 'sku': sku})
    return out


# ------------------------------- Contact form messages -------------------------------

class ContactMessageAdminSerializer(serializers.ModelSerializer):
    inquiry_label = serializers.CharField(source='get_inquiry_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    order_id = serializers.SerializerMethodField()

    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'inquiry_type', 'inquiry_label', 'order_number', 'order_id', 'subject',
                  'message', 'status', 'status_label', 'created_at']
        read_only_fields = fields

    def get_order_id(self, m):
        # the customer typed the number, so only link it when a real order has exactly that number
        if not m.order_number:
            return None
        return Order.objects.filter(number=m.order_number).values_list('id', flat=True).first()