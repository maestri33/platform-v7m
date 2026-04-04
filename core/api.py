"""API principal do projeto."""

from ninja import NinjaAPI

from apps.authentication.api import router as authentication_router
from apps.profiles.api import router as profiles_router
from apps.visitors.api import router as visitors_router

api = NinjaAPI(title="IEADPG API")
api.add_router("/auth/", authentication_router)
api.add_router("/profiles/", profiles_router)
api.add_router("/visitors/", visitors_router)
