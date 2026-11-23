import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from shop.models import Product, ProductVariant

# No 0/O/1/I so an order number read out over the phone is never ambiguous
NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


class WishlistItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart_items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'variant')
        ordering = ['-created_at']


class Order(models.Model):
    STATUSES = [
        ('placed', 'Order Placed'), ('confirmed', 'Confirmed'), ('processing', 'Processing'),
        ('packed', 'Packed'), ('shipped', 'Shipped'), ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'), ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'), ('return_requested', 'Return Requested'), ('returned', 'Returned'),
    ]
    # statuses that make up the normal delivery timeline, in order
    FLOW = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered']
    # steps a shop may skip: shown to the customer only once they have really happened
    OPTIONAL_STEPS = {'confirmed', 'in_transit'}
    TERMINAL = {'cancelled', 'returned'}

    PAYMENT_STATUSES = [
        ('pending', 'Pending'), ('pending_verification', 'Pending Verification'), ('paid', 'Paid'),
        ('failed', 'Failed'), ('cod_pending', 'Cash on Delivery - Due'),
        ('refund_pending', 'Refund Pending'), ('refunded', 'Refunded'),
    ]
    PAYMENT_METHODS = [('cod', 'Cash on Delivery'), ('bkash', 'bKash'), ('nagad', 'Nagad'), ('rocket', 'Rocket')]

    # null for a guest order (no HEEM account). Such an order is reached through `track_token`, or by order number + email.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders', null=True, blank=True)
    guest_email = models.EmailField(blank=True, db_index=True)
    # long random secret in the guest's tracking link; orders are never reachable by their (guessable) number alone
    track_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    number = models.CharField(max_length=20, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='placed')
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, default='cod')
    payment_status = models.CharField(max_length=24, choices=PAYMENT_STATUSES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)

    # who placed (and pays for) the order. For a gift this differs from the delivery recipient below.
    buyer_name = models.CharField(max_length=120, blank=True)
    buyer_phone = models.CharField(max_length=20, blank=True)
    is_gift = models.BooleanField(default=False)
    gift_message = models.CharField(max_length=300, blank=True)

    # snapshot of the DELIVERY address (the buyer's, or the gift recipient's). Later address edits never change old orders.
    recipient_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    country = models.CharField(max_length=80)
    division = models.CharField(max_length=80)
    district = models.CharField(max_length=80)
    upazila = models.CharField(max_length=80, blank=True)
    area = models.CharField(max_length=120, blank=True)
    street = models.CharField(max_length=255)
    landmark = models.CharField(max_length=160, blank=True)
    postal_code = models.CharField(max_length=12, blank=True)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    note = models.CharField(max_length=300, blank=True)
    tracking_code = models.CharField(max_length=80, blank=True, help_text='Courier tracking code, filled by staff')
    courier = models.CharField(max_length=80, blank=True)
    # sent by the checkout page so a double click / retry can never create a second order
    idempotency_key = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'idempotency_key'], name='uniq_order_user_idempotency'),
            # guests have no user, and NULLs never clash in a unique index, so guest retries need their own rule
            models.UniqueConstraint(fields=['idempotency_key'], condition=models.Q(user__isnull=True),
                                    name='uniq_guest_order_idempotency'),
        ]

    @staticmethod
    def _new_number():
        day = timezone.localdate().strftime('%Y%m%d')
        for _ in range(25):
            number = f'HEEM-{day}-' + ''.join(secrets.choice(NUMBER_ALPHABET) for _ in range(4))
            if not Order.objects.filter(number=number).exists():
                return number
        raise RuntimeError('Could not generate a unique order number.')

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._new_number()  # the unique DB constraint is the final guard
        super().save(*args, **kwargs)

    @property
    def customer_email(self):
        return self.user.email if self.user_id else self.guest_email

    @staticmethod
    def new_track_token():
        return secrets.token_urlsafe(32)

    @property
    def address_summary(self):
        parts = [self.street, self.area, self.upazila, self.district, self.division]
        return ', '.join(p for p in parts if p)

    @classmethod
    def transition_allowed(cls, old, new):
        """Which status changes staff may make. Cancelled/returned are final."""
        if new == old or old in cls.TERMINAL:
            return False
        if old in cls.FLOW and new in cls.FLOW:
            return cls.FLOW.index(new) > cls.FLOW.index(old)
        if new == 'cancelled':
            return old in ('placed', 'confirmed', 'processing', 'packed')  # not once it has left the shop
        if new == 'return_requested':
            return old == 'delivered'
        if new == 'returned':
            return old in ('delivered', 'return_requested')
        return False

    def set_status(self, status, note='', by=None):
        """Always change order status through here: timeline row, restock and payment follow-up stay consistent."""
        with transaction.atomic():
            old = self.status
            self.status = status
            self.save(update_fields=['status', 'updated_at'])
            OrderEvent.objects.create(order=self, status=status, note=note, by=by)
            if status in self.TERMINAL and old not in self.TERMINAL:
                self.restock()
                if self.payment_status in ('paid', 'pending_verification'):
                    msg = ('Order cancelled. We will review your payment and refund any amount received.'
                           if status == 'cancelled' else 'Return received. Your refund is being processed.')
                    self.mark_payment('refund_pending', msg, by)
        from . import notify  # local import: notify imports this module
        notify.status_changed_after_commit(self, status, note)

    def mark_payment(self, status, note='', by=None):
        """Always change payment status through here, so every change is written to the payment history."""
        if self.payment_status == status:
            return
        self.payment_status = status
        fields = ['payment_status', 'updated_at']
        if status == 'paid':
            self.paid_at = timezone.now()
            fields.append('paid_at')
        self.save(update_fields=fields)
        event = PaymentEvent.objects.create(order=self, status=status, note=note, by=by)
        from . import notify
        notify.payment_changed_after_commit(self, status, note, event.pk)

    def restock(self):
        for item in self.items.select_related('variant'):
            if item.variant_id:
                ProductVariant.objects.filter(pk=item.variant_id).update(stock=models.F('stock') + item.quantity)

    def __str__(self):
        return self.number or f'Order {self.pk}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, null=True, on_delete=models.SET_NULL, related_name='order_items')
    product_name = models.CharField(max_length=160)
    product_slug = models.SlugField(blank=True)
    thumbnail = models.CharField(max_length=300, blank=True)
    size = models.CharField(max_length=10, blank=True)
    color = models.CharField(max_length=40, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class OrderEvent(models.Model):
    """One row per status change = the delivery timeline shown to the customer."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='events')
    status = models.CharField(max_length=20, choices=Order.STATUSES)
    note = models.CharField(max_length=300, blank=True)
    by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']


class PaymentEvent(models.Model):
    """One row per payment status change. `note` is shown to the customer, so keep it customer-safe."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payment_events')
    status = models.CharField(max_length=24, choices=Order.PAYMENT_STATUSES)
    note = models.CharField(max_length=300, blank=True)
    by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']


class PaymentSubmission(models.Model):
    """What the customer typed after sending money by bKash / Nagad / Rocket. Never proof of payment by itself."""
    PROVIDERS = [('bkash', 'bKash'), ('nagad', 'Nagad'), ('rocket', 'Rocket')]
    STATUSES = [('submitted', 'Awaiting review'), ('verified', 'Verified'), ('rejected', 'Rejected')]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    provider = models.CharField(max_length=10, choices=PROVIDERS)
    sender_number = models.CharField(max_length=20)
    trx_id = models.CharField('TrxID', max_length=40)
    amount_sent = models.DecimalField(max_digits=10, decimal_places=2)
    expected_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text='Order total when it was submitted')
    note = models.CharField('customer note', max_length=200, blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default='submitted')
    review_note = models.CharField(
        max_length=200, blank=True,
        help_text='Required to reject (the customer sees this reason) and to verify an amount that differs from the order total.')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        constraints = [
            # one real payment cannot be claimed by two orders
            models.UniqueConstraint(
                fields=['provider', 'trx_id'], condition=models.Q(status__in=['submitted', 'verified']),
                name='uniq_active_trx_per_provider'),
        ]

    @property
    def amount_matches(self):
        return self.amount_sent == self.expected_amount

    def save(self, *args, **kwargs):
        self.trx_id = self.trx_id.strip().upper()
        self.sender_number = self.sender_number.strip()
        super().save(*args, **kwargs)

    def clean(self):
        if self.status == 'rejected' and not self.review_note.strip():
            raise ValidationError({'review_note': 'Give the customer a reason for rejecting this payment.'})
        if self.status == 'verified' and not self.amount_matches and not self.review_note.strip():
            raise ValidationError({'review_note': 'The amount sent differs from the order total. Explain why you are verifying it.'})

    def apply_review(self, by):
        """Call after status was set to verified/rejected. Moves the ORDER's payment status through the audited path."""
        order = self.order
        self.reviewed_by, self.reviewed_at = by, timezone.now()
        self.save(update_fields=['reviewed_by', 'reviewed_at'])
        if self.status == 'verified':
            if order.status in Order.TERMINAL:
                order.mark_payment('refund_pending', 'Payment received after the order was cancelled. We will refund it.', by)
                return
            order.mark_payment('paid', 'Payment verified.', by)
            if order.status == 'placed':
                order.set_status('confirmed', 'Payment verified.', by)
        elif self.status == 'rejected':
            order.mark_payment('failed', self.review_note, by)

    def __str__(self):
        return f'{self.get_provider_display()} {self.trx_id} for {self.order}'

class Invoice(models.Model):
    """One invoice per order, created the first time it is needed (delivery email or a download).
    The PDF itself is drawn from the order each time, so the numbers always match the order record."""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    number = models.CharField(max_length=24, unique=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issued_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.number:  # INV-2026-000042: the year, then the invoice's own id (never reused)
            self.number = f'INV-{self.issued_at.year}-{self.pk:06d}'
            super().save(update_fields=['number'])

    def __str__(self):
        return self.number