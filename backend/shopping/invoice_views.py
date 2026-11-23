"""Invoice downloads. The browser never sends a login header for a file download, so the flow is two steps:
1) an authorised call (account / guest link / staff) returns a short-lived signed URL,
2) that URL serves the PDF. The signature proves step 1 happened in the last 10 minutes."""
from django.http import HttpResponse
from django.urls import reverse
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import invoices
from .models import Order

NOT_FOUND = {'detail': 'We could not find an order with those details.'}


def link_response(request, order):
    if not invoices.eligible(order):
        return Response({'detail': 'An invoice is available once your order is confirmed.'}, status=400)
    url = request.build_absolute_uri(reverse('invoice-file', args=[invoices.make_link(order)]))
    return Response({'url': url})


class InvoiceFileView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'track'

    def get(self, request, token):
        pk = invoices.read_link(token)
        order = Order.objects.filter(pk=pk).first() if pk else None
        if not order or not invoices.eligible(order):
            return HttpResponse('This download link has expired. Please request the invoice again.', status=404, content_type='text/plain')
        try:
            pdf = invoices.render_pdf(order)
        except invoices.InvoiceUnavailable as ex:
            return HttpResponse(str(ex), status=503, content_type='text/plain')
        res = HttpResponse(pdf, content_type='application/pdf')
        res['Content-Disposition'] = f'attachment; filename="{invoices.get_invoice(order).number}.pdf"'
        res['Cache-Control'] = 'private, no-store'
        return res


class MyInvoiceLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, number):
        order = Order.objects.filter(user=request.user, number=number).first()
        if not order:
            return Response({'detail': 'Order not found.'}, status=404)
        return link_response(request, order)


class GuestInvoiceLinkView(APIView):
    """Guest proves ownership like for viewing the order: private link token, or order number + checkout email."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'track'

    def post(self, request):
        token = str(request.data.get('token') or '').strip()
        number = str(request.data.get('number') or '').strip().upper()
        email = str(request.data.get('email') or '').strip().lower()
        order = None
        if 20 <= len(token) <= 64:
            order = Order.objects.filter(track_token=token).first()
        elif number and email:
            order = Order.objects.select_related('user').filter(number=number).first()
            if order and order.customer_email.strip().lower() != email:
                order = None
        if not order or order.user_id:
            return Response(NOT_FOUND, status=404)
        return link_response(request, order)