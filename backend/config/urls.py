from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('shop.urls')),
    path('api/account/', include('accounts.urls')),
    path('api/', include('shopping.urls')),
    path('api/', include('support.urls')),
    path('api/admin/', include('adminapi.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)