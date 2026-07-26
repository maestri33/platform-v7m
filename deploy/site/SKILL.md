---
name: notify
description: Operar e diagnosticar o notify-server multi-tenant da V7M/Supletivo por HTTP, incluindo saúde, histórico, status, verificação de WhatsApp, texto, eventos, mídia e TTS. Usar quando o usuário mencionar notify, notificações, OTP, WhatsApp do backend V7M, mídia, nota de voz, TTS, templates ou o serviço notify.v7m.org.
---

# Notify

Usar `scripts/notify_api.py` como cliente determinístico da API. O serviço de
produção responde em `http://notify.v7m.org:80`; a porta 80 é terminada pelo
Caddy, vinculado somente a `10.1.30.114`, e encaminhada ao Django na porta 8100.

## Configuração

- Ler `NOTIFY_SERVER_URL`; usar `http://notify.v7m.org:80` como padrão.
- Ler `NOTIFY_API_KEY` somente do ambiente.
- Nunca imprimir, persistir ou inserir a chave em comandos, arquivos ou respostas.
- Ler `references/api.md` somente quando precisar montar payloads ou interpretar status.

## Fluxo

1. Começar com `python scripts/notify_api.py health`.
2. Para diagnóstico, usar `notifications`, `get` ou `phone-check`.
3. Tratar `sent` como aceitação confirmada pelo notify; verificar também
   `attempts`, `whatsapp_error` e `tts_error`.
4. Antes de qualquer envio real, declarar exatamente destinatário, instância,
   conteúdo e tipo de mídia. Usar `--confirm-send`; o script recusa envio sem essa flag.
5. Para TTS, informar `--tts`; a entrega ocorre como nota de voz pelo WhatsApp.
6. Para mídia, fornecer URL HTTP(S) alcançável pelo Evolution GO e um tipo entre
   `image`, `video`, `audio` ou `document`.

## Segurança

- Fazer leituras diretamente quando responderem ao pedido.
- Enviar apenas com autorização do usuário. A autorização permanente conhecida
  limita testes ao número do próprio usuário.
- Não reenviar OTPs antigos nem mensagens com estado `sent`.
- Usar uma chave de idempotência estável em testes repetíveis.
- Manter conteúdo e dados pessoais ocultos por padrão; o cliente já redige esses campos.
- Não alterar templates, contas, números ou gatilhos sem pedido explícito.
- Nunca publicar o notify no proxy reverso da internet, criar DNAT para o CT,
  habilitar TLS público ou trocar o bind privado por wildcard.
- Considerar correto somente quando o acesso pela VPN retorna 200 e o acesso
  externo não consegue rotear o endereço privado.

## Exemplos

```powershell
python scripts/notify_api.py health
python scripts/notify_api.py notifications --caller users.auth.otp --limit 10
python scripts/notify_api.py get <external_id>
python scripts/notify_api.py phone-check 55...
python scripts/notify_api.py send --phone 55... --text "Teste técnico" --whatsapp --idempotency-key teste-1 --confirm-send
python scripts/notify_api.py send --phone 55... --text "Teste de voz" --tts --idempotency-key tts-1 --confirm-send
```
