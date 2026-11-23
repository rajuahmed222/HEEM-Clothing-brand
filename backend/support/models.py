from django.conf import settings
from django.db import models
from django.db.models import Q

from shopping.models import Order, OrderItem


class ContactMessage(models.Model):
    """A message sent from the Contact page. Staff read and answer it in the admin."""
    INQUIRY_TYPES = [
        ('order', 'My order'), ('delivery', 'Delivery'), ('return', 'Returns & exchange'),
        ('product', 'Product or sizing'), ('payment', 'Payment'), ('other', 'Something else'),
    ]
    STATUSES = [('new', 'New'), ('replied', 'Replied'), ('closed', 'Closed')]

    name = models.CharField(max_length=120)
    email = models.EmailField()
    inquiry_type = models.CharField(max_length=12, choices=INQUIRY_TYPES, default='other')
    order_number = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=160)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUSES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.subject} ({self.email})'


ACTIVE_RETURN_STATUSES = ['submitted', 'reviewing', 'approved']


class ReturnRequest(models.Model):
    """A customer's request to return or exchange ONE item of a delivered order.
    It never changes the order or payment status by itself: staff decide, then use the normal order workflow."""
    TYPES = [('return', 'Return'), ('exchange', 'Exchange')]
    REASONS = [
        ('wrong_size', 'Wrong size'), ('damaged', 'Damaged item'), ('incorrect', 'Incorrect item received'),
        ('not_as_described', 'Not as described'), ('changed_mind', 'Changed my mind'), ('other', 'Other'),
    ]
    STATUSES = [
        ('submitted', 'Submitted'), ('reviewing', 'Under review'), ('approved', 'Approved'),
        ('rejected', 'Rejected'), ('completed', 'Completed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='return_requests')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='return_requests')
    request_type = models.CharField(max_length=10, choices=TYPES)
    reason = models.CharField(max_length=20, choices=REASONS)
    replacement_size = models.CharField(max_length=10, blank=True)
    details = models.TextField(blank=True)
    image = models.ImageField(upload_to='returns/', blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default='submitted')
    staff_note = models.CharField(max_length=300, blank=True, help_text='The customer sees this note on the returns page.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            # one open request per item, so a double click or a second try cannot create a duplicate
            models.UniqueConstraint(fields=['item'], condition=Q(status__in=ACTIVE_RETURN_STATUSES),
                                    name='uniq_open_return_per_item'),
        ]

    def __str__(self):
        return f'{self.get_request_type_display()} / {self.order.number} / {self.item.product_name}'


def default_open_days():
    return [0, 1, 2, 3, 4, 5, 6]


class ContactSettings(models.Model):
    """The store's contact details and support availability. There is only ever ONE row (pk=1), edited by staff
    in the admin screens. Customers read the enabled parts through GET /api/contact-settings/."""
    # Phone call
    phone = models.CharField(max_length=20, blank=True, help_text='Stored as +8801712345678')
    call_enabled = models.BooleanField(default=False)
    # WhatsApp
    whatsapp = models.CharField(max_length=20, blank=True, help_text='Stored as +8801712345678')
    whatsapp_enabled = models.BooleanField(default=False)
    floating_whatsapp = models.BooleanField(default=False, help_text='Show the round WhatsApp button on every page')
    whatsapp_message = models.CharField(
        max_length=300, default='Hello HEEM, I need assistance regarding your products.',
        help_text='The message that is already typed when a customer opens WhatsApp')
    # Other
    email = models.EmailField(blank=True, help_text='Support email shown on the Contact page')
    # Availability
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    open_days = models.JSONField(default=default_open_days, help_text='0 = Monday ... 6 = Sunday')
    hours_note = models.CharField(max_length=200, blank=True, help_text='Optional. Shown instead of the generated hours text.')
    after_hours_message = models.CharField(max_length=300, blank=True)
    support_paused = models.BooleanField(default=False, help_text='Turn on to show "currently closed" regardless of the schedule')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'contact settings'
        verbose_name_plural = 'contact settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # a single settings row, always
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # never delete the settings row
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Contact settings'