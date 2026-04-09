"""
Unfold admin configuration.
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.admin import AdminConfig
from unfold.sites import UnfoldAdminSite


class CustomAdminSite(UnfoldAdminSite):
    """Custom Unfold admin site."""
    
    site_title = _("IEADPG Admin")
    site_header = _("IEADPG Admin")
    index_title = _("Dashboard")


# Create custom admin site instance
custom_admin_site = CustomAdminSite(name="custom_admin")


class CustomAdminConfig(AdminConfig):
    """Custom admin config for Unfold."""
    default_site = "core.admin.CustomAdminSite"
