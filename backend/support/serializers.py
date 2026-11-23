import re
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .contactlogic import clean_days, hours_label, is_open, normalize_phone
from .models import ContactMessage, ContactSettings, ReturnRequest

ORDER_NUMBER = re.compile(r'^[A-Za-z0-9-]{0,20}$')
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}


class ContactMessageSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=120)
    subject = serializers.CharField(max_length=160)
    message = serializers.CharField(min_length=10, max_length=3000)
    order_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'inquiry_type', 'order_number', 'subject', 'message']

    def validate_order_number(self, value):
        value = value.strip()
        if not ORDER_NUMBER.match(value):
            raise serializers.ValidationError('Use the order number exactly as it appears in your order email or account.')
        return value.upper()


class ReturnCreateSerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=20)
    item_id = serializers.IntegerField()
    request_type = serializers.ChoiceField(choices=ReturnRequest.TYPES)
    reason = serializers.ChoiceField(choices=ReturnRequest.REASONS)
    replacement_size = serializers.CharField(max_length=10, required=False, allow_blank=True)
    details = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)  # ImageField also checks it is a real image

    def validate_image(self, f):
        if f is None:
            return f
        if f.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError('The photo must be 5 MB or smaller.')
        if getattr(f, 'content_type', '') not in IMAGE_TYPES:
            raise serializers.ValidationError('Upload a JPG, PNG or WebP photo.')
        return f


class ReturnRequestSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.number', read_only=True)
    product_name = serializers.CharField(source='item.product_name', read_only=True)
    size = serializers.CharField(source='item.size', read_only=True)
    color = serializers.CharField(source='item.color', read_only=True)
    request_type_label = serializers.CharField(source='get_request_type_display', read_only=True)
    reason_label = serializers.CharField(source='get_reason_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ReturnRequest
        fields = ['id', 'order_number', 'product_name', 'size', 'color', 'request_type', 'request_type_label',
                  'reason', 'reason_label', 'replacement_size', 'details', 'status', 'status_label',
                  'staff_note', 'created_at']


def store_now():
    """The current time in the store's own timezone (default Dhaka), so opening hours mean what the admin typed."""
    return timezone.now().astimezone(ZoneInfo(getattr(settings, 'STORE_TIMEZONE', 'Asia/Dhaka')))


def open_state(cs):
    return is_open(store_now(), cs.open_days, cs.opening_time, cs.closing_time, cs.support_paused)


class ContactSettingsSerializer(serializers.ModelSerializer):
    """Used by the admin screen (read and update). Every number is checked and stored in +880... form."""
    open_days = serializers.ListField(child=serializers.IntegerField(), required=False)
    is_open = serializers.SerializerMethodField()
    hours_label = serializers.SerializerMethodField()

    class Meta:
        model = ContactSettings
        fields = ['phone', 'call_enabled', 'whatsapp', 'whatsapp_enabled', 'floating_whatsapp', 'whatsapp_message',
                  'email', 'opening_time', 'closing_time', 'open_days', 'hours_note', 'after_hours_message',
                  'support_paused', 'is_open', 'hours_label', 'updated_at']
        read_only_fields = ['updated_at']
        extra_kwargs = {
            'phone': {'required': False, 'allow_blank': True},
            'whatsapp': {'required': False, 'allow_blank': True},
            'email': {'required': False, 'allow_blank': True},
            'opening_time': {'required': False, 'allow_null': True},
            'closing_time': {'required': False, 'allow_null': True},
            'whatsapp_message': {'required': False, 'allow_blank': False},
        }

    def get_is_open(self, obj):
        return open_state(obj)

    def get_hours_label(self, obj):
        return hours_label(obj.open_days, obj.opening_time, obj.closing_time, obj.hours_note)

    def validate_phone(self, v):
        try:
            return normalize_phone(v)
        except ValueError as e:
            raise serializers.ValidationError(str(e))

    def validate_whatsapp(self, v):
        try:
            return normalize_phone(v, mobile_only=True)
        except ValueError as e:
            raise serializers.ValidationError(str(e))

    def validate_open_days(self, v):
        try:
            return clean_days(v)
        except ValueError as e:
            raise serializers.ValidationError(str(e))

    def validate_whatsapp_message(self, v):
        v = v.strip()
        if not v:
            raise serializers.ValidationError('Write the message customers will start the chat with.')
        return v

    def validate(self, attrs):
        def final(name):  # the value after this update (partial updates keep what is already saved)
            return attrs[name] if name in attrs else getattr(self.instance, name, None)

        errors = {}
        if final('call_enabled') and not final('phone'):
            errors['phone'] = 'Add a phone number before turning Phone Call on.'
        if final('whatsapp_enabled') and not final('whatsapp'):
            errors['whatsapp'] = 'Add a WhatsApp number before turning WhatsApp on.'
        if final('floating_whatsapp') and not final('whatsapp_enabled'):
            errors['floating_whatsapp'] = 'Turn WhatsApp support on to show the floating button.'
        o, c = final('opening_time'), final('closing_time')
        if (o is None) != (c is None):
            errors['closing_time'] = 'Set both the opening and the closing time, or leave both empty.'
        elif o is not None and o == c:
            errors['closing_time'] = 'Closing time must be different from the opening time.'
        if o is not None and not final('open_days'):
            errors['open_days'] = 'Choose at least one open day.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


def public_contact_payload(cs):
    """What customers may see. Anything switched off is simply absent, so the website cannot show it by mistake."""
    state = open_state(cs)
    call = bool(cs.call_enabled and cs.phone)
    wa = bool(cs.whatsapp_enabled and cs.whatsapp)
    return {
        'call_enabled': call,
        'phone': cs.phone if call else '',
        'whatsapp_enabled': wa,
        'whatsapp': cs.whatsapp.lstrip('+') if wa else '',          # digits only, as wa.me needs
        'whatsapp_message': cs.whatsapp_message if wa else '',
        'floating_whatsapp': bool(wa and cs.floating_whatsapp),
        'email': cs.email,
        'hours': hours_label(cs.open_days, cs.opening_time, cs.closing_time, cs.hours_note),
        'is_open': state,                                             # true / false / null (no schedule set)
        'after_hours_message': cs.after_hours_message if state is False else '',
        'support_paused': bool(cs.support_paused),
    }