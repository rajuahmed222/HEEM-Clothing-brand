from django.urls import path
from . import views, pages

urlpatterns = [
    path('products/', views.ProductList.as_view()),
    path('products/<slug:slug>/', views.ProductDetail.as_view()),
    path('products/<slug:slug>/related/', views.RelatedProducts.as_view()),
    path('categories/', views.CategoryList.as_view()),
    path('search/', views.search_view),
    path('search/suggest/', views.suggest_view),
    path('collections/', pages.collections_view),
    path('collections/<slug:slug>/', pages.collection_detail_view),
    path('size-guide/', pages.size_guide_view),
]