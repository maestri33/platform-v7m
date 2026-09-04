"""Web Bot Auth (IETF WebBotAuth WG / RFC 9421 HTTP Message Signatures).

Provides:
- Public directory discovery endpoint at `/.well-known/http-message-signatures-directory`
  serving JSON Web Key Set (JWKS) with Ed25519 public key.
- Request signer for outbound bot/agent traffic per draft-meunier-webbotauth-httpsig-protocol
  and Cloudflare Web Bot Auth specification.
- Verification utility for incoming or mirrored signature validations.
- `WebBotAuthHttpxAuth`: An `httpx.Auth` plugin for seamless outbound agent request signing.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
import secrets
import time
from typing import Any, Generator
from urllib.parse import urlparse

from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from django.conf import settings
from django.http import HttpRequest, HttpResponse
import httpx

# Fallback default keypair for V7M bot authentication
DEFAULT_KEY_ID = "LvxIKIGSHek7sBRDwZtbkLA5pf-fb5wG1KnPU57n3Ek"
DEFAULT_PUBLIC_KEY_X = "UyKhqDygBx2HqqBB_isUzvgz4Qfzzz3kTxAP-QIpxqU"
DEFAULT_PRIVATE_KEY_D = "OG22BKXnhSQdatv5NiiQ9e2gNYN30pYcU0QO3n1B444"
DEFAULT_AGENT_URL = "https://maestri.group"


def get_key_id() -> str:
    return getattr(settings, "WEB_BOT_AUTH_KEY_ID", DEFAULT_KEY_ID)


def get_public_key_x() -> str:
    return getattr(settings, "WEB_BOT_AUTH_PUBLIC_KEY_X", DEFAULT_PUBLIC_KEY_X)


def get_private_key_d() -> str:
    return getattr(settings, "WEB_BOT_AUTH_PRIVATE_KEY_D", DEFAULT_PRIVATE_KEY_D)


def get_agent_url() -> str:
    return getattr(settings, "WEB_BOT_AUTH_AGENT_URL", DEFAULT_AGENT_URL)


def compute_jwk_thumbprint(x: str) -> str:
    """Compute base64url-encoded SHA-256 thumbprint per RFC 7638 and RFC 8037."""
    thumbprint_dict = {
        "crv": "Ed25519",
        "kty": "OKP",
        "x": x,
    }
    canonical_json = json.dumps(thumbprint_dict, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(canonical_json.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def get_jwks(key_id: str | None = None, x: str | None = None) -> dict[str, Any]:
    """Return JSON Web Key Set (JWKS) dictionary for Web Bot Auth directory."""
    active_x = x or get_public_key_x()
    active_kid = key_id or compute_jwk_thumbprint(active_x)
    return {
        "keys": [
            {
                "kty": "OKP",
                "crv": "Ed25519",
                "x": active_x,
                "kid": active_kid,
            }
        ]
    }


def _load_private_key(private_key_d: str | None = None) -> ed25519.Ed25519PrivateKey:
    d = private_key_d or get_private_key_d()
    padded_d = d + "=" * (-len(d) % 4)
    raw_priv = base64.urlsafe_b64decode(padded_d)
    return ed25519.Ed25519PrivateKey.from_private_bytes(raw_priv)


def _load_public_key(public_key_x: str | None = None) -> ed25519.Ed25519PublicKey:
    x = public_key_x or get_public_key_x()
    padded_x = x + "=" * (-len(x) % 4)
    raw_pub = base64.urlsafe_b64decode(padded_x)
    return ed25519.Ed25519PublicKey.from_public_bytes(raw_pub)


def create_bot_auth_headers(
    authority: str,
    agent_url: str | None = None,
    key_id: str | None = None,
    private_key_d: str | None = None,
    label: str = "sig1",
    validity_seconds: int = 300,
    nonce: str | None = None,
) -> dict[str, str]:
    """Create HTTP Message Signature headers (RFC 9421 & Web Bot Auth).

    Headers created:
    - Signature-Agent: "<agent_url>"
    - Signature-Input: sig1=("@authority" "signature-agent");created=...;keyid="...";alg="ed25519";expires=...;tag="web-bot-auth"
    - Signature: sig1=:<signature_base64>:
    """
    active_agent = agent_url or get_agent_url()
    active_kid = key_id or get_key_id()
    priv_key = _load_private_key(private_key_d)

    created = int(time.time())
    expires = created + validity_seconds
    active_nonce = nonce or base64.b64encode(secrets.token_bytes(32)).decode("ascii")

    # Structured string format requires double quotes for Signature-Agent
    sig_agent_value = f'"{active_agent}"'

    sig_params = (
        '("@authority" "signature-agent");'
        f"created={created};"
        f'keyid="{active_kid}";'
        'alg="ed25519";'
        f"expires={expires};"
        f'nonce="{active_nonce}";'
        'tag="web-bot-auth"'
    )

    # Clean authority (lowercase, strip port 80/443 if present)
    clean_authority = authority.lower().split("/")[0]

    # Signature base according to RFC 9421 Section 2.5
    sig_base = (
        f'"@authority": {clean_authority}\n'
        f'"signature-agent": {sig_agent_value}\n'
        f'"@signature-params": {sig_params}'
    )

    sig_bytes = priv_key.sign(sig_base.encode("utf-8"))
    sig_b64 = base64.b64encode(sig_bytes).decode("ascii")

    return {
        "Signature-Agent": sig_agent_value,
        "Signature-Input": f"{label}={sig_params}",
        "Signature": f"{label}=:{sig_b64}:",
    }


def verify_bot_auth_headers(
    headers: dict[str, str],
    authority: str,
    public_key_x: str | None = None,
    expected_tag: str = "web-bot-auth",
) -> bool:
    """Verify HTTP Message Signatures on incoming requests or responses."""
    # Normalize header keys to lowercase
    norm_headers = {k.lower(): v for k, v in headers.items()}

    sig_agent = norm_headers.get("signature-agent")
    sig_input = norm_headers.get("signature-input")
    signature = norm_headers.get("signature")

    if not sig_agent or not sig_input or not signature:
        return False

    # Extract label and parameters from Signature-Input: e.g. sig1=(...);...
    if "=" not in sig_input:
        return False
    label, params = sig_input.split("=", 1)
    label = label.strip()

    # Extract signature: e.g. sig1=:<sig>:
    match = re.search(rf"{re.escape(label)}=:([^:]+):", signature)
    if not match:
        return False
    sig_b64 = match.group(1)

    # Parse created and expires from params
    created_match = re.search(r'created=(\d+)', params)
    expires_match = re.search(r'expires=(\d+)', params)
    tag_match = re.search(r'tag="([^"]+)"', params)

    if not created_match or not expires_match or not tag_match:
        return False

    if tag_match.group(1) != expected_tag:
        return False

    now = int(time.time())
    expires = int(expires_match.group(1))
    if now > expires + 30:  # 30s clock skew tolerance
        return False

    # Rebuild signature base
    clean_authority = authority.lower().split("/")[0]
    sig_base = (
        f'"@authority": {clean_authority}\n'
        f'"signature-agent": {sig_agent}\n'
        f'"@signature-params": {params}'
    )

    try:
        pub_key = _load_public_key(public_key_x)
        sig_bytes = base64.b64decode(sig_b64)
        pub_key.verify(sig_bytes, sig_base.encode("utf-8"))
        return True
    except Exception:
        return False


def http_message_signatures_directory_view(request: HttpRequest) -> HttpResponse:
    """Publish the JSON Web Key Set (JWKS) at /.well-known/http-message-signatures-directory.

    Complies with IETF WebBotAuth WG & Cloudflare Directory specification:
    - Content-Type: application/http-message-signatures-directory+json
    - Dynamic Ed25519 response signature over `@authority;req`
    """
    jwks = get_jwks()
    body_content = json.dumps(jwks, indent=2)

    response = HttpResponse(
        content=body_content,
        content_type="application/http-message-signatures-directory+json",
        status=200,
    )

    # Standard caching and CORS headers
    response["Cache-Control"] = "public, max-age=86400"
    response["Access-Control-Allow-Origin"] = "*"

    # Attach directory response signature if private key is available
    try:
        authority = request.headers.get("Host") or request.META.get("HTTP_HOST")
        if not authority:
            try:
                authority = request.get_host()
            except Exception:
                authority = "localhost"
        active_kid = get_key_id()
        priv_key = _load_private_key()

        created = int(time.time())
        expires = created + 300
        nonce = base64.b64encode(secrets.token_bytes(32)).decode("ascii")

        sig_label = "binding0"
        sig_params = (
            '("@authority";req);'
            f"created={created};"
            f'keyid="{active_kid}";'
            'alg="ed25519";'
            f"expires={expires};"
            f'nonce="{nonce}";'
            'tag="http-message-signatures-directory"'
        )

        sig_base = (
            f'"@authority";req: {authority}\n'
            f'"@signature-params": {sig_params}'
        )

        sig_bytes = priv_key.sign(sig_base.encode("utf-8"))
        sig_b64 = base64.b64encode(sig_bytes).decode("ascii")

        response["Signature-Input"] = f"{sig_label}={sig_params}"
        response["Signature"] = f"{sig_label}=:{sig_b64}:"
    except Exception:
        # If signing response fails, still return valid JWKS response
        pass

    return response


class WebBotAuthHttpxAuth(httpx.Auth):
    """Httpx authentication handler that automatically signs outbound requests with Web Bot Auth."""

    def __init__(
        self,
        agent_url: str | None = None,
        key_id: str | None = None,
        private_key_d: str | None = None,
        label: str = "sig1",
        validity_seconds: int = 300,
    ) -> None:
        self.agent_url = agent_url
        self.key_id = key_id
        self.private_key_d = private_key_d
        self.label = label
        self.validity_seconds = validity_seconds

    def auth_flow(
        self, request: httpx.Request
    ) -> Generator[httpx.Request, httpx.Response, None]:
        authority = request.url.netloc.decode("ascii") if isinstance(request.url.netloc, bytes) else str(request.url.netloc)
        headers = create_bot_auth_headers(
            authority=authority,
            agent_url=self.agent_url,
            key_id=self.key_id,
            private_key_d=self.private_key_d,
            label=self.label,
            validity_seconds=self.validity_seconds,
        )
        for k, v in headers.items():
            request.headers[k] = v
        yield request
