"""Provisionamento de um app: uma chamada, uma conta pronta para usar.

Um "app integrado" é uma `Account` com: API key, um número de WhatsApp com
instância nos DOIS Evolutions (mesmo número), caixa no mailcow com a
`MailIdentity` correspondente, vozes de TTS e os templates do seed.

Duas decisões que valem o comentário:

1. **Idempotente, nunca destrutivo.** Reprovisionar reaproveita o que já existe.
   Nada aqui apaga instância nem caixa: apagar instância destrói a credencial da
   sessão e obriga novo pareamento com o celular na mão.

2. **Falha parcial é reportada, não escondida.** Cada passo devolve seu próprio
   status. Se o mailcow estiver fora, a conta e o WhatsApp ficam prontos e o
   passo de e-mail volta `failed` com o motivo — em vez de um 500 que não diz o
   que ficou feito e o que não ficou.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from typing import Any

import structlog
from django.conf import settings
from django.utils.text import slugify

from accounts.models import Account, ApiKey
from channels.models import DRIVER_GO, DRIVER_V2, MailIdentity, TtsVoices, WhatsAppNumber

logger = structlog.get_logger()

OK, REUSED, SKIPPED, FAILED = "ok", "reused", "skipped", "failed"


@dataclass
class Step:
    name: str
    status: str
    detail: str = ""
    data: dict = field(default_factory=dict)


@dataclass
class ProvisionReport:
    account_slug: str
    steps: list[Step] = field(default_factory=list)
    api_key: str | None = None  # só quando gerada AGORA — não é recuperável depois

    def add(self, name: str, status: str, detail: str = "", **data) -> None:
        self.steps.append(Step(name=name, status=status, detail=detail, data=data))

    @property
    def failed(self) -> list[str]:
        return [s.name for s in self.steps if s.status == FAILED]

    def as_dict(self) -> dict[str, Any]:
        return {
            "account": self.account_slug,
            "api_key": self.api_key,
            "failed": self.failed,
            "steps": [
                {"name": s.name, "status": s.status, "detail": s.detail, **s.data}
                for s in self.steps
            ],
        }


def provision_app(
    *,
    slug: str,
    name: str = "",
    phone_number: str = "",
    instance_name: str = "",
    driver: str = DRIVER_V2,
    fallback_driver: str = DRIVER_GO,
    email_local_part: str = "",
    email_domain: str = "",
    mail_from_name: str = "",
    voice_male: str = "",
    voice_female: str = "",
    webhook_url: str = "",
    webhook_secret: str = "",
    seed_templates: bool = True,
    rotate_api_key: bool = False,
    rotate_mail_password: bool = False,
) -> ProvisionReport:
    slug = slugify(slug)
    if not slug:
        raise ValueError("slug obrigatório")
    name = name or slug
    instance_name = instance_name or slug
    report = ProvisionReport(account_slug=slug)

    account = _step_account(report, slug, name)
    _step_api_key(report, account, rotate_api_key)
    v2_ok = _step_v2(report, instance_name, phone_number)
    go_token = _step_go(report, instance_name)
    _step_number(
        report,
        account=account,
        instance_name=instance_name,
        phone_number=phone_number,
        driver=driver,
        fallback_driver=fallback_driver,
        go_token=go_token,
        v2_ok=v2_ok,
    )
    _step_mail(
        report,
        account=account,
        local_part=email_local_part,
        domain=email_domain,
        from_name=mail_from_name or name,
        rotate=rotate_mail_password,
    )
    _step_tts(report, account, voice_male, voice_female)
    _step_mail_template(report, account)
    _step_webhook(report, account, webhook_url, webhook_secret)
    _step_templates(report, account, seed_templates)

    logger.info(
        "provisioning.done", account=slug, falhas=report.failed, passos=len(report.steps)
    )
    return report


# ── passos ──────────────────────────────────────────────────────────────────

def _step_account(report: ProvisionReport, slug: str, name: str) -> Account:
    account, created = Account.objects.get_or_create(slug=slug, defaults={"name": name})
    if not created and account.name != name and name != slug:
        account.name = name
        account.save(update_fields=["name"])
    report.add("account", OK if created else REUSED, detail=account.name)
    return account


def _step_api_key(report: ProvisionReport, account: Account, rotate: bool) -> None:
    tem_ativa = account.api_keys.filter(is_active=True).exists()
    if tem_ativa and not rotate:
        # A key só existe em claro no momento da criação; reprovisionar não pode
        # invalidar a que o app já usa.
        report.add("api_key", REUSED, detail="conta já tem key ativa")
        return
    raw = secrets.token_urlsafe(32)
    ApiKey.objects.create(
        account=account,
        key_hash=ApiKey.hash_key(raw),
        label="provisionada" if not rotate else "rotacionada",
    )
    report.api_key = raw
    report.add("api_key", OK, detail="mostrada uma única vez")


def _step_v2(report: ProvisionReport, instance_name: str, phone_number: str) -> bool:
    from whatsapp import provisioning as wa

    try:
        _instance, created = wa.v2_ensure_instance(
            instance_name=instance_name, phone_number=phone_number
        )
        try:
            wa.v2_set_webhook(instance_name)
            hook = OK
        except Exception as exc:  # noqa: BLE001
            hook = f"webhook falhou: {type(exc).__name__}"
        report.add(
            "evolution_v2", OK if created else REUSED, detail=f"webhook: {hook}",
            instance=instance_name,
        )
        return True
    except Exception as exc:  # noqa: BLE001
        report.add("evolution_v2", FAILED, detail=f"{type(exc).__name__}: {exc}"[:300])
        return False


def _step_go(report: ProvisionReport, instance_name: str) -> str:
    from whatsapp import provisioning as wa

    try:
        instance, created = wa.go_ensure_instance(instance_name=instance_name)
        token = str(instance.get("token") or "")
        detail = "sem token na resposta" if not token else "webhook registrado"
        if token:
            try:
                wa.go_set_webhook(token, instance_name)
            except Exception as exc:  # noqa: BLE001
                detail = f"webhook falhou: {type(exc).__name__}"
        report.add(
            "evolution_go", OK if created else REUSED, detail=detail, instance=instance_name
        )
        return token
    except Exception as exc:  # noqa: BLE001
        report.add("evolution_go", FAILED, detail=f"{type(exc).__name__}: {exc}"[:300])
        return ""


def _step_number(
    report: ProvisionReport,
    *,
    account: Account,
    instance_name: str,
    phone_number: str,
    driver: str,
    fallback_driver: str,
    go_token: str,
    v2_ok: bool,
) -> None:
    number, created = WhatsAppNumber.objects.get_or_create(
        account=account,
        slug="principal",
        defaults={"instance_name": instance_name, "is_default": True},
    )
    number.instance_name = instance_name
    number.phone_number = phone_number or number.phone_number
    number.driver = driver
    number.fallback_driver = fallback_driver if fallback_driver != driver else ""
    number.is_default = True
    if go_token:
        number.set_go_token(go_token)
    number.save()

    aviso = "" if v2_ok else " (v2 indisponível — cadeia pode cair só na GO)"
    report.add(
        "whatsapp_number",
        OK if created else REUSED,
        detail=f"cadeia: {' → '.join(number.driver_chain)}{aviso}",
        instance=instance_name,
        phone=number.phone_number,
    )


def _step_mail(
    report: ProvisionReport,
    *,
    account: Account,
    local_part: str,
    domain: str,
    from_name: str,
    rotate: bool,
) -> None:
    if not local_part or not domain:
        report.add("mailcow", SKIPPED, detail="email_local_part/email_domain não informados")
        return

    username = f"{local_part}@{domain}"
    try:
        from mail.mailcow import get_client

        with get_client() as mc:
            if domain not in mc.list_domains():
                report.add(
                    "mailcow", FAILED, detail=f"domínio '{domain}' não existe no mailcow"
                )
                return
            _mailbox, senha, criada = mc.ensure_mailbox(
                local_part=local_part, domain=domain, name=from_name, rotate_password=rotate
            )
        report.add("mailcow", OK if criada else REUSED, detail=username)
    except Exception as exc:  # noqa: BLE001
        report.add("mailcow", FAILED, detail=f"{type(exc).__name__}: {exc}"[:300])
        return

    identity = MailIdentity.objects.filter(account=account, from_email=username).first()
    if identity is None:
        if senha is None:
            # Caixa preexistente cuja senha não conhecemos: sem MailIdentity o
            # canal de e-mail não sobe. Rotacionar é decisão do operador.
            report.add(
                "mail_identity",
                FAILED,
                detail="caixa já existia e a senha não é recuperável — reprovisione com rotate_mail_password=true",
            )
            return
        identity = MailIdentity(account=account, from_email=username)

    identity.smtp_host = getattr(settings, "MAILCOW_SMTP_HOST", "mail.v7m.org")
    identity.smtp_port = int(getattr(settings, "MAILCOW_SMTP_PORT", 587))
    identity.smtp_user = username
    identity.from_name = from_name
    identity.is_default = not MailIdentity.objects.filter(
        account=account, is_default=True
    ).exclude(pk=identity.pk).exists()
    if senha is not None:
        from mail import crypto

        identity.smtp_password = crypto.encrypt(senha)
    identity.save()
    report.add("mail_identity", OK, detail=f"{from_name} <{username}>")


def _step_tts(
    report: ProvisionReport, account: Account, voice_male: str, voice_female: str
) -> None:
    from tts.client import DEFAULT_VOICE_FEMALE, DEFAULT_VOICE_MALE

    voices, created = TtsVoices.objects.get_or_create(
        account=account,
        defaults={
            # Regra cruzada da casa: homem recebe voz feminina e vice-versa.
            "voice_male": voice_male or DEFAULT_VOICE_FEMALE,
            "voice_female": voice_female or DEFAULT_VOICE_MALE,
        },
    )
    if not created and (voice_male or voice_female):
        voices.voice_male = voice_male or voices.voice_male
        voices.voice_female = voice_female or voices.voice_female
        voices.save()
    report.add(
        "tts_voices",
        OK if created else REUSED,
        detail=f"M→{voices.voice_male} · F→{voices.voice_female}",
    )


def _step_mail_template(report: ProvisionReport, account: Account) -> None:
    """Dá à conta o próprio shell de e-mail, copiado do default.

    Um app novo já nasce com marca editável em vez de herdar a marca de outro
    app por um `if` no despacho. Quem não quiser mexer fica com o visual padrão.
    """
    from channels.models import MailTemplate
    from mail import templates as mail_templates

    existing = MailTemplate.objects.filter(account=account).first()
    if existing is not None:
        report.add("mail_template", REUSED, detail="conta já tem shell próprio")
        return
    base = mail_templates.DEFAULT_SHELL_HTML
    if not base:
        report.add("mail_template", SKIPPED, detail="default.html ausente")
        return
    MailTemplate.objects.create(account=account, html=base, brand_name=account.name)
    report.add("mail_template", OK, detail=f"shell próprio ({len(base)} bytes)")


def _step_webhook(
    report: ProvisionReport, account: Account, url: str, secret: str
) -> None:
    """Registra para onde o notify devolve status e mensagens recebidas."""
    from channels.models import AppWebhook

    if not url:
        report.add("app_webhook", SKIPPED, detail="webhook_url não informado")
        return
    hook, created = AppWebhook.objects.get_or_create(
        account=account, defaults={"url": url, "secret": secret}
    )
    if not created:
        hook.url = url or hook.url
        if secret:
            hook.secret = secret
        hook.active = True
        hook.save()
    report.add("app_webhook", OK if created else REUSED, detail=hook.url)


def _step_templates(report: ProvisionReport, account: Account, seed: bool) -> None:
    if not seed:
        report.add("templates", SKIPPED, detail="seed_templates=false")
        return
    if account.templates.exists():
        report.add(
            "templates", REUSED, detail=f"{account.templates.count()} templates já existem"
        )
        return
    try:
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command("notify_seed", account=account.slug, stdout=out)
        report.add("templates", OK, detail=out.getvalue().strip()[:200])
    except Exception as exc:  # noqa: BLE001
        report.add("templates", FAILED, detail=f"{type(exc).__name__}: {exc}"[:300])
