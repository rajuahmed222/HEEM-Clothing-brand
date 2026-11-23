from django.urls import path

from . import views as v

urlpatterns = [
    path('contact/', v.ContactView.as_view()),
    path('contact-settings/', v.ContactSettingsPublicView.as_view()),
    path('returns/', v.ReturnRequestView.as_view()),
    path('returns/eligible/', v.ReturnEligibleView.as_view()),
]