"""Staff-only API for the HEEM admin screens (/admin in the React site).

Every view requires a signed-in user with is_staff. Order and payment changes go through the same model
methods the Django admin uses (set_status, mark_payment, apply_review), so the rules cannot be bypassed here.
"""
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status as http
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shop.categories import category_states
from shop.serializers import ProductSerializer as PublicProductSerializer
from shop.sitemedia import GROUPS, IMAGE_EXT, MAX_IMAGE, MAX_VIDEO, SLOTS, VIDEO_EXT
from shop.models import Category, Collection, Product, ProductImage, ProductVariant, SiteMedia
from shopping.models import Order, OrderItem, PaymentSubmission
from support.models import ContactMessage, ContactSettings, ReturnRequest
from support.serializers import ContactSettingsSerializer

from .serializers import (ContactMessageAdminSerializer, OrderDetailSerializer, OrderListSerializer, PaymentSerializer, ProductImageSerializer,
                          ProductListSerializer, ProductSerializer, clean_variants)

LOW_STOCK = 3
PAGE_SIZE = 25
MAX_PHOTOS_PER_REQUEST = 12


class StaffView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]


def paginate(request, qs, serializer, **ctx):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except ValueError:
        page = 1
    count = qs.count()
    rows = qs[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    return Response({
        'count': count, 'page': page, 'pages': max(1, -(-count // PAGE_SIZE)),
        'results': serializer(rows, many=True, context={'request': request, **ctx}).data,
    })


class MeView(StaffView):
    def get(self, request):
        return Response({'email': request.user.email, 'is_staff': True, 'is_superuser': request.user.is_superuser})


class DashboardView(StaffView):
    def get(self, request):
        now = timezone.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        live = Order.objects.exclude(status__in=Order.TERMINAL)
        active_variants = ProductVariant.objects.filter(product__is_active=True)

        def money(qs):
            return {'amount': qs.aggregate(t=Sum('total'))['t'] or 0, 'orders': qs.count()}

        attention = [
            {'key': 'new_orders', 'label': 'New orders to confirm', 'value': live.filter(status__in=['placed', 'confirmed']).count(), 'to': '/admin/orders?status=placed'},
            {'key': 'payments', 'label': 'Payments to verify', 'value': PaymentSubmission.objects.filter(status='submitted').count(), 'to': '/admin/payments'},
            {'key': 'cod', 'label': 'COD cash not yet recorded', 'value': Order.objects.filter(payment_method='cod', payment_status='cod_pending', status='delivered').count(), 'to': '/admin/orders?payment_status=cod_pending&status=delivered'},
            {'key': 'refunds', 'label': 'Refunds to pay', 'value': Order.objects.filter(payment_status='refund_pending').count(), 'to': '/admin/orders?payment_status=refund_pending'},
            {'key': 'returns', 'label': 'Open return requests', 'value': ReturnRequest.objects.filter(status__in=['submitted', 'reviewing']).count(), 'to': None},
            {'key': 'messages', 'label': 'Unanswered messages', 'value': ContactMessage.objects.filter(status='new').count(), 'to': '/admin/messages?status=new'},
            {'key': 'low', 'label': 'Low stock variants', 'value': active_variants.filter(stock__gt=0, stock__lte=LOW_STOCK).count(), 'to': '/admin/products?stock=low'},
            {'key': 'out', 'label': 'Sold-out variants', 'value': active_variants.filter(stock=0).count(), 'to': '/admin/products?stock=out'},
        ]
        paid = Order.objects.filter(payment_status='paid')
        labels = dict(Order.STATUSES)
        by_status = Order.objects.values('status').annotate(n=Count('id')).order_by('-n')
        low_rows = (active_variants.filter(stock__lte=LOW_STOCK).select_related('product')
                    .order_by('stock', 'product__name')[:8])
        return Response({
            'attention': attention,
            'sales': {
                'today': money(paid.filter(paid_at__gte=today)),
                'last_30_days': money(paid.filter(paid_at__gte=now - timedelta(days=30))),
                'orders_today': Order.objects.filter(created_at__gte=today).count(),
            },
            'by_status': [{'status': r['status'], 'label': labels.get(r['status'], r['status']), 'count': r['n']} for r in by_status],
            'low_stock': [{'product_id': v.product_id, 'product': v.product.name, 'size': v.size, 'color': v.color, 'stock': v.stock} for v in low_rows],
            'recent_orders': OrderListSerializer(
                Order.objects.select_related('user').annotate(item_count=Count('items'))[:8], many=True).data,
        })


# ------------------------------- Orders -------------------------------

class OrderListView(StaffView):
    def get(self, request):
        qs = Order.objects.select_related('user').annotate(item_count=Count('items', distinct=True))
        p = request.query_params
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('payment_status'):
            qs = qs.filter(payment_status=p['payment_status'])
        if p.get('payment_method'):
            qs = qs.filter(payment_method=p['payment_method'])
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(number__icontains=q) | Q(user__email__icontains=q) | Q(guest_email__icontains=q) | Q(recipient_name__icontains=q) |
                Q(phone__icontains=q) | Q(buyer_phone__icontains=q) | Q(tracking_code__icontains=q) |
                Q(payments__trx_id__icontains=q.upper())).distinct()
        return paginate(request, qs, OrderListSerializer)


class OrderDetailView(StaffView):
    def _order(self, pk):
        return Order.objects.select_related('user').prefetch_related(
            'items', 'events__by', 'payment_events__by', 'payments').get(pk=pk)

    def get(self, request, pk):
        try:
            order = self._order(pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        return Response(OrderDetailSerializer(order, context={'request': request}).data)

    def patch(self, request, pk):
        """Staff may edit only the courier and the tracking code. Everything else is a historical record."""
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        fields = []
        for key in ('courier', 'tracking_code'):
            if key in request.data:
                setattr(order, key, str(request.data[key]).strip()[:80])
                fields.append(key)
        if fields:
            order.save(update_fields=fields + ['updated_at'])
        return Response(OrderDetailSerializer(self._order(pk), context={'request': request}).data)


class OrderStatusView(StaffView):
    def post(self, request, pk):
        new = request.data.get('status')
        note = str(request.data.get('note', '')).strip()[:300] or 'Updated by HEEM team'
        if new not in dict(Order.STATUSES):
            raise ValidationError({'status': 'Unknown status.'})
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(pk=pk)
            except Order.DoesNotExist:
                return Response({'detail': 'Order not found.'}, status=404)
            if not Order.transition_allowed(order.status, new):
                raise ValidationError({'status': f'An order cannot move from "{order.status}" to "{new}".'})
            order.set_status(new, note, by=request.user)
        return Response(OrderDetailSerializer(OrderDetailView()._order(pk), context={'request': request}).data)


class OrderActionView(StaffView):
    """cod_collected: delivered Cash on Delivery order, cash received. refund_done: refund was paid out."""
    def post(self, request, pk):
        action = request.data.get('action')
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(pk=pk)
            except Order.DoesNotExist:
                return Response({'detail': 'Order not found.'}, status=404)
            if action == 'cod_collected':
                if not (order.payment_method == 'cod' and order.payment_status == 'cod_pending' and order.status == 'delivered'):
                    raise ValidationError({'action': 'Only a delivered Cash on Delivery order that is still unpaid can be marked paid.'})
                order.mark_payment('paid', 'Cash collected on delivery.', by=request.user)
            elif action == 'refund_done':
                if order.payment_status != 'refund_pending':
                    raise ValidationError({'action': 'This order has no refund waiting.'})
                order.mark_payment('refunded', 'Your refund has been sent.', by=request.user)
            else:
                raise ValidationError({'action': 'Unknown action.'})
        return Response(OrderDetailSerializer(OrderDetailView()._order(pk), context={'request': request}).data)


# ------------------------------- Payments -------------------------------

class PaymentListView(StaffView):
    def get(self, request):
        qs = PaymentSubmission.objects.select_related('order', 'order__user')
        st = request.query_params.get('status', 'submitted')
        if st != 'all':
            qs = qs.filter(status=st)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(trx_id__icontains=q.upper()) | Q(sender_number__icontains=q) | Q(order__number__icontains=q))
        return paginate(request, qs, PaymentSerializer)


class PaymentReviewView(StaffView):
    def post(self, request, pk):
        action = request.data.get('action')
        note = str(request.data.get('note', '')).strip()[:200]
        if action not in ('verify', 'reject'):
            raise ValidationError({'action': 'Choose verify or reject.'})
        with transaction.atomic():
            try:
                sub = PaymentSubmission.objects.select_for_update().select_related('order').get(pk=pk)
            except PaymentSubmission.DoesNotExist:
                return Response({'detail': 'Payment not found.'}, status=404)
            if sub.status != 'submitted':
                raise ValidationError('This payment has already been reviewed. A reviewed payment is final.')
            if action == 'reject' and not note:
                raise ValidationError({'note': 'Give the customer a reason for rejecting this payment.'})
            if action == 'verify' and not sub.amount_matches and not note:
                raise ValidationError({'note': 'The amount sent differs from the order total. Explain why you are verifying it.'})
            sub.status = 'verified' if action == 'verify' else 'rejected'
            sub.review_note = note
            sub.save(update_fields=['status', 'review_note'])
            sub.apply_review(request.user)
        sub.refresh_from_db()
        return Response(PaymentSerializer(sub, context={'request': request}).data)


# ------------------------------- Products -------------------------------

class OptionsView(StaffView):
    """Choices for the product form."""
    def get(self, request):
        cats = Category.objects.select_related('parent').order_by('parent__name', 'position', 'name')
        return Response({
            'categories': [{'id': c.id, 'label': str(c), 'is_parent': c.parent_id is None, 'name': c.name,
                            'section': c.parent.name if c.parent_id else c.name, 'group': c.group} for c in cats],
            'collections': [{'id': c.id, 'label': c.name} for c in Collection.objects.all()],
            'seasons': [{'value': v, 'label': l} for v, l in Product.SEASONS],
            'sizes': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            'order_statuses': [{'value': v, 'label': l} for v, l in Order.STATUSES],
            'payment_statuses': [{'value': v, 'label': l} for v, l in Order.PAYMENT_STATUSES],
        })


def product_queryset():
    return (Product.objects.select_related('category', 'collection')
            .prefetch_related('images', 'variants'))


class ProductListCreateView(StaffView):
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        qs = product_queryset().order_by('-created_at')
        p = request.query_params
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(sku__icontains=q) | Q(tags__icontains=q))
        if p.get('active') in ('1', '0'):
            qs = qs.filter(is_active=p['active'] == '1')
        if p.get('category'):
            qs = qs.filter(Q(category_id=p['category']) | Q(category__parent_id=p['category']) | Q(placements=p['category'])).distinct()
        if p.get('stock') == 'out':
            qs = qs.annotate(_s=Sum('variants__stock')).filter(Q(_s=0) | Q(_s__isnull=True))
        elif p.get('stock') == 'low':
            qs = qs.filter(variants__stock__gt=0, variants__stock__lte=LOW_STOCK).distinct()
        return paginate(request, qs, ProductListSerializer)

    def post(self, request):
        s = ProductSerializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        product = s.save()
        return Response(ProductSerializer(product_queryset().get(pk=product.pk), context={'request': request}).data,
                        status=http.HTTP_201_CREATED)


class ProductDetailView(StaffView):
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def _get(self, pk):
        return product_queryset().get(pk=pk)

    def get(self, request, pk):
        try:
            return Response(ProductSerializer(self._get(pk), context={'request': request}).data)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)

    def patch(self, request, pk):
        try:
            product = self._get(pk)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)
        s = ProductSerializer(product, data=request.data, partial=True, context={'request': request})
        s.is_valid(raise_exception=True)
        s.save()
        return Response(ProductSerializer(self._get(pk), context={'request': request}).data)

    def delete(self, request, pk):
        """Permanently delete a product that no customer has ordered. Ordered products can only be hidden."""
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)
        if OrderItem.objects.filter(variant__product=product).exists():
            raise ValidationError({'detail': 'Customers have ordered this product, so it cannot be deleted. '
                                             'Untick "Show on the website" to hide it instead.'})
        name = product.name
        with transaction.atomic():
            product.delete()  # its sizes, photos, wishlist and cart entries go with it
        return Response({'ok': True, 'deleted': name})


