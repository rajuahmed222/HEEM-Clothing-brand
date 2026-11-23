from django.db import models
from django.utils.text import slugify

SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

# Optional measurement columns of a size chart. A column is shown only if at least one row fills it.
SIZE_COLUMNS = [
    ('chest', 'Chest'), ('waist', 'Waist'), ('hip', 'Hip'),
    ('shoulder', 'Shoulder'), ('sleeve', 'Sleeve'), ('length', 'Length'),
]


class Category(models.Model):
    STATUSES = [
        ('auto', 'Automatic: live when it has products, otherwise coming soon'),
        ('active', 'Active: always show its products'),
        ('coming_soon', 'Coming soon: show the Coming Soon page'),
        ('hidden', 'Hidden: not in the menu'),
    ]

    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True, blank=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.CASCADE, related_name='children',
    )
    status = models.CharField(max_length=12, choices=STATUSES, default='auto')
    # Menu layout: the column heading this item sits under (Clothing, Featured, Accessories...) and its order
    group = models.CharField(max_length=60, blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = f'{self.parent.name} {self.name}' if self.parent else self.name
            self.slug = slugify(base)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.parent.name} / {self.name}' if self.parent else self.name


class Collection(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True, blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    SEASONS = [
        ('spring', 'Spring'), ('summer', 'Summer'), ('autumn', 'Autumn'),
        ('winter', 'Winter'), ('all', 'All season'),
    ]

    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text='Price in BDT (৳)')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    # Extra places this product also appears (e.g. Men > Panjabi plus Men > Featured > New Arrivals)
    placements = models.ManyToManyField(Category, blank=True, related_name='placed_products')
    collection = models.ForeignKey(Collection, null=True, blank=True, on_delete=models.SET_NULL, related_name='products')
    season = models.CharField(max_length=10, choices=SEASONS, default='all')
    tags = models.CharField(max_length=200, blank=True, default='', help_text='Comma separated, e.g. oversized, linen, relaxed')
    is_signature = models.BooleanField(default=False, help_text='Show in HEEM Signature')
    is_new = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ---- Product details page (all optional: an empty field is simply not shown) ----
    short_description = models.CharField(max_length=240, blank=True)
    compare_at_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Original price in BDT. Fill ONLY for a real discount; it is ignored unless higher than the price.')
    sku = models.CharField('product code', max_length=40, blank=True)
    fabric = models.CharField(max_length=200, blank=True, help_text='e.g. 100% organic cotton')
    fit = models.CharField(max_length=80, blank=True, help_text='e.g. Relaxed, Slim, Oversized')
    model_height = models.CharField(max_length=40, blank=True, help_text="e.g. 6'0\" or 183 cm")
    model_wears = models.CharField(max_length=10, blank=True, help_text='Size the model is wearing, e.g. M')
    care = models.TextField(blank=True, help_text='One care instruction per line')

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['is_active', 'price'])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug, n = base, 2
            while Product.objects.filter(slug=slug).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    size = models.CharField(max_length=10, blank=True, help_text='XS, S, M, L, XL, XXL (blank for accessories)')
    color = models.CharField(max_length=40, blank=True, help_text='Black, Beige, Navy ...')
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=40, blank=True, help_text='Optional. Shown instead of the product code when set.')

    class Meta:
        unique_together = ('product', 'size', 'color')

    def save(self, *args, **kwargs):
        self.size = self.size.strip().upper()
        self.color = self.color.strip().title()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.product.name} / {self.color} / {self.size}'


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt = models.CharField(max_length=160, blank=True)
    order = models.PositiveSmallIntegerField(default=0, help_text='0 = main image, 1 = image shown on hover')
    color = models.CharField(
        max_length=40, blank=True,
        help_text='Colour this photo shows (same spelling as the variant colour). Leave blank for a photo shared by all colours.')

    class Meta:
        ordering = ['order', 'id']

    def save(self, *args, **kwargs):
        self.color = self.color.strip().title()  # same normalisation as ProductVariant.color
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.product.name} ({self.order})'


class SizeChart(models.Model):
    """One chart per category. Sub-categories without their own chart use their parent's."""
    category = models.OneToOneField(Category, on_delete=models.CASCADE, related_name='size_chart')
    title = models.CharField(max_length=80, default='Size guide')
    unit = models.CharField(max_length=10, default='in', help_text='in or cm')
    note = models.CharField(max_length=240, blank=True, help_text='e.g. Measurements are of the garment, not the body.')

    def __str__(self):
        return f'Size chart: {self.category}'


class SizeChartRow(models.Model):
    chart = models.ForeignKey(SizeChart, on_delete=models.CASCADE, related_name='rows')
    size = models.CharField(max_length=10)
    chest = models.CharField(max_length=20, blank=True)
    waist = models.CharField(max_length=20, blank=True)
    hip = models.CharField(max_length=20, blank=True)
    shoulder = models.CharField(max_length=20, blank=True)
    sleeve = models.CharField(max_length=20, blank=True)
    length = models.CharField(max_length=20, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def save(self, *args, **kwargs):
        self.size = self.size.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.chart.category} / {self.size}'


class SearchLog(models.Model):
    query = models.CharField(max_length=200)
    results = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.query} ({self.results})'

class SiteMedia(models.Model):
    """A picture or video for a fixed place on the website (see shop/sitemedia.py). One row per place.
    Menu and search tiles can also point at a product (link + photo come from it), and can carry their own
    caption and link, which win over the product's."""
    key = models.SlugField(max_length=60, unique=True)
    file = models.FileField(upload_to='site/', blank=True)
    kind = models.CharField(max_length=5, default='image')  # image | video
    product = models.ForeignKey('Product', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    label = models.CharField(max_length=80, blank=True)   # own caption for a menu/search tile
    link = models.CharField(max_length=200, blank=True)   # own link for a menu/search tile (/men, /product/..., https://...)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key