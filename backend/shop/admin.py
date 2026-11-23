from django.contrib import admin
from .models import Category, Collection, Product, ProductImage, ProductVariant, SearchLog, SizeChart, SizeChartRow


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 2
    fields = ('image', 'color', 'order', 'alt')


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 4


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'slug')
    list_filter = ('parent',)


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'collection', 'season', 'price', 'is_signature', 'is_new', 'is_active')
    list_filter = ('category', 'collection', 'season', 'is_signature', 'is_new', 'is_active')
    search_fields = ('name', 'tags', 'sku')
    inlines = [ProductImageInline, ProductVariantInline]


class SizeChartRowInline(admin.TabularInline):
    model = SizeChartRow
    extra = 6


@admin.register(SizeChart)
class SizeChartAdmin(admin.ModelAdmin):
    list_display = ('category', 'title', 'unit')
    inlines = [SizeChartRowInline]


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ('query', 'results', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('query',)