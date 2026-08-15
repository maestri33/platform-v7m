# Mapa de capacidades — Evolution v2 × Evolution GO

Regra da casa: **v2 é a base, GO é o fallback**. A cascata tenta a v2, retenta
com backoff (`WHATSAPP_RETRY_ATTEMPTS` × `WHATSAPP_RETRY_BACKOFF_S`) e só então
cai para a GO — exclusivamente em `WhatsAppSessionDown` (sessão fora). Erro de
negócio (número inválido, mídia recusada) nunca é retentado nem cai de provedor.

## Exceção: recursos GO-first

Alguns recursos a v2 não cobre (ou cobre mal). Para esses, a cadeia é
**reordenada** — a GO assume a frente e a v2 vira o fallback. O mapa vive em
`whatsapp/capabilities.py` e a lista ativa vem do `.env`
(`WHATSAPP_GO_FIRST_FEATURES`).

| Recurso | Provedor | Por quê |
|---|---|---|
| `voice_note` (PTT — "balãozinho" de áudio com forma de onda) | **GO primeiro** | A GO baixa o MP3 do TTS e converte para Opus/PTT antes de entregar; pela v2 o áudio pode chegar como arquivo comum, sem o balão de nota de voz. |
| `poll` (enquete clicável) | **GO primeiro** (só ela tem) | `POST /send/poll` — **testado em produção 2026-08-02, entregue** no destino de controle. Exposto em `POST /notify` → `options.poll`. Sem GO, degrada para texto numerado. |
| `location` (pin de localização) | **GO primeiro** (só ela tem) | `POST /send/location` — **testado em produção, entregue**. Disponível no driver (`send_location`). |
| texto, mídia (imagem/vídeo/documento), check de números | v2 primeiro | Cobertos pela v2; GO só como fallback de sessão. |

## Interativas bloqueadas PELO WHATSAPP (não pelo notify)

Testadas na prática em 2026-08-02 pela instância `default` (logada):

- `POST /send/button` → a GO aceita o payload, o **servidor do WhatsApp recusa
  com erro 473** (consistente em retry);
- `POST /send/list` → idem, **erro 405**.

Botões e listas interativas exigem a WhatsApp Business API oficial; para conta
normal (Baileys/whatsmeow) o servidor rejeita. O "balãozinho" clicável viável é
a **poll** — e ela está no produto.

Sem GO na cadeia do número (sem `fallback_driver` e sem token), a ordem fica
como está e um warning `whatsapp.capabilities.go_ausente` é logado — inventar
um provedor sem credencial só trocaria um erro por outro.

## Rastro por envio

Cada `Notification` grava:

- `driver_used` — provedor que efetivamente entregou;
- `driver_reason` — vazio quando o preferido respondeu de primeira; senão
  `retry ok (2ª tentativa)` ou `fallback→evolution-go (v2: <erro>)` ou
  `todos fora: <motivos>`.

Testes: `tests/test_cascade_retry.py` e `tests/test_whatsapp_cascade.py`.
