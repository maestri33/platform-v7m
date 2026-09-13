from __future__ import annotations

import importlib

import pytest


@pytest.mark.parametrize(
    ("module_name", "dependency_names"),
    [
        (
            "users.roles.enrollment.address_proof",
            ("_advance_address", "_enrollment_for_coordinator", "_notify_resolution"),
        ),
        (
            "users.roles.enrollment.coordinator",
            ("DomainError", "fee_facts", "_rg_started_at"),
        ),
        ("users.roles.enrollment.fees", ("_set_status",)),
        ("users.roles.enrollment.fees_events", ("_set_status",)),
        ("users.roles.enrollment.rg", ("_advance_to_release", "_finish_rg")),
        ("users.roles.enrollment.rg_ai", ("_finish_rg", "_rg_extract_and_finish")),
        (
            "users.roles.enrollment.rg_decision",
            (
                "_RG_SLOT_FIELD",
                "_apply_rg_extracted",
                "_enrollment_for_coordinator",
                "_finish_rg",
                "_rg_post_approval",
            ),
        ),
        (
            "users.roles.enrollment.rg_extraction",
            ("_advance_rg", "_notify_rg_approved"),
        ),
        ("users.roles.enrollment.selfie_ai", ("_enrollment_for_coordinator",)),
    ],
)
def test_enrollment_modules_bind_extracted_dependencies(
    module_name: str, dependency_names: tuple[str, ...]
) -> None:
    """The service split must not leave names to fail only when a route executes."""
    module = importlib.import_module(module_name)
    missing = [name for name in dependency_names if not hasattr(module, name)]
    assert missing == []