class ProductVariantsView(StaffView):
    """Replace the whole size/colour/stock table of a product in one call.
    Rows with an id are updated, rows without are created. Rows left out are removed, unless a past order used
    them: those are kept with stock 0 so old orders and cancellations keep working."""
    def put(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)
        rows = clean_variants(request.data.get('variants'))
        existing = {v.id: v for v in product.variants.all()}
        kept_ids = set()
        # A new row that repeats the size/colour of an existing variant reuses that variant (no unique clash).
        by_key = {(v.size, v.color): v.id for v in existing.values()}
        claimed = {r['id'] for r in rows if r.get('id') in existing}
        for r in rows:
            if r.get('id') not in existing:
                vid = by_key.get((r['size'], r['color']))
                if vid and vid not in claimed:
                    r['id'] = vid
                    claimed.add(vid)
        with transaction.atomic():
            # Two passes: first move everything that exists, so a swap of size/colour cannot hit the unique rule.
            for r in rows:
                v = existing.get(r.get('id'))
                if v:
                    kept_ids.add(v.id)
                    ProductVariant.objects.filter(pk=v.id).update(size=f'~{v.id}', color=f'~{v.id}')
            for r in rows:
                v = existing.get(r.get('id'))
                if v:
                    v.size, v.color, v.stock, v.sku = r['size'], r['color'], r['stock'], r['sku']
                    v.save()
                else:
                    ProductVariant.objects.create(product=product, size=r['size'], color=r['color'], stock=r['stock'], sku=r['sku'])
            for vid, v in existing.items():
                if vid in kept_ids:
                    continue
                if v.order_items.exists():
                    ProductVariant.objects.filter(pk=vid).update(stock=0)
                else:
                    v.delete()
        return Response(ProductSerializer(product_queryset().get(pk=pk), context={'request': request}).data)


