from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('addresses', views.AddressViewSet, basename='address')

urlpatterns = [
    path('register/', views.RegisterView.as_view()),
    path('verify-email/', views.VerifyEmailView.as_view()),
    path('resend-code/', views.ResendCodeView.as_view()),
    path('login/', views.LoginView.as_view()),
    path('social/config/', views.SocialConfigView.as_view()),
    path('social/link/', views.SocialLinkView.as_view()),
    path('social/<slug:provider>/', views.SocialLoginView.as_view()),
    path('logout/', views.LogoutView.as_view()),
    path('me/', views.MeView.as_view()),
    path('password/change/', views.ChangePasswordView.as_view()),
    path('password/forgot/', views.ForgotPasswordView.as_view()),
    path('password/reset/', views.ResetPasswordView.as_view()),
    path('delete/', views.DeleteAccountView.as_view()),
    path('', include(router.urls)),
    
]