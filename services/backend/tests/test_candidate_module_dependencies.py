from __future__ import annotations

import importlib

import pytest


@pytest.mark.parametrize(
    ("module_name", "dependency_names"),
    [
        ("users.roles.candidate.capture", ("NotFound",)),
        (
            "users.roles.candidate.address_proof",
            ("_S", "_advance_address", "_complete_candidate"),
        ),
        (
            "users.roles.candidate.coordinator_queries",
            ("_sweep_stale_reviews", "_selfie_dict"),
        ),
        (
            "users.roles.candidate.documents_ai",
            ("_advance_documents",),
        ),
        (
            "users.roles.candidate.documents_decision",
            ("_apply_doc_extracted", "_doc_started_at", "me_dict"),
        ),
        (
            "users.roles.candidate.selfie",
            ("_save_selfie",),
        ),
    ],
)
def test_candidate_modules_bind_extracted_dependencies(
    module_name: str, dependency_names: tuple[str, ...]
) -> None:
    """The service split must not leave names to fail only when a route executes."""
    module = importlib.import_module(module_name)

    missing = [name for name in dependency_names if not hasattr(module, name)]

    assert missing == []
