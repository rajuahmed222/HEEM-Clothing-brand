from django.contrib import admin, messages
from django.db.models import Sum

from shop.models import Product

from .dashboard import LOW_STOCK, dashboard_context
from .models import ContactMessage, ReturnRequest


# ---- Admin home page: attention counters + sales ----
admin.site.index_template = 'admin/heem_index.html'
_original_index = admin.site.index


def _index(request, extra_context=None):
    ctx = dict(extra_context or {})
    ctx.update(dashboard_context())
    return _original_index(request, extra_context=ctx)


admin.site.index = _index
admin.site.site_header = 'HEEM admin'
admin.site.site_title = 'HEEM admin'
admin.site.index_title = 'Store overview'


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'status', 'inquiry_type', 'name', 'email', 'subject', 'order_number')
    list_editable = ('status',)
    list_filter = ('status', 'inquiry_type')
    search_fields = ('name', 'email', 'subject', 'order_number', 'message')
    readonly_fields = ('name', 'email', 'inquiry_type', 'order_number', 'subject', 'message', 'created_at')


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'status', 'request_type', 'order', 'item', 'reason', 'replacement_size')
    list_filter = ('status', 'request_type', 'reason')
    search_fields = ('order__number', 'item__product_name', 'user__email')
    readonly_fields = ('user', 'order', 'item', 'request_type', 'reason', 'replacement_size', 'details', 'image',
                       'created_at', 'updated_at')
    fields = ('status', 'staff_note', 'user', 'order', 'item', 'request_type', 'reason', 'replacement_size',
              'details', 'image', 'created_at', 'updated_at')


# ---- Product list upgrade: total stock, bulk actions. Keeps the inlines you already have. ----
def _upgrade_product_admin():
    try:
        base = type(admin.site._registry[Product])
    except KeyError:  # shop.admin did not register Product: nothing to upgrade
        return
    admin.site.unregister(Product)

    class HeemProductAdmin(base):
        list_display = ('name', 'category', 'collection', 'price', 'stock_total', 'is_signature', 'is_new', 'is_active')
        list_editable = ('is_active',)
        list_per_page = 40
        actions = ['make_active', 'make_inactive', 'make_new', 'clear_new', 'make_signature', 'clear_signature']

        def get_queryset(self, request):
            return super().get_queryset(request).annotate(_stock=Sum('variants__stock'))

        @admin.display(description='In stock', ordering='_stock')
        def stock_total(self, obj):
            n = obj._stock or 0
            if n == 0:
                return 'Sold out'
            return f'{n} (low)' if n <= LOW_STOCK else n

        def _flag(self, request, queryset, **values):
            n = queryset.update(**values)
            self.message_user(request, f'{n} product(s) updated.', messages.SUCCESS)

        @admin.action(description='Show on the website (active)')
        def make_active(self, request, queryset): self._flag(request, queryset, is_active=True)

        @admin.action(description='Hide from the website (inactive)')
        def make_inactive(self, request, queryset): self._flag(request, queryset, is_active=False)

        @admin.action(description='Mark as New')
        def make_new(self, request, queryset): self._flag(request, queryset, is_new=True)

        @admin.action(description='Remove the New mark')
        def clear_new(self, request, queryset): self._flag(request, queryset, is_new=False)

        @admin.action(description='Add to HEEM Signature')
        def make_signature(self, request, queryset): self._flag(request, queryset, is_signature=True)

        @admin.action(description='Remove from HEEM Signature')
        def clear_signature(self, request, queryset): self._flag(request, queryset, is_signature=False)

    admin.site.register(Product, HeemProductAdmin)


_upgrade_product_admin()