class ProductImagesView(StaffView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)
        files = request.FILES.getlist('images')
        if not files:
            raise ValidationError({'images': 'Choose at least one photo.'})
        if len(files) > MAX_PHOTOS_PER_REQUEST:
            raise ValidationError({'images': f'Upload at most {MAX_PHOTOS_PER_REQUEST} photos at a time.'})
        color = str(request.data.get('color', '')).strip()
        # validate every file first, so one bad file does not leave half the batch saved
        serializers = []
        for f in files:
            s = ProductImageSerializer(data={'image': f, 'color': color, 'alt': product.name})
            s.is_valid(raise_exception=True)
            serializers.append(s)
        last = product.images.order_by('-order').values_list('order', flat=True).first()
        nxt = 0 if last is None else last + 1
        with transaction.atomic():
            for i, s in enumerate(serializers):
                s.save(product=product, order=nxt + i)
        return Response(ProductSerializer(product_queryset().get(pk=pk), context={'request': request}).data,
                        status=http.HTTP_201_CREATED)


class ProductImagesReorderView(StaffView):
    """Body: { ids: [imageId, ...] } = the photos of ONE group (e.g. one colour) in the wanted order.
    The group's photos swap places among themselves, so other colours keep their positions."""
    def post(self, request, pk):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids or len(ids) != len(set(ids)):
            raise ValidationError({'ids': 'Send the list of photo ids, each once.'})
        imgs = list(ProductImage.objects.filter(product_id=pk))  # already ordered by (order, id)
        by_id = {i.id: i for i in imgs}
        if not set(ids) <= set(by_id):
            raise ValidationError({'ids': 'One of these photos does not belong to this product.'})
        pos = {i.id: n for n, i in enumerate(imgs)}      # clean 0..n-1 numbering, removes equal orders
        slots = sorted(pos[i] for i in ids)
        pos.update({iid: slot for iid, slot in zip(ids, slots)})
        with transaction.atomic():
            for iid, n in pos.items():
                ProductImage.objects.filter(pk=iid).update(order=n)
        return Response(ProductSerializer(product_queryset().get(pk=pk), context={'request': request}).data)


