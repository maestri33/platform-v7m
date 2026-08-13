import pytest


@pytest.mark.django_db
def test_root_shows_bootstrap_until_readiness_is_completed(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "Configurar Notify Server" in response.content.decode()
    assert "Etapas de instalação" in response.content.decode()
    assert "Serviços" in response.content.decode()


@pytest.mark.django_db
def test_completion_requires_approved_readiness(client):
    client.post(
        "/controlpanel/readiness/",
        {"database_ready": "on", "queue_ready": "on", "whatsapp_ready": "on"},
    )

    response = client.post("/controlpanel/complete/")

    assert response.status_code == 409
    assert "Readiness ainda não aprovado" in response.content.decode()


@pytest.mark.django_db
def test_control_actions_reject_get_requests(client):
    for path in (
        "/controlpanel/readiness/",
        "/controlpanel/complete/",
        "/controlpanel/reopen/",
    ):
        assert client.get(path).status_code == 405


@pytest.mark.django_db
def test_approved_readiness_allows_completion_and_replaces_bootstrap(client):
    readiness = client.post(
        "/controlpanel/readiness/",
        {
            "database_ready": "on",
            "queue_ready": "on",
            "whatsapp_ready": "on",
            "mail_ready": "on",
        },
    )
    assert readiness.status_code == 302

    completion = client.post("/controlpanel/complete/")
    assert completion.status_code == 302
    assert completion.headers["Location"] == "/"

    response = client.get("/")
    content = response.content.decode()
    assert response.status_code == 200
    assert "Painel do Notify Server" in content
    assert "Configurar Notify Server" not in content


@pytest.mark.django_db
def test_reopen_is_explicit_and_restricted_to_local_requests(client):
    client.post(
        "/controlpanel/readiness/",
        {
            "database_ready": "on",
            "queue_ready": "on",
            "whatsapp_ready": "on",
            "mail_ready": "on",
        },
    )
    client.post("/controlpanel/complete/")

    denied = client.post("/controlpanel/reopen/", REMOTE_ADDR="198.51.100.7")
    assert denied.status_code == 403
    # LocalOnlyMiddleware bloqueia antes de chegar no view
    assert "rede local" in denied.content.decode()

    reopened = client.post("/controlpanel/reopen/", REMOTE_ADDR="127.0.0.1")
    assert reopened.status_code == 302
    assert reopened.headers["Location"] == "/"
    assert "Configurar Notify Server" in client.get("/").content.decode()


@pytest.mark.django_db
def test_readiness_is_a_persistent_singleton(client):
    from controlpanel.models import ControlPanelState

    first = ControlPanelState.load()
    second = ControlPanelState.load()

    assert first.pk == ControlPanelState.SINGLETON_PK
    assert second.pk == first.pk
    assert ControlPanelState.objects.count() == 1
