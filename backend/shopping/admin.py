from django.contrib import admin, messages

from .models import (CartItem, Order, OrderEvent, OrderItem, PaymentEvent, PaymentSubmission,
                     WishlistItem)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['variant', 'product_name', 'size', 'color', 'unit_price', 'quantity']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class PaymentSubmissionInline(admin.TabularInline):
    """Summary on the order page. Open a row (pencil link) to verify or reject it."""
    model = PaymentSubmission
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ['provider', 'sender_number', 'trx_id', 'amount_sent', 'expected_amount', 'status', 'created_at']
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    verbose_name_plural = 'Order status history'
    readonly_fields = ['status', 'note', 'by', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class PaymentEventInline(admin.TabularInline):
    model = PaymentEvent
    extra = 0
    verbose_name_plural = 'Payment status history'
    readonly_fields = ['status', 'note', 'by', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


def _status_action(status, label):
    def action(modeladmin, request, queryset):
        done = skipped = 0
        for order in queryset:
            if Order.transition_allowed(order.status, status):
                order.set_status(status, 'Updated by HEEM team', by=request.user)
                done += 1
            else:
                skipped += 1
        text = f'{done} order(s) marked {label}.'
        if skipped:
            text += f' {skipped} skipped: not allowed from their current status.'
        modeladmin.message_user(request, text, messages.SUCCESS if done else messages.WARNING)
    action.short_description = f'Mark as {label}'
    action.__name__ = f'mark_{status}'
    return action


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    date_hierarchy = 'created_at'
    list_display = ('number', 'user', 'created_at', 'payment_method', 'payment_status', 'status', 'is_gift', 'total')
    list_filter = ('status', 'payment_status', 'payment_method', 'is_gift', 'created_at')
    search_fields = ('number', 'user__email', 'recipient_name', 'phone', 'buyer_name', 'buyer_phone',
                     'payments__trx_id', 'tracking_code')
    list_select_related = ('user',)
    inlines = [OrderItemInline, PaymentSubmissionInline, OrderEventInline, PaymentEventInline]

    fieldsets = (
        (None, {'fields': ('number', 'user', 'status', 'courier', 'tracking_code')}),
        ('Payment (changed only through Payments review or the actions above)',
         {'fields': ('payment_method', 'payment_status', 'paid_at')}),
        ('Buyer', {'fields': ('buyer_name', 'buyer_phone', 'note')}),
        ('Delivery address (snapshot)', {'fields': (
            'is_gift', 'gift_message', 'recipient_name', 'phone', 'country', 'division', 'district',
            'upazila', 'area', 'street', 'landmark', 'postal_code')}),
        ('Amounts (snapshot)', {'fields': ('subtotal', 'delivery_charge', 'discount', 'total')}),
        ('System', {'classes': ('collapse',), 'fields': ('created_at', 'updated_at', 'idempotency_key')}),
    )
    # Staff may change only: status, courier, tracking code. Everything else is a historical record.
    readonly_fields = (
        'number', 'user', 'payment_method', 'payment_status', 'paid_at', 'buyer_name', 'buyer_phone', 'note',
        'is_gift', 'gift_message', 'recipient_name', 'phone', 'country', 'division', 'district', 'upazila',
        'area', 'street', 'landmark', 'postal_code', 'subtotal', 'delivery_charge', 'discount', 'total',
        'created_at', 'updated_at', 'idempotency_key')

    actions = [
        _status_action('processing', 'Processing'),
        _status_action('packed', 'Packed'),
        _status_action('shipped', 'Shipped'),
        _status_action('in_transit', 'In transit'),
        _status_action('out_for_delivery', 'Out for delivery'),
        _status_action('delivered', 'Delivered'),
        'cod_collected',
        'refund_done',
    ]

    def save_model(self, request, obj, form, change):
        """A status change in the form goes through set_status: history row, restock and refund follow-up."""
        if change and 'status' in form.changed_data:
            old = Order.objects.get(pk=obj.pk).status
            new = obj.status
            obj.status = old
            super().save_model(request, obj, form, change)  # courier / tracking edits are saved either way
            if Order.transition_allowed(old, new):
                obj.set_status(new, 'Updated by HEEM team', by=request.user)
            else:
                messages.error(request, f'An order cannot move from "{old}" to "{new}". The status was not changed.')
            return
        super().save_model(request, obj, form, change)

    @admin.action(description='Cash on Delivery: record that the cash was collected')
    def cod_collected(self, request, queryset):
        done = 0
        for order in queryset.filter(payment_method='cod', payment_status='cod_pending', status='delivered'):
            order.mark_payment('paid', 'Cash collected on delivery.', by=request.user)
            done += 1
        self.message_user(
            request,
            f'{done} order(s) marked paid. Only delivered Cash on Delivery orders that are still unpaid are changed.',
            messages.SUCCESS if done else messages.WARNING)

    @admin.action(description='Refund: record that the refund was paid')
    def refund_done(self, request, queryset):
        done = 0
        for order in queryset.filter(payment_status='refund_pending'):
            order.mark_payment('refunded', 'Your refund has been sent.', by=request.user)
            done += 1
        self.message_user(request, f'{done} order(s) marked refunded.', messages.SUCCESS if done else messages.WARNING)


@admin.register(PaymentSubmission)
class PaymentSubmissionAdmin(admin.ModelAdmin):
    """The place where staff verify mobile payments after checking the real bKash / Nagad / Rocket account."""
    date_hierarchy = 'created_at'
    list_display = ('created_at', 'order', 'provider', 'sender_number', 'trx_id', 'amount_sent',
                    'expected_amount', 'amount_ok', 'status')
    list_filter = ('status', 'provider', 'created_at')
    search_fields = ('trx_id', 'sender_number', 'order__number', 'order__user__email')
    list_select_related = ('order',)
    fields = ('order', 'provider', 'sender_number', 'trx_id', 'amount_sent', 'expected_amount', 'amount_ok',
              'note', 'status', 'review_note', 'reviewed_by', 'reviewed_at', 'created_at')
    readonly_fields = ('order', 'provider', 'sender_number', 'trx_id', 'amount_sent', 'expected_amount',
                       'amount_ok', 'note', 'reviewed_by', 'reviewed_at', 'created_at')
    actions = ['verify_selected']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        # Guard rail: once a payment is verified or rejected it is final. Changing it back would leave the order's
        # payment status out of step with this record. A mistake is handled by contacting the customer instead.
        ro = super().get_readonly_fields(request, obj)
        if obj is not None and obj.status != 'submitted':
            ro = tuple(ro) + ('status', 'review_note')
        return ro

    @admin.display(boolean=True, description='Amount matches')
    def amount_ok(self, obj):
        return obj.amount_matches

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and 'status' in form.changed_data and obj.status in ('verified', 'rejected'):
            obj.apply_review(request.user)

    @admin.action(description='Verify selected payments (only when the amount matches the order total)')
    def verify_selected(self, request, queryset):
        done = skipped = 0
        for sub in queryset.select_related('order'):
            if sub.status != 'submitted' or not sub.amount_matches or sub.order.status in Order.TERMINAL:
                skipped += 1
                continue
            sub.status = 'verified'
            sub.save(update_fields=['status'])
            sub.apply_review(request.user)
            done += 1
        text = f'{done} payment(s) verified.'
        if skipped:
            text += (f' {skipped} skipped (already reviewed, cancelled order, or the amount differs: '
                     'open them one by one to review).')
        self.message_user(request, text, messages.SUCCESS if done else messages.WARNING)


admin.site.register(WishlistItem)
admin.site.register(CartItem)