from django.urls import path

from . import guest as g
from . import invoice_views as iv
from . import views as v

urlpatterns = [
    path('store/policy/', v.StorePolicyView.as_view()),
    path('wishlist/', v.WishlistView.as_view()),
    path('wishlist/merge/', v.WishlistMergeView.as_view()),
    path('wishlist/resolve/', v.GuestWishlistResolveView.as_view()),
    path('wishlist/<int:product_id>/', v.WishlistItemView.as_view()),
    path('wishlist/<int:product_id>/move-to-cart/', v.WishlistMoveToCartView.as_view()),
    path('cart/', v.CartView.as_view()),
    path('cart/merge/', v.CartMergeView.as_view()),
    path('cart/resolve/', v.GuestResolveView.as_view()),
    path('cart/<int:pk>/', v.CartItemView.as_view()),
    path('cart/<int:pk>/save-for-later/', v.CartSaveForLaterView.as_view()),
    path('checkout/options/', v.CheckoutOptionsView.as_view()),
    path('checkout/quote/', v.CheckoutQuoteView.as_view()),
    path('checkout/', v.CheckoutView.as_view()),
    # guest checkout: no account needed
    path('checkout/guest/options/', g.GuestCheckoutOptionsView.as_view()),
    path('checkout/guest/quote/', g.GuestQuoteView.as_view()),
    path('checkout/guest/', g.GuestCheckoutView.as_view()),
    # these must stay above orders/<number>/, which would otherwise swallow "track" and "guest"
    path('orders/track/', g.TrackOrderView.as_view()),
    path('orders/guest/cancel/', g.GuestCancelView.as_view()),
    path('orders/guest/invoice-link/', iv.GuestInvoiceLinkView.as_view()),
    path('invoices/<str:token>/', iv.InvoiceFileView.as_view(), name='invoice-file'),
    path('orders/<str:number>/invoice-link/', iv.MyInvoiceLinkView.as_view()),
    path('orders/guest/<str:token>/', g.GuestOrderView.as_view()),
    path('orders/claim-guest/', g.ClaimGuestOrdersView.as_view()),
    path('orders/', v.OrderListView.as_view()),
    path('orders/alerts/', v.OrderAlertsView.as_view()),
    path('orders/<str:number>/', v.OrderDetailView.as_view()),
    path('orders/<str:number>/payment/', v.OrderPaymentView.as_view()),
    path('orders/<str:number>/reorder/', v.OrderReorderView.as_view()),
    path('orders/<str:number>/cancel/', v.OrderCancelView.as_view()),
    path('orders/<str:number>/return/', v.OrderReturnView.as_view()),
    path('dashboard/', v.DashboardView.as_view()),
]