from django.urls import path

from . import views
from . import notifications as n

urlpatterns = [
    path('me/', views.MeView.as_view()),
    path('dashboard/', views.DashboardView.as_view()),
    path('analytics/', views.AnalyticsView.as_view()),
    path('contact-settings/', views.ContactSettingsView.as_view()),
    path('categories/', views.CategoryAdminListView.as_view()),
    path('categories/groups/', views.CategoryGroupView.as_view()),
    path('categories/<int:pk>/', views.CategoryAdminDetailView.as_view()),
    path('categories/<int:pk>/move/', views.CategoryMoveView.as_view()),
    path('shelf/', views.PublicShelfView.as_view()),
    path('site-media/', views.SiteMediaPublicView.as_view()),
    path('media-slots/', views.MediaSlotsView.as_view()),
    path('media-slots/<slug:key>/', views.MediaSlotDetailView.as_view()),
    path('messages/', views.MessageListView.as_view()),
    path('messages/<int:pk>/', views.MessageDetailView.as_view()),

    path('orders/', views.OrderListView.as_view()),
    path('orders/<int:pk>/', views.OrderDetailView.as_view()),
    path('orders/<int:pk>/status/', views.OrderStatusView.as_view()),
    path('orders/<int:pk>/action/', views.OrderActionView.as_view()),

    path('payments/', views.PaymentListView.as_view()),
    path('payments/<int:pk>/review/', views.PaymentReviewView.as_view()),

    path('options/', views.OptionsView.as_view()),
    path('products/', views.ProductListCreateView.as_view()),
    path('products/<int:pk>/', views.ProductDetailView.as_view()),
    path('products/<int:pk>/variants/', views.ProductVariantsView.as_view()),
    path('products/<int:pk>/images/', views.ProductImagesView.as_view()),
    path('products/<int:pk>/images/reorder/', views.ProductImagesReorderView.as_view()),
    path('images/<int:pk>/', views.ImageDetailView.as_view()),
    
    path('emails/', n.EmailLogListView.as_view()),
    path('emails/<int:pk>/retry/', n.EmailLogRetryView.as_view()),
    path('orders/<int:pk>/notifications/', n.OrderNotificationsView.as_view()),
    path('orders/<int:pk>/invoice-link/', n.OrderInvoiceLinkView.as_view()),
    path('customers/', n.CustomerListView.as_view()),
]