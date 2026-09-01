"""Testes de Contrato de API e Validação de Schema do Funil do Promotor.

Cobertura:
1. POST /api/v1/collaborators/auth/check (número novo auto-capturado)
2. POST /api/v1/collaborators/auth/check (número existente)
3. POST /api/v1/collaborators/auth/login (sucesso com OTP correto)
4. POST /api/v1/collaborators/auth/login (falha com OTP errado)
5. POST /api/v1/collaborators/auth/login (payload inválido -> 422)
6. POST /api/v1/collaborators/auth/check (payload inválido sem phone -> 422)
7. GET  /api/v1/collaborators/promoter/me (requer autenticação -> 401/403)
8. GET  /api/v1/collaborators/promoter/me (validação de schema do promotor)
9. GET  /api/v1/collaborators/candidate/me (requer autenticação -> 401/403)
10. GET /api/v1/collaborators/candidate/me (validação de schema do candidato)
"""

from __future__ import annotations

import hashlib
import uuid

import pytest
from django.test import Client

from hub.models import Hub
from users.address.models import Address
from users.auth.jwt.service import issue
from users.auth.models import User
from users.auth.otp.models import OtpCode
from users.profiles import interface as profiles
from users.roles import interface as roles
from users.roles.candidate.models import Candidate
from users.roles.promoter.models import Promoter


@pytest.fixture
def default_hub(db):
    """Fixture de Hub padrão para auto-captura e associação de candidatos/promotores."""
    address = Address.objects.create(
        city="Londrina",
        state="PR",
        street="Rua Brasil",
        number="100",
        neighborhood="Centro",
        zipcode="86010000",
    )
    return Hub.objects.create(
        address=address,
        brand="standard",
        is_default=True,
    )


# ---------------------------------------------------------------------------
# 1. Check: número novo
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_check_response_schema_new_phone(client: Client, default_hub: Hub, monkeypatch):
    """Check de número novo retorna JSON com TODOS os campos esperados e tipos corretos."""
    monkeypatch.setattr(
        "users.auth.service._check_phone_whatsapp",
        lambda phone: (True, phone),  # phone já vem normalizado com DDI 55, não adicionar "55" novamente
    )

    phone = "43996648750"
    res = client.post(
        "/api/v1/collaborators/auth/check",
        data={"phone": phone, "send_otp": True},
        content_type="application/json",
    )

    assert res.status_code == 200
    data = res.json()

    # Validação de schema e tipos
    assert isinstance(data["found"], bool)
    assert data["found"] is False

    assert isinstance(data["registered"], bool)
    assert data["registered"] is True

    assert isinstance(data["created"], bool)
    assert data["created"] is True

    assert isinstance(data["external_id"], str)
    # Valida formato UUID válido
    parsed_uuid = uuid.UUID(data["external_id"])
    assert str(parsed_uuid) == data["external_id"]

    assert isinstance(data["otp_sent"], bool)
    assert data["otp_sent"] is True

    assert isinstance(data["whatsapp"], bool)
    assert data["whatsapp"] is True

    assert isinstance(data["roles"], list)
    assert data["roles"] == ["candidate"]


# ---------------------------------------------------------------------------
# 2. Check: número existente
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_check_response_schema_existing_phone(client: Client, default_hub: Hub):
    """Check de número existente: found=True, created=False, external_id preenchido."""
    phone = "43996648750"
    user = User.objects.create_user(external_id=uuid.uuid4())
    profiles.create(user=user, phone="5543996648750", cpf="11144477735")
    roles.assign(user, "candidate")
    Candidate.objects.create(user=user, hub=default_hub, status=Candidate.Status.STARTED)

    res = client.post(
        "/api/v1/collaborators/auth/check",
        data={"phone": phone, "send_otp": True},
        content_type="application/json",
    )

    assert res.status_code == 200
    data = res.json()

    assert isinstance(data["found"], bool)
    assert data["found"] is True

    assert isinstance(data["created"], bool)
    assert data["created"] is False

    assert isinstance(data["external_id"], str)
    assert data["external_id"] == str(user.external_id)

    assert isinstance(data["otp_sent"], bool)
    assert isinstance(data["roles"], list)
    assert "candidate" in data["roles"]


# ---------------------------------------------------------------------------
# 3. Login: sucesso
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_login_success_schema(client: Client, default_hub: Hub):
    """Login com OTP correto retorna {access_token: str, refresh_token: str, token_type: 'bearer'} HTTP 200."""
    user = User.objects.create_user(external_id=uuid.uuid4())
    profiles.create(user=user, phone="5543996648750", cpf="11144477735")
    roles.assign(user, "candidate")
    Candidate.objects.create(user=user, hub=default_hub, status=Candidate.Status.STARTED)

    code = "123456"
    OtpCode.objects.create(
        user=user,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        status="sent",
    )

    res = client.post(
        "/api/v1/collaborators/auth/login",
        data={"external_id": str(user.external_id), "otp": code},
        content_type="application/json",
    )

    assert res.status_code == 200
    data = res.json()

    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0

    assert isinstance(data["refresh_token"], str)
    assert len(data["refresh_token"]) > 0

    assert isinstance(data["token_type"], str)
    assert data["token_type"].lower() == "bearer"


# ---------------------------------------------------------------------------
# 4. Login: falha por OTP incorreto
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_login_failure_schema(client: Client, default_hub: Hub):
    """Login com OTP errado retorna HTTP 401 com campo {detail: str} ou {error: str}."""
    user = User.objects.create_user(external_id=uuid.uuid4())
    profiles.create(user=user, phone="5543996648750", cpf="11144477735")
    roles.assign(user, "candidate")
    Candidate.objects.create(user=user, hub=default_hub, status=Candidate.Status.STARTED)

    code = "123456"
    OtpCode.objects.create(
        user=user,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        status="sent",
    )

    res = client.post(
        "/api/v1/collaborators/auth/login",
        data={"external_id": str(user.external_id), "otp": "999999"},
        content_type="application/json",
    )

    assert res.status_code == 401
    data = res.json()

    assert "detail" in data or "error" in data
    error_msg = data.get("detail") or data.get("error")
    assert isinstance(error_msg, str)
    assert len(error_msg) > 0


# ---------------------------------------------------------------------------
# 5. Login: payload inválido (sem external_id) -> 422
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_login_invalid_payload_returns_422(client: Client):
    """Payload sem external_id retorna HTTP 422."""
    res = client.post(
        "/api/v1/collaborators/auth/login",
        data={"otp": "123456"},
        content_type="application/json",
    )

    assert res.status_code == 422
    data = res.json()
    assert "detail" in data or "error" in data


# ---------------------------------------------------------------------------
# 6. Check: payload inválido (sem phone/cpf/external_id) -> 422
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_check_invalid_payload_returns_422(client: Client):
    """POST /check sem phone retorna HTTP 422."""
    res = client.post(
        "/api/v1/collaborators/auth/check",
        data={},
        content_type="application/json",
    )

    assert res.status_code == 422
    data = res.json()
    assert "detail" in data or "error" in data


# ---------------------------------------------------------------------------
# 7. Promoter /me: autenticação obrigatória
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_promoter_me_requires_auth(client: Client):
    """GET /promoter/me sem Authorization header retorna 401 ou 403."""
    res = client.get("/api/v1/collaborators/promoter/me")
    assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 8. Promoter /me: schema do promotor
# ---------------------------------------------------------------------------
# ENDPOINT PENDENTE
@pytest.mark.xfail(
    reason=(
        "GET /promoter/me contrato alvo {ref_code, week_target, week_count, "
        "total_earnings, commission_amount, kyc_steps} pendente de alinhamento com backend "
        "(schema atual PromoterMeOut retorna ref_url, locked, pending_materials, blocks)"
    )
)
@pytest.mark.django_db
def test_promoter_me_schema(client: Client, default_hub: Hub):
    """Usuário com role promoter autenticado: response tem ref_code (str), week_count (int), commission_amount (float ou int), kyc_steps (list)."""
    user = User.objects.create_user(external_id=uuid.uuid4())
    profiles.create(user=user, phone="5543996648750", cpf="11144477735")
    roles.assign(user, "candidate")
    roles.promote(user, "promoter")
    Promoter.objects.create(
        user=user,
        hub=default_hub,
        status=Promoter.Status.ACTIVE,
    )

    tokens = issue(str(user.external_id), ["promoter"])
    token = tokens["access_token"]

    res = client.get(
        "/api/v1/collaborators/promoter/me",
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )

    assert res.status_code == 200
    data = res.json()

    # Contrato alvo
    assert "ref_code" in data and isinstance(data["ref_code"], str)
    assert "week_count" in data and isinstance(data["week_count"], int)
    assert "commission_amount" in data and isinstance(data["commission_amount"], (float, int))
    assert "kyc_steps" in data and isinstance(data["kyc_steps"], list)


# ---------------------------------------------------------------------------
# 9. Candidate /me: autenticação obrigatória
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_candidate_me_requires_auth(client: Client):
    """GET /candidate/me sem Authorization header retorna 401 ou 403."""
    res = client.get("/api/v1/collaborators/candidate/me")
    assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 10. Candidate /me: schema do candidato
# ---------------------------------------------------------------------------
# ENDPOINT PENDENTE
@pytest.mark.xfail(
    reason=(
        "GET /candidate/me contrato alvo {status, hub_id, steps: [{key, label, done}]} "
        "pendente de alinhamento com backend "
        "(schema atual CandidateMeOut retorna hub_external_id, profile, address, documents, selfie, blocks)"
    )
)
@pytest.mark.django_db
def test_candidate_me_schema(client: Client, default_hub: Hub):
    """Usuário com role candidate autenticado: response tem status (str), steps (list com dicts {key, label, done})."""
    user = User.objects.create_user(external_id=uuid.uuid4())
    profiles.create(user=user, phone="5543996648750", cpf="11144477735")
    roles.assign(user, "candidate")
    Candidate.objects.create(
        user=user,
        hub=default_hub,
        status=Candidate.Status.STARTED,
    )

    tokens = issue(str(user.external_id), ["candidate"])
    token = tokens["access_token"]

    res = client.get(
        "/api/v1/collaborators/candidate/me",
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )

    assert res.status_code == 200
    data = res.json()

    # Contrato alvo
    assert "status" in data and isinstance(data["status"], str)
    assert "steps" in data and isinstance(data["steps"], list)
    if data["steps"]:
        step = data["steps"][0]
        assert "key" in step and isinstance(step["key"], str)
        assert "label" in step and isinstance(step["label"], str)
        assert "done" in step and isinstance(step["done"], bool)
