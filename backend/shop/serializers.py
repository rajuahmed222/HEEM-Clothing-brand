from django.conf import settings
from rest_framework import serializers
from .models import Category, Product, ProductImage, ProductVariant, SizeChart, SIZES, SIZE_COLUMNS
from .categories import category_states


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['image', 'alt', 'order', 'color']


class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'stock', 'sku']


class CategorySerializer(serializers.ModelSerializer):
    parent = serializers.SlugRelatedField(read_only=True, slug_field='slug')
    state = serializers.SerializerMethodField()  # live | coming_soon | hidden, see shop/categories.py

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'state', 'group', 'position']

    def get_state(self, obj):
        states = self.context.setdefault('_category_states', category_states())  # one calculation per request
        return states.get(obj.id, {}).get('state', 'live')


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    category = serializers.SlugRelatedField(read_only=True, slug_field='slug')
    category_name = serializers.CharField(source='category.name', read_only=True)
    collection = serializers.SerializerMethodField()
    collection_name = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'category', 'category_name',
                  'collection', 'collection_name', 'season', 'tags', 'sizes', 'colors',
                  'stock', 'in_stock', 'is_signature', 'is_new', 'images', 'variants']

    def get_collection(self, obj):
        return obj.collection.slug if obj.collection else None

    def get_collection_name(self, obj):
        return obj.collection.name if obj.collection else ''

    def get_tags(self, obj):
        return [t.strip() for t in obj.tags.split(',') if t.strip()]

    def get_sizes(self, obj):
        present = {v.size for v in obj.variants.all() if v.size}
        return [s for s in SIZES if s in present] + sorted(present - set(SIZES))

    def get_colors(self, obj):
        return sorted({v.color for v in obj.variants.all() if v.color})

    def get_stock(self, obj):
        return sum(v.stock for v in obj.variants.all())

    def get_in_stock(self, obj):
        return self.get_stock(obj) > 0


class ProductDetailSerializer(ProductSerializer):
    """Everything the Product Details Page needs. Lists/search keep using ProductSerializer."""
    compare_at_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    care_list = serializers.SerializerMethodField()
    breadcrumbs = serializers.SerializerMethodField()
    size_chart = serializers.SerializerMethodField()
    shipping_returns = serializers.SerializerMethodField()
    max_per_order = serializers.SerializerMethodField()

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + [
            'short_description', 'compare_at_price', 'discount_percent', 'sku', 'fabric', 'fit',
            'model_height', 'model_wears', 'care_list', 'breadcrumbs', 'size_chart',
            'shipping_returns', 'max_per_order',
        ]

    # A discount exists only when the original price is genuinely higher than the selling price.
    def _has_discount(self, obj):
        return obj.compare_at_price is not None and obj.compare_at_price > obj.price

    def get_compare_at_price(self, obj):
        return obj.compare_at_price if self._has_discount(obj) else None

    def get_discount_percent(self, obj):
        if not self._has_discount(obj):
            return None
        return int(round((1 - obj.price / obj.compare_at_price) * 100))

    def get_care_list(self, obj):
        return [line.strip() for line in obj.care.splitlines() if line.strip()]

    def get_breadcrumbs(self, obj):
        crumbs = []
        if obj.category.parent:
            crumbs.append({'name': obj.category.parent.name, 'slug': obj.category.parent.slug})
        crumbs.append({'name': obj.category.name, 'slug': obj.category.slug})
        return crumbs

    def get_size_chart(self, obj):
        cats = [obj.category] + ([obj.category.parent] if obj.category.parent else [])
        charts = {c.category_id: c for c in SizeChart.objects.filter(category__in=cats).prefetch_related('rows')}
        chart = next((charts[c.id] for c in cats if c.id in charts), None)
        rows = list(chart.rows.all()) if chart else []
        if not rows:
            return None
        cols = [(k, label) for k, label in SIZE_COLUMNS if any(getattr(r, k) for r in rows)]
        return {
            'title': chart.title,
            'unit': chart.unit,
            'note': chart.note,
            'columns': [{'key': k, 'label': label} for k, label in cols],
            'rows': [{'size': r.size, **{k: getattr(r, k) for k, _ in cols}} for r in rows],
        }

    # Store policy comes straight from settings.py, never typed into the frontend.
    def get_shipping_returns(self, obj):
        return {
            'delivery_dhaka': settings.DELIVERY_CHARGE_DHAKA,
            'delivery_outside': settings.DELIVERY_CHARGE_OUTSIDE,
            'free_over': settings.FREE_DELIVERY_OVER,
            'return_days': settings.RETURN_WINDOW_DAYS,
        }

    def get_max_per_order(self, obj):
        return getattr(settings, 'MAX_QTY_PER_ITEM', 10)