from pathlib import Path

from mail import templates
from mail.client import get_client_from_identity
from seed import io as seed_io


V7M_EVENTS = {
    "candidate.awaiting_approval",
    "candidate.doc_type_reset",
    "candidate.document_approved",
    "candidate.document_in_review",
    "candidate.document_rejected",
    "candidate.address_proof_rejected",
    "candidate.rejected",
    "candidate.selfie_approved",
    "candidate.selfie_in_review",
    "candidate.selfie_rejected",
    "enrollment.awaiting_release",
    "enrollment.fee_due_paid",
    "enrollment.fee_paid",
    "enrollment.fee_problem",
    "enrollment.fee_scheduled",
    "enrollment.rg_in_review",
    "enrollment.selfie_in_review",
    "enrollment.concluded_referral",
    "finance.commission_paid",
    "hub.coordinator_assigned",
    "lead.captured.promoter",
    "lead.paid.coordinator",
    "lead.paid.promoter",
    "lead.paid.promoter.scholarship",
    "promoter.scholarship_enrolled",
    "promoter.reactivated",
    "promoter.suspended",
    "student.document_in_review",
    "student.exam_scheduled",
    "student.veteran.coordinator",
    "training.approved",
    "training.approved.scholarship",
    "training.cleared",
    "training.must_train",
    "training.must_train.scholarship",
    "training.new_material",
}


def test_v7m_template_has_its_own_identity():
    html = templates.render("v7m", title="Cadastro aprovado", content="Tudo certo.")

    assert "Rede de promotores" in html
    assert "https://app.maestri.group" in html
    assert "https://maestri.group/privacidade/" in html
    assert "https://app.supletivo.net.br" not in html


def test_supletivo_template_has_its_own_identity():
    html = templates.render("supletivo", title="Matrícula confirmada", content="Tudo certo.")

    assert "Supletivo <span" in html
    assert "https://app.supletivo.net.br" in html
    assert "https://supletivo.net.br/privacidade/" in html
    assert "https://app.v7m.org" not in html


def test_legacy_student_templates_use_supletivo_shell():
    assert templates.render("welcome", title="Bem-vindo", content="Olá") == templates.render(
        "supletivo", title="Bem-vindo", content="Olá"
    )


def test_sender_name_can_follow_the_brand():
    class Identity:
        smtp_host = "smtp.example.com"
        smtp_port = 587
        smtp_user = "user"
        smtp_password = "secret"
        from_email = "noreply@v7m.org"
        from_name = "Nome padrão"
        timeout = 10

    client = get_client_from_identity(Identity(), from_name="V7M")

    assert client.from_header == "V7M <noreply@v7m.org>"


def test_seed_assigns_every_event_to_a_brand():
    seed_path = Path(__file__).resolve().parents[1] / "seed" / "templates.md"
    specs = seed_io.parse(seed_path.read_text(encoding="utf-8"))

    assert all(spec.mail_template in {"supletivo", "v7m"} for spec in specs)
    assert {spec.event for spec in specs if spec.mail_template == "v7m"} == V7M_EVENTS
