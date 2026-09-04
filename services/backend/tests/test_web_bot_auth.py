"""Tests for Web Bot Auth HTTP Message Signatures directory and request signing."""

import base64
import json
import time
from unittest.mock import patch

from django.test import RequestFactory
import httpx
import pytest

from core.web_bot_auth import (
    DEFAULT_KEY_ID,
    DEFAULT_PUBLIC_KEY_X,
    WebBotAuthHttpxAuth,
    compute_jwk_thumbprint,
    create_bot_auth_headers,
    get_jwks,
    http_message_signatures_directory_view,
    verify_bot_auth_headers,
)


@pytest.mark.django_db
class TestWebBotAuth:
    """Test suite for Web Bot Auth directory and cryptographic signatures."""

    def test_compute_jwk_thumbprint(self):
        """Verify RFC 7638 / RFC 8037 SHA-256 thumbprint for Ed25519 OKP key."""
        kid = compute_jwk_thumbprint(DEFAULT_PUBLIC_KEY_X)
        assert kid == DEFAULT_KEY_ID
        assert len(kid) > 20

    def test_get_jwks_structure(self):
        """Verify JWKS format matches IETF and Cloudflare requirements."""
        jwks = get_jwks()
        assert "keys" in jwks
        assert len(jwks["keys"]) == 1
        key = jwks["keys"][0]
        assert key["kty"] == "OKP"
        assert key["crv"] == "Ed25519"
        assert key["x"] == DEFAULT_PUBLIC_KEY_X
        assert key["kid"] == DEFAULT_KEY_ID
        assert "d" not in key  # Private key MUST NEVER be leaked in public JWKS

    def test_directory_view_returns_correct_content_type_and_headers(self):
        """Endpoint MUST serve application/http-message-signatures-directory+json."""
        factory = RequestFactory()
        request = factory.get(
            "/.well-known/http-message-signatures-directory",
            HTTP_HOST="maestri.group",
        )
        response = http_message_signatures_directory_view(request)

        assert response.status_code == 200
        assert response["Content-Type"] == "application/http-message-signatures-directory+json"
        assert "public" in response["Cache-Control"]
        assert response["Access-Control-Allow-Origin"] == "*"

        # Check directory response signature headers
        assert "Signature" in response
        assert "Signature-Input" in response
        assert 'tag="http-message-signatures-directory"' in response["Signature-Input"]
        assert f'keyid="{DEFAULT_KEY_ID}"' in response["Signature-Input"]
        assert 'binding0=:' in response["Signature"]

        data = json.loads(response.content)
        assert "keys" in data
        assert len(data["keys"]) == 1
        assert data["keys"][0]["x"] == DEFAULT_PUBLIC_KEY_X

    def test_create_bot_auth_headers(self):
        """Outbound signed request headers must comply with RFC 9421 and Cloudflare."""
        authority = "crawltest.com"
        headers = create_bot_auth_headers(
            authority=authority,
            agent_url="https://maestri.group",
            validity_seconds=120,
        )

        assert "Signature-Agent" in headers
        assert "Signature-Input" in headers
        assert "Signature" in headers

        # Structured string MUST be wrapped in double quotes
        assert headers["Signature-Agent"] == '"https://maestri.group"'

        sig_input = headers["Signature-Input"]
        assert sig_input.startswith("sig1=")
        assert '("@authority" "signature-agent")' in sig_input
        assert f'keyid="{DEFAULT_KEY_ID}"' in sig_input
        assert 'alg="ed25519"' in sig_input
        assert 'tag="web-bot-auth"' in sig_input
        assert "created=" in sig_input
        assert "expires=" in sig_input
        assert "nonce=" in sig_input

        sig = headers["Signature"]
        assert sig.startswith("sig1=:")
        assert sig.endswith(":")

    def test_verify_bot_auth_headers_success(self):
        """Verification passes for untampered request."""
        authority = "example.org"
        headers = create_bot_auth_headers(authority=authority)
        is_valid = verify_bot_auth_headers(headers, authority=authority)
        assert is_valid is True

    def test_verify_bot_auth_headers_tampered_authority(self):
        """Verification fails if target authority was modified (prevent replay against other hosts)."""
        authority = "example.org"
        headers = create_bot_auth_headers(authority=authority)
        is_valid = verify_bot_auth_headers(headers, authority="attacker.org")
        assert is_valid is False

    def test_verify_bot_auth_headers_tampered_signature(self):
        """Verification fails if signature bits were tampered."""
        authority = "example.org"
        headers = create_bot_auth_headers(authority=authority)
        # Corrupt signature
        headers["Signature"] = "sig1=:AAAA" + headers["Signature"][8:]
        is_valid = verify_bot_auth_headers(headers, authority=authority)
        assert is_valid is False

    def test_verify_bot_auth_headers_expired(self):
        """Verification fails if timestamp is in the past."""
        authority = "example.org"
        # Expired 100 seconds ago
        headers = create_bot_auth_headers(
            authority=authority,
            validity_seconds=-100,
        )
        is_valid = verify_bot_auth_headers(headers, authority=authority)
        assert is_valid is False

    def test_httpx_auth_interceptor(self):
        """WebBotAuthHttpxAuth injects headers into outbound httpx requests."""
        auth = WebBotAuthHttpxAuth(agent_url="https://maestri.group")
        req = httpx.Request("GET", "https://crawltest.com/cdn-cgi/web-bot-auth")
        
        # Run auth flow
        flow = auth.auth_flow(req)
        signed_req = next(flow)

        assert "Signature-Agent" in signed_req.headers
        assert signed_req.headers["Signature-Agent"] == '"https://maestri.group"'
        assert "Signature-Input" in signed_req.headers
        assert "Signature" in signed_req.headers

        # Verify signature on signed_req
        headers_dict = dict(signed_req.headers)
        assert verify_bot_auth_headers(headers_dict, authority="crawltest.com") is True
