"""Staff views for Phase 4: email log + retry, notification history and invoice of one order, customers and guests.
Kept in its own module so the existing adminapi/views.py needs no edits (only the urls in adminapi/urls.py)."""
from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum
from rest_framework.response import Response

from accounts import emailing
from accounts.models import EmailLog
from shopping import invoices
from shopping.invoice_views import link_response
from shopping.models import Order

from .views import PAGE_SIZE, StaffView

User = get_user_model()


def _page(request, qs_or_list, row):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except ValueError:
        page = 1
    count = qs_or_list.count() if hasattr(qs_or_list, 'count') and not isinstance(qs_or_list, list) else len(qs_or_list)
    rows = qs_or_list[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    return Response({'count': count, 'page': page, 'pages': max(1, -(-count // PAGE_SIZE)), 'results': [row(r) for r in rows]})


def email_row(l):
    return {'id': l.id, 'kind': l.kind, 'to_email': l.to_email, 'subject': l.subject, 'status': l.status,
            'reference': l.reference, 'attempts': l.attempts, 'error': l.error, 'retryable': l.retryable,
            'created_at': l.created_at, 'sent_at': l.sent_at}


class EmailLogListView(StaffView):
    def get(self, request):
        qs = EmailLog.objects.all()
        p = request.query_params
        if p.get('status') in ('sent', 'failed', 'queued'):
            qs = qs.filter(status=p['status'])
        if p.get('kind'):
            qs = qs.filter(kind=p['kind'])
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(to_email__icontains=q) | Q(reference__icontains=q) | Q(subject__icontains=q))
        kinds = list(EmailLog.objects.order_by().values_list('kind', flat=True).distinct())
        res = _page(request, qs, email_row)
        res.data['kinds'] = sorted(kinds)
        return res


class EmailLogRetryView(StaffView):
    def post(self, request, pk):
        log = EmailLog.objects.filter(pk=pk).first()
        if not log:
            return Response({'detail': 'Email not found.'}, status=404)
        return Response(email_row(emailing.retry(log)))


class OrderNotificationsView(StaffView):
    """Everything the customer was emailed about this order, plus its invoice."""
    def get(self, request, pk):
        order = Order.objects.filter(pk=pk).first()
        if not order:
            return Response({'detail': 'Order not found.'}, status=404)
        logs = EmailLog.objects.filter(reference=order.number)
        inv = getattr(order, 'invoice', None) if hasattr(order, 'invoice') else None
        return Response({
            'emails': [email_row(l) for l in logs],
            'invoice': {'number': inv.number, 'issued_at': inv.issued_at} if inv else None,
            'can_invoice': invoices.eligible(order),
            'customer_email': order.customer_email, 'is_guest': not order.user_id,
        })


class OrderInvoiceLinkView(StaffView):
    def get(self, request, pk):
        order = Order.objects.filter(pk=pk).first()
        if not order:
            return Response({'detail': 'Order not found.'}, status=404)
        return link_response(request, order)


class CustomerListView(StaffView):
    """?type=registered (default) | unverified | guest, and ?q= to search by email or name."""
    def get(self, request):
        kind = request.query_params.get('type', 'registered')
        q = (request.query_params.get('q') or '').strip()
        live = ~Q(orders__status__in=list(Order.TERMINAL))
        if kind == 'guest':
            qs = Order.objects.filter(user__isnull=True).exclude(guest_email='')
            if q:
                qs = qs.filter(Q(guest_email__icontains=q) | Q(recipient_name__icontains=q) | Q(phone__icontains=q))
            qs = (qs.order_by().values('guest_email')
                  .annotate(orders=Count('id'), spent=Sum('total', filter=~Q(status__in=list(Order.TERMINAL))),
                            last_order=Max('created_at'), name=Max('recipient_name'), phone=Max('phone'))
                  .order_by('-last_order'))
            return _page(request, qs, lambda r: {
                'key': r['guest_email'], 'email': r['guest_email'], 'name': r['name'], 'phone': r['phone'],
                'orders': r['orders'], 'spent': r['spent'] or 0, 'last_order': r['last_order'], 'type': 'guest'})

        qs = User.objects.filter(is_staff=False).select_related('profile').prefetch_related('social_accounts')
        if kind == 'unverified':
            qs = qs.filter(profile__email_verified=False)
        elif kind == 'registered':
            qs = qs.exclude(profile__email_verified=False)
        if q:
            qs = qs.filter(Q(email__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        qs = qs.annotate(n_orders=Count('orders', distinct=True), spent=Sum('orders__total', filter=live),
                         last_order=Max('orders__created_at')).order_by('-date_joined')

        def row(u):
            prof = getattr(u, 'profile', None)
            return {'key': str(u.pk), 'id': u.pk, 'email': u.email, 'name': f'{u.first_name} {u.last_name}'.strip(),
                    'phone': getattr(prof, 'phone', '') or '', 'verified': bool(getattr(prof, 'email_verified', True)),
                    'active': u.is_active, 'joined': u.date_joined, 'orders': u.n_orders, 'spent': u.spent or 0,
                    'last_order': u.last_order, 'logins': ['email'] + [a.provider for a in u.social_accounts.all()],
                    'type': 'registered'}
        return _page(request, qs, row)