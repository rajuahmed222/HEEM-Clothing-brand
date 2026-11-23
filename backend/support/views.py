from django.db import IntegrityError, transaction
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from shop.models import ProductVariant
from shopping import rules
from shopping.models import Order

from .models import ACTIVE_RETURN_STATUSES, ContactMessage, ContactSettings, ReturnRequest
from .serializers import (ContactMessageSerializer, ReturnCreateSerializer, ReturnRequestSerializer,
                          public_contact_payload)


class ContactView(APIView):
    """POST /api/contact/  (public). Spam protection: a hidden `website` field that humans never fill, plus a rate limit."""
    authentication_classes = []  # a stale login token must never block a public form
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def post(self, request):
        if request.data.get('website'):  # a bot filled the hidden field: pretend it worked, store nothing
            return Response({'detail': 'Thank you. Your message has been sent.'}, status=201)
        s = ContactMessageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save()
        return Response({'detail': 'Thank you. Your message has been sent.'}, status=201)


def exchange_sizes(item):
    """Sizes the customer may swap to: same product and colour, in stock, not the size they already have."""
    if not item.variant_id:
        return []
    qs = ProductVariant.objects.filter(product_id=item.variant.product_id, stock__gt=0).exclude(size=item.size)
    if item.color:
        qs = qs.filter(color=item.color)
    return sorted({s for s in qs.values_list('size', flat=True) if s})


class ReturnEligibleView(APIView):
    """GET /api/returns/eligible/  The signed-in customer's own orders that can still be returned, with their items."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items__variant', 'events')[:50]
        open_items = set(ReturnRequest.objects.filter(user=request.user, status__in=ACTIVE_RETURN_STATUSES)
                         .values_list('item_id', flat=True))
        out = []
        for o in orders:
            if not rules.can_return(o):
                continue
            out.append({
                'number': o.number,
                'created_at': o.created_at,
                'items': [{
                    'id': i.id, 'product_name': i.product_name, 'size': i.size, 'color': i.color,
                    'quantity': i.quantity, 'has_open_request': i.id in open_items,
                    'exchange_sizes': exchange_sizes(i),
                } for i in o.items.all()],
            })
        return Response(out)


class ReturnRequestView(APIView):
    """GET  /api/returns/  my requests.   POST /api/returns/  ask to return or exchange one item (multipart, optional photo)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_throttles(self):
        if self.request.method == 'POST':
            t = ScopedRateThrottle()
            self.throttle_scope = 'returns'
            return [t]
        return []

    def get(self, request):
        qs = ReturnRequest.objects.filter(user=request.user).select_related('order', 'item')
        return Response(ReturnRequestSerializer(qs, many=True).data)

    def post(self, request):
        s = ReturnCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data

        # Everything below is checked on the server; nothing the browser says about ownership or eligibility is trusted.
        order = (Order.objects.filter(user=request.user, number=d['order_number'].strip().upper())
                 .prefetch_related('events').first())
        if not order:
            return Response({'detail': 'Order not found.'}, status=404)
        if not rules.can_return(order):
            return Response({'detail': 'This order is not eligible for a return or exchange.'}, status=400)
        item = order.items.select_related('variant').filter(pk=d['item_id']).first()
        if not item:
            return Response({'item_id': ['This item is not part of that order.']}, status=400)

        size = (d.get('replacement_size') or '').strip().upper()
        if d['request_type'] == 'exchange':
            if not size:
                return Response({'replacement_size': ['Choose the size you would like instead.']}, status=400)
            if size not in exchange_sizes(item):
                return Response({'replacement_size': ['That size is not available for this item right now.']}, status=400)
        else:
            size = ''

        try:
            with transaction.atomic():
                if ReturnRequest.objects.select_for_update().filter(item=item, status__in=ACTIVE_RETURN_STATUSES).exists():
                    return Response({'detail': 'There is already an open request for this item.'}, status=409)
                rr = ReturnRequest.objects.create(
                    user=request.user, order=order, item=item, request_type=d['request_type'], reason=d['reason'],
                    replacement_size=size, details=(d.get('details') or '').strip(), image=d.get('image') or '')
        except IntegrityError:
            return Response({'detail': 'There is already an open request for this item.'}, status=409)
        return Response(ReturnRequestSerializer(rr).data, status=201)


class ContactSettingsPublicView(APIView):
    """GET /api/contact-settings/ (public). Only what the admin has switched on."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(public_contact_payload(ContactSettings.load()))