class ImageDetailView(StaffView):
    def patch(self, request, pk):
        try:
            img = ProductImage.objects.get(pk=pk)
        except ProductImage.DoesNotExist:
            return Response({'detail': 'Photo not found.'}, status=404)
        if 'color' in request.data:
            img.color = str(request.data['color']).strip()[:40]
        if 'alt' in request.data:
            img.alt = str(request.data['alt']).strip()[:160]
        img.save()
        return Response(ProductImageSerializer(img, context={'request': request}).data)

    def delete(self, request, pk):
        try:
            img = ProductImage.objects.get(pk=pk)
        except ProductImage.DoesNotExist:
            return Response(status=http.HTTP_204_NO_CONTENT)
        img.image.delete(save=False)  # remove the file from disk too
        img.delete()
        return Response(status=http.HTTP_204_NO_CONTENT)


# ------------------------------- Sales analytics -------------------------------

PERIODS = {  # period -> (number of buckets shown, heading)
    'daily': (30, 'Last 30 days'), 'weekly': (12, 'Last 12 weeks'),
    'monthly': (12, 'Last 12 months'), 'yearly': (5, 'Last 5 years'),
}


def _bucket_start(d, period):
    if period == 'daily':
        return d
    if period == 'weekly':
        return d - timedelta(days=d.weekday())  # weeks start on Monday
    if period == 'monthly':
        return d.replace(day=1)
    return d.replace(month=1, day=1)


def _step(d, period, direction):
    """The start of the next (+1) or previous (-1) bucket."""
    if period == 'daily':
        return d + timedelta(days=direction)
    if period == 'weekly':
        return d + timedelta(days=7 * direction)
    if period == 'monthly':
        m = d.year * 12 + (d.month - 1) + direction
        return date(m // 12, m % 12 + 1, 1)
    return date(d.year + direction, 1, 1)


def _label(d, period):
    if period == 'monthly':
        return d.strftime('%b %Y')
    if period == 'yearly':
        return str(d.year)
    return d.strftime('%d %b')


def _pct(now, before):
    return None if not before else round((now - before) / before * 100, 1)


class AnalyticsView(StaffView):
    """Sales = orders that were not cancelled or returned, counted on the day they were placed.
    Revenue is the order total (items + delivery - discount), whether or not it is paid yet; the
    'collected' figure is the part that is already paid."""
    def get(self, request):
        period = request.query_params.get('period', 'daily')
        if period not in PERIODS:
            raise ValidationError({'period': 'Use daily, weekly, monthly or yearly.'})
        n, heading = PERIODS[period]
        today = timezone.localdate()
        starts = []
        cur = _bucket_start(today, period)
        for _ in range(n * 2):
            starts.append(cur)
            cur = _step(cur, period, -1)
        starts.reverse()                       # oldest first: [previous n buckets..., current n buckets]
        prev_starts, cur_starts = starts[:n], starts[n:]
        end = _step(cur_starts[-1], period, +1)
        tz = timezone.get_current_timezone()
        aware = lambda d: timezone.make_aware(datetime.combine(d, time.min), tz)
        range_start, prev_start, range_end = aware(cur_starts[0]), aware(prev_starts[0]), aware(end)

        rows = Order.objects.filter(created_at__gte=prev_start, created_at__lt=range_end).values(
            'created_at', 'total', 'status', 'payment_status', 'payment_method')
        buckets = {s: {'revenue': 0, 'orders': 0} for s in starts}
        cur_paid = cur_lost_n = cur_lost_amount = 0
        methods = {}
        for r in rows:
            day = timezone.localtime(r['created_at']).date()
            key = _bucket_start(day, period)
            in_current = r['created_at'] >= range_start
            if r['status'] in Order.TERMINAL:
                if in_current:
                    cur_lost_n += 1
                    cur_lost_amount += r['total']
                continue
            if key in buckets:
                buckets[key]['revenue'] += r['total']
                buckets[key]['orders'] += 1
            if in_current:
                if r['payment_status'] == 'paid':
                    cur_paid += r['total']
                m = methods.setdefault(r['payment_method'], {'orders': 0, 'revenue': 0})
                m['orders'] += 1
                m['revenue'] += r['total']

        series = [{'key': s.isoformat(), 'label': _label(s, period), 'revenue': buckets[s]['revenue'], 'orders': buckets[s]['orders']}
                  for s in cur_starts]
        revenue = sum(x['revenue'] for x in series)
        orders = sum(x['orders'] for x in series)
        prev_revenue = sum(buckets[s]['revenue'] for s in prev_starts)
        prev_orders = sum(buckets[s]['orders'] for s in prev_starts)

        items = OrderItem.objects.filter(order__created_at__gte=range_start, order__created_at__lt=range_end).exclude(
            order__status__in=Order.TERMINAL)
        line = ExpressionWrapper(F('unit_price') * F('quantity'), output_field=DecimalField(max_digits=14, decimal_places=2))
        top = (items.values('product_name').annotate(units=Sum('quantity'), revenue=Sum(line)).order_by('-units', '-revenue')[:8])
        units = items.aggregate(u=Sum('quantity'))['u'] or 0
        best = max(series, key=lambda x: x['revenue'])
        labels = dict(Order.PAYMENT_METHODS)

        return Response({
            'period': period, 'heading': heading, 'series': series,
            'totals': {'revenue': revenue, 'orders': orders, 'units': units,
                       'average_order': (revenue / orders) if orders else 0, 'collected': cur_paid,
                       'cancelled_orders': cur_lost_n, 'cancelled_amount': cur_lost_amount},
            'previous': {'revenue': prev_revenue, 'orders': prev_orders},
            'change': {'revenue': _pct(revenue, prev_revenue), 'orders': _pct(orders, prev_orders)},
            'best': {'label': best['label'], 'revenue': best['revenue']} if best['revenue'] else None,
            'top_products': [{'name': t['product_name'], 'units': t['units'], 'revenue': t['revenue']} for t in top],
            'payment_methods': [{'method': k, 'label': labels.get(k, k), **v}
                                for k, v in sorted(methods.items(), key=lambda kv: -kv[1]['revenue'])],
        })


# ------------------------------- Contact settings -------------------------------

class ContactSettingsView(StaffView):
    """GET to read, PATCH to update. Staff only. Numbers are validated and stored as +880..."""
    def get(self, request):
        return Response(ContactSettingsSerializer(ContactSettings.load()).data)

    def patch(self, request):
        obj = ContactSettings.load()
        s = ContactSettingsSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(ContactSettingsSerializer(ContactSettings.load()).data)


# ------------------------------- Messages from the Contact page -------------------------------

class MessageListView(StaffView):
    def get(self, request):
        qs = ContactMessage.objects.all()
        p = request.query_params
        st = p.get('status', 'new')
        if st in dict(ContactMessage.STATUSES):
            qs = qs.filter(status=st)           # 'all' (or anything else) shows every message
        if p.get('type') in dict(ContactMessage.INQUIRY_TYPES):
            qs = qs.filter(inquiry_type=p['type'])
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q) | Q(subject__icontains=q) |
                           Q(order_number__icontains=q) | Q(message__icontains=q))
        counts = {r['status']: r['n'] for r in ContactMessage.objects.values('status').annotate(n=Count('id'))}
        resp = paginate(request, qs.order_by('-created_at'), ContactMessageAdminSerializer)
        resp.data['counts'] = {s: counts.get(s, 0) for s, _ in ContactMessage.STATUSES}
        return resp


class MessageDetailView(StaffView):
    def get(self, request, pk):
        try:
            return Response(ContactMessageAdminSerializer(ContactMessage.objects.get(pk=pk)).data)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Message not found.'}, status=404)

    def patch(self, request, pk):
        """Staff may only change the status (new / replied / closed). What the customer wrote is never edited."""
        try:
            m = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Message not found.'}, status=404)
        st = request.data.get('status')
        if st not in dict(ContactMessage.STATUSES):
            raise ValidationError({'status': 'Choose new, replied or closed.'})
        m.status = st
        m.save(update_fields=['status'])
        return Response(ContactMessageAdminSerializer(m).data)


# ------------------------------- Category status and menu layout -------------------------------

SECTION_ORDER = {'men': 0, 'women': 1, 'kids': 2, 'lifestyle': 3}


def _clean_name(request, key='name', label='name'):
    name = ' '.join(str(request.data.get(key, '')).split())
    if key == 'name' and not name:
        raise ValidationError({'name': 'Please enter a name.'})
    if len(name) > 80:
        raise ValidationError({key: f'Keep the {label} under 80 characters.'})
    return name


def _slug_for(parent, group, name, exclude_pk=None):
    """Web address for a category. Never changes after creation, so links keep working."""
    candidates = [slugify(f'{parent.name} {name}'), slugify(f'{parent.name} {group} {name}')] if group else [slugify(f'{parent.name} {name}')]
    for base in [c for c in candidates if c] or ['category']:
        if not Category.objects.filter(slug=base).exists():
            return base
    base, n = candidates[-1] or 'category', 2
    while Category.objects.filter(slug=f'{base}-{n}').exists():
        n += 1
    return f'{base}-{n}'


def _row(c, states=None):
    s = (states or category_states()).get(c.id, {})
    return {'id': c.id, 'name': c.name, 'slug': c.slug, 'depth': 1 if c.parent_id else 0, 'parent': c.parent_id,
            'group': c.group, 'position': c.position, 'status': c.status,
            'state': s.get('state', 'live'), 'products': s.get('own_count', 0), 'products_total': s.get('total_count', 0)}


class CategoryAdminListView(StaffView):
    """The whole menu: sections, their groups (Clothing, Featured...) and items, with what the website does with each."""

    def get(self, request):
        states = category_states()
        cats = list(Category.objects.all())
        roots = sorted((c for c in cats if c.parent_id is None), key=lambda c: (SECTION_ORDER.get(c.slug, 9), c.name.lower()))
        rows = []
        for r in roots:
            rows.append(_row(r, states))
            kids = [c for c in cats if c.parent_id == r.id]
            first = {}
            for k in kids:
                first[k.group] = min(first.get(k.group, k.position), k.position)
            kids.sort(key=lambda k: (first[k.group], k.group.lower(), k.position, k.name.lower()))
            rows += [_row(k, states) for k in kids]
        new_n = Product.objects.filter(is_active=True, is_new=True).count()
        fixed = [
            {'id': 'new', 'name': 'New', 'slug': 'new', 'depth': 0, 'fixed': True, 'status': 'auto',
             'state': 'live' if new_n else 'coming_soon', 'products': new_n, 'products_total': new_n,
             'note': 'Live when at least one active product is marked "New".'},
            {'id': 'sale', 'name': 'Sale', 'slug': 'sale', 'depth': 0, 'fixed': True, 'status': 'auto',
             'state': 'coming_soon', 'products': 0, 'products_total': 0,
             'note': 'Shows Coming Soon until a sale filter is added.'},
        ]
        rows = fixed[:1] + rows + fixed[1:]
        return Response({'results': rows, 'statuses': [{'value': v, 'label': l} for v, l in Category.STATUSES]})

    def post(self, request):
        """Add an item under Men, Women, Kids or Lifestyle, in a group (a column of the menu)."""
        name = _clean_name(request)
        group = _clean_name(request, 'group', 'group name')
        try:
            parent = Category.objects.get(pk=request.data.get('parent'), parent__isnull=True)
        except (Category.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'parent': 'Choose a main section.'})
        if Category.objects.filter(parent=parent, group__iexact=group, name__iexact=name).exists():
            raise ValidationError({'name': 'This group already has an item with that name.'})
        if group:  # reuse the spelling of an existing group so "clothing" does not become a second column
            group = Category.objects.filter(parent=parent, group__iexact=group).values_list('group', flat=True).first() or group
        last = Category.objects.filter(parent=parent).order_by('-position').values_list('position', flat=True).first() or 0
        pos = last + 10
        if group:  # new items go to the end of their own group
            in_group = Category.objects.filter(parent=parent, group=group).order_by('-position').values_list('position', flat=True).first()
            if in_group is not None:
                pos = in_group + 1
        c = Category.objects.create(name=name, parent=parent, group=group, position=pos, slug=_slug_for(parent, group, name))
        return Response(_row(c), status=201)


class CategoryGroupView(StaffView):
    """Rename a group (a menu column) for every item in it."""

    def post(self, request):
        try:
            parent = Category.objects.get(pk=request.data.get('parent'), parent__isnull=True)
        except (Category.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'parent': 'Choose a main section.'})
        old = str(request.data.get('from', ''))
        new = _clean_name(request, 'to', 'group name')
        if not new:
            raise ValidationError({'to': 'Please enter a group name.'})
        clash = Category.objects.filter(parent=parent, group__iexact=new).exclude(group=old).exists()
        if clash:
            raise ValidationError({'to': 'This section already has a group with that name.'})
        n = Category.objects.filter(parent=parent, group=old).update(group=new)
        return Response({'renamed': n})


class CategoryAdminDetailView(StaffView):
    """Rename, move to another group, change status or delete. The web address never changes on rename."""

    def _get(self, pk):
        return Category.objects.filter(pk=pk).first()

    def patch(self, request, pk):
        c = self._get(pk)
        if not c:
            return Response({'detail': 'Category not found.'}, status=404)
        if 'status' in request.data:
            st = request.data.get('status')
            if st not in dict(Category.STATUSES):
                raise ValidationError({'status': 'Unknown status.'})
            c.status = st
        if 'name' in request.data or 'group' in request.data:
            if c.parent_id is None:
                raise ValidationError({'name': 'Main sections (Men, Women, Kids, Lifestyle) cannot be renamed.'})
            name = _clean_name(request) if 'name' in request.data else c.name
            group = _clean_name(request, 'group', 'group name') if 'group' in request.data else c.group
            if group and group != c.group:
                group = Category.objects.filter(parent=c.parent, group__iexact=group).values_list('group', flat=True).first() or group
            if Category.objects.filter(parent=c.parent, group__iexact=group, name__iexact=name).exclude(pk=c.pk).exists():
                raise ValidationError({'name': 'This group already has an item with that name.'})
            if group != c.group:
                top = Category.objects.filter(parent=c.parent, group=group).order_by('-position').values_list('position', flat=True).first()
                c.position = (top + 1) if top is not None else (Category.objects.filter(parent=c.parent).order_by('-position').values_list('position', flat=True).first() or 0) + 10
            c.name, c.group = name, group
        c.save()
        return Response(_row(c))

    def delete(self, request, pk):
        c = self._get(pk)
        if not c:
            return Response({'detail': 'Category not found.'}, status=404)
        if c.parent_id is None:
            raise ValidationError({'detail': 'Main sections cannot be deleted. Set them to Hidden instead.'})
        n = Product.objects.filter(Q(category=c) | Q(placements=c)).distinct().count()
        if n:
            raise ValidationError({'detail': f'{n} product(s) are in this category. Remove them from it first (edit the product), or set the category to Hidden.'})
        c.delete()
        return Response({'ok': True})


class CategoryMoveView(StaffView):
    """Move an item up or down inside its group."""

    def post(self, request, pk):
        c = Category.objects.filter(pk=pk, parent__isnull=False).first()
        if not c:
            return Response({'detail': 'Category not found.'}, status=404)
        step = -1 if request.data.get('dir') == 'up' else 1
        items = list(Category.objects.filter(parent=c.parent, group=c.group).order_by('position', 'id'))
        spots = sorted(i.position for i in items)
        if len(set(spots)) != len(spots):  # equal positions: spread them out first
            spots = [spots[0] + n for n in range(len(items))]
        k = next(n for n, i in enumerate(items) if i.id == c.id)
        j = k + step
        if 0 <= j < len(items):
            items[k], items[j] = items[j], items[k]
        with transaction.atomic():
            for pos, i in zip(spots, items):
                if i.position != pos:
                    i.position = pos
                    i.save(update_fields=['position'])
        return Response({'ok': True})


class PublicShelfView(APIView):
    """Public: the products to show for a menu item (or a whole section), including products placed there as an extra."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        slug = (request.query_params.get('item') or '').strip()
        cat = Category.objects.filter(slug=slug).first()
        if not cat:
            return Response([])
        ids = [cat.id] + list(Category.objects.filter(parent=cat).values_list('id', flat=True))
        qs = (Product.objects.filter(is_active=True).filter(Q(category_id__in=ids) | Q(placements__in=ids)).distinct()
              .select_related('category', 'collection').prefetch_related('images', 'variants').order_by('-created_at'))
        return Response(PublicProductSerializer(qs, many=True, context={'request': request}).data)


# ------------------------------- Site media (pictures and videos that are not product photos) -------------------------------

def _product_photo(p):
    imgs = sorted(p.images.all(), key=lambda i: (i.color != '', i.order, i.id))  # a photo for "all colours" first
    return imgs[0].image.url if imgs else ''


def _product_item(p):
    return {'id': p.id, 'slug': p.slug, 'name': p.name, 'price': str(p.price), 'image': _product_photo(p)} if p else None


def _media_item(m, request):
    """What the website needs for one slot: the uploaded file (may be empty) and the product it points at (may be none)."""
    url = ''
    if m.file:
        url = request.build_absolute_uri(m.file.url) if request else m.file.url
        url = f'{url}?v={int(m.updated_at.timestamp())}'
    return {'url': url, 'kind': m.kind, 'product': _product_item(m.product), 'label': m.label, 'link': m.link}


def _media_rows():
    return {m.key: m for m in SiteMedia.objects.select_related('product').prefetch_related('product__images')}


class SiteMediaPublicView(APIView):
    """Public: {slot key: {url, kind, product}} for every slot that has a file or a product."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({k: _media_item(m, request) for k, m in _media_rows().items()
                         if k in SLOTS and (m.file or m.label or m.link or (m.product_id and m.product and m.product.is_active))})


class MediaSlotsView(StaffView):
    def get(self, request):
        have = _media_rows()
        groups = [{'title': g, 'slots': [
            {'key': k, 'label': l, 'kind': kind, 'hint': h, 'product_ok': SLOTS[k]['product_ok'],
             'file': _media_item(have[k], request) if k in have and have[k].file else None,
             'product': _product_item(have[k].product) if k in have else None,
             'caption': have[k].label if k in have else '', 'link': have[k].link if k in have else ''}
            for k, l, kind, h in items]} for g, items in GROUPS]
        products = list(Product.objects.filter(is_active=True).order_by('name').values('id', 'name'))
        return Response({'groups': groups, 'products': products})


class MediaSlotDetailView(StaffView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _row(self, key):
        return SiteMedia.objects.filter(key=key).first() or SiteMedia(key=key)

    def post(self, request, key):
        """Upload or replace the file of a slot."""
        slot = SLOTS.get(key)
        if not slot:
            return Response({'detail': 'Unknown place.'}, status=404)
        f = request.FILES.get('file')
        if not f:
            raise ValidationError({'file': 'Choose a file.'})
        ext = ('.' + f.name.rsplit('.', 1)[-1].lower()) if '.' in f.name else ''
        allowed = (IMAGE_EXT if slot['kind'] == 'image' else VIDEO_EXT if slot['kind'] == 'video' else IMAGE_EXT | VIDEO_EXT)
        if ext not in allowed:
            raise ValidationError({'file': 'Use ' + ', '.join(sorted(e.strip('.').upper() for e in allowed)) + ' files here.'})
        is_video = ext in VIDEO_EXT
        if f.size > (MAX_VIDEO if is_video else MAX_IMAGE):
            raise ValidationError({'file': f'This file is too large (max {(MAX_VIDEO if is_video else MAX_IMAGE) // 1048576} MB).'})
        if not is_video and ext != '.avif':
            try:
                from PIL import Image
                Image.open(f).verify()
                f.seek(0)
            except Exception:
                raise ValidationError({'file': 'This does not look like a valid picture.'})
        with transaction.atomic():
            m = self._row(key)
            if m.file:
                m.file.delete(save=False)  # the old file is not kept
            m.kind = 'video' if is_video else 'image'
            m.file.save(f'{key}{ext}', f, save=False)
            m.save()
        return Response(_media_item(m, request))

    def patch(self, request, key):
        """Set what a menu or search tile shows and links to. Any of: product (id or null), label, link."""
        slot = SLOTS.get(key)
        if not slot:
            return Response({'detail': 'Unknown place.'}, status=404)
        if not slot['product_ok']:
            raise ValidationError({'product': 'This place cannot show a product.'})
        m = self._row(key)
        if 'product' in request.data:
            pid = request.data.get('product')
            m.product = None
            if pid not in (None, '', 0):
                m.product = Product.objects.filter(pk=pid, is_active=True).first()
                if not m.product:
                    raise ValidationError({'product': 'Choose an active product.'})
        if 'label' in request.data:
            m.label = ' '.join(str(request.data.get('label') or '').split())[:80]
        if 'link' in request.data:
            link = str(request.data.get('link') or '').strip()
            if link and not (link.startswith('/') and not link.startswith('//')) and not link.lower().startswith('https://'):
                raise ValidationError({'link': 'Start the link with / (a page of this website, like /men) or https://'})
            m.link = link[:200]
        m.save()
        if not (m.file or m.product_id or m.label or m.link):
            m.delete()
        return Response({'ok': True})

    def delete(self, request, key):
        """Remove the uploaded file. A product, caption or link on the same slot stays."""
        m = SiteMedia.objects.filter(key=key).first()
        if m:
            if m.file:
                m.file.delete(save=False)
                m.file = ''
            if m.product_id or m.label or m.link:
                m.save()
            else:
                m.delete()
        return Response({'ok': True})