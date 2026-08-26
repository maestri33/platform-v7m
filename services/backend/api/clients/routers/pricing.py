"""Router de vitrine de preços e indicação pública (Funil do Aluno)."""

from __future__ import annotations

from ninja import Router

from api.clients.schemas import PricingOut, ReferralOut
from users.roles.lead import service as lead_iface

router = Router(tags=["pricing"])


@router.get("/pricing", response=PricingOut, auth=None, summary="Preço de vitrine público")
def pricing(request):
    """Preço de VITRINE público (sem login): PIX + cartão em 12x."""
    return lead_iface.pricing()


@router.get("/referral/{ref}", response=ReferralOut, auth=None, summary="Selo de indicação por promotor")
def referral(request, ref: str):
    """Resolve o primeiro nome do promotor para o selo de indicação."""
    return {"name": lead_iface.referral_name(ref)}
