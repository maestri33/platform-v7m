# Arquitetura de canais — e como plugar SMS

## Como um envio flui

```
POST /notify (ou /v1/send, /v1/send-event, MCP)
  → autentica (API key → Account)
  → Notification criada (canal decidido pela presença do destino)
  → Django-Q → notify.dispatch.dispatch  (ou inline com run_sync)
      FASE 1   claim transacional (pending → sending)
      FASE 1.5 IA adapta conteúdo por canal (fail-open — ai/adapt.py)
      FASE 2   senders por canal
      FASE 3   resultado + webhook do app; falha transitória → pending + retry
```

## Canais nativos

- **whatsapp** — `notify/dispatch.py` + `whatsapp/` (interface `WhatsAppDriver`,
  cascata v2→GO com retry/backoff, mapa de capacidades GO-first para voice note).
- **email** — `notify/dispatch.py` + `mail/` (MailIdentity SMTP da conta,
  shell/assunto do `MailTemplate` da conta).
- **tts** — não é canal isolado: é o WhatsApp entregando nota de voz.

## Canais plugáveis (registry) — SMS

O slot de SMS já existe de ponta a ponta: `Notification.want_sms`,
`sms_status`, `sms_error`, `CHANNEL_SMS` nos models, status no webhook do app
(`sms_status` no payload) e despacho no dispatch via
`notify/channels_registry.py`.

Para ligar um gateway de SMS de verdade:

1. Implementar o sender (qualquer módulo, ex. `sms/gateway.py`):

   ```python
   def send_sms(notif) -> None:
       resposta = meu_gateway.enviar(notif.recipient_phone, notif.text)
       notif.sms_status = "sent"          # ou "failed" + notif.sms_error
   ```

2. Registrar no boot do app (ex.: `AppConfig.ready()`):

   ```python
   from notify import channels_registry
   channels_registry.register("sms", send_sms)
   ```

3. Criar a Notification com `want_sms=True, sms_status="pending"` (hoje o
   default é `skipped`; quando o gateway existir, o `send()` da interface passa
   a aceitar o canal).

Sem sender registrado, um SMS pendente sai `skipped` com
`sms_error="sem provedor de sms registrado"` — visível no painel, nunca um
`sent` de mentira. Prova em `tests/test_channels_registry.py`:
o teste pluga um sender fake e o dispatch entrega **sem nenhuma alteração no
código do dispatch**.
