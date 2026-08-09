from mail import templates
from mail.client import get_client_from_identity


def test_v7m_template_has_its_own_identity():
    html = templates.render("v7m", title="Cadastro aprovado", content="Tudo certo.")

    assert "Rede de promotores" in html
    assert "https://app.v7m.org" in html
    assert "https://job.v7m.org/privacidade/" in html
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
