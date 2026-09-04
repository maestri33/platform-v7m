# Relatório de Auditoria, Homologação e Testes de Integrações Externas (Issue #5)

**Data da Auditoria:** 27/08/2026  
**Status:** HOMOLOGADO & PROTEGIDO COM SUÍTE HERMÉTICA DUAL-TIER  
**Escopo:** OmniRoute AI Gateway (LLM/OCR/TTS), Cloudflare Turnstile e Stalwart Mail Server.

---

## 1. Sumário Executivo

Este documento consolida a arquitetura, contratos de integração, testes automatizados e procedimentos de contingência para os três componentes externos essenciais da plataforma **V7M**:
1. **OmniRoute AI Gateway** (`10.0.1.135` / CT 1135): Centralização de LLMs OpenAI-compatible, visão multimodal para OCR de documentos e motor de TTS com regra cruzada de gênero.
2. **Cloudflare Turnstile**: Proteção anti-bot nas bordas e verificação server-side no Django Ninja (`/api/v1/tools/turnstile/verify` e formulários públicos).
3. **Stalwart Mail Server** (`10.0.1.20` / CT 120): Servidor de e-mail corporativo em Rust (JMAP RFC 8620 + SMTP 587 STARTTLS) e ingestão monotônica de webhooks de bounce/entrega.

---

## 2. Matriz de Integrações e Resiliência

| Componente | Endpoints / Protocolos | Função no V7M | Fallback Primário | Fallback Secundário |
|---|---|---|---|---|
| **OmniRoute LLM** | `POST /v1/chat/completions` (CT 135) | Chatbot, síntese, correção de dados | DeepSeek / DashScope | Gemini OpenAI-compatible |
| **OmniRoute OCR** | `POST /v1/chat/completions` (CT 135) | Extração de texto de RG/CNH/Comprovantes | Google Cloud Vision API (`VisionOCRClient`) | Falha graciosa para mesa manual |
| **OmniRoute TTS** | `POST /v1/audio/speech` (CT 135) | Notas de voz WhatsApp (Victor Rule) | MiniMax Speech -> OpenAI TTS -> Deepgram Aura | Sintético local OGG Opus |
| **Cloudflare Turnstile** | `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` | Proteção contra spam/bots em formulários | Chaves de teste (CI/Bypass) | `TURNSTILE_ENABLED=False` (Dev) |
| **Stalwart Mail** | `POST /jmap/` e SMTP `587` (CT 120) | Criação de caixas e envio de e-mails | Retries exponenciais no `notify-server` | Enfileiramento em banco |

---

## 3. Detalhamento Técnico das Implementações

### 3.1. OmniRoute AI Gateway & OCR/TTS
- **Cliente OCR Multimodal (`omniroute_ocr.py`)**: Utiliza `POST /v1/chat/completions` com payloads estruturados para modelos de visão (`gemini-2.5-flash` ou `MiniMax-M3`), extraindo texto fiel sem markdown ou ruídos.
- **Cadeia de Mídia (`service.ocr`)**: Roteia prioritariamente para o OmniRoute e realiza failover transparente para o Google Cloud Vision (`VisionOCRClient`), registrando métricas em `AiCall`.
- **Victor Rule de TTS (`tts.py`)**: Aplica inversão de gênero (Homens recebem voz Feminina, Mulheres recebem voz Masculina) e deduplicação de áudio com hash SHA-256 no storage `/media/ai/tts/<hash>.ogg`.

### 3.2. Cloudflare Turnstile
- **Módulo Server-Side (`integrations.turnstile`)**: Cliente síncrono e assíncrono com suporte nativo às chaves de teste Cloudflare (`1x00...AA` e `2x00...AA`).
- **Endpoint de Diagnóstico (`/api/v1/tools/turnstile/verify`)**: Endpoint JSON para teste e validação de tokens com registro de códigos de erro.
- **Componente Frontend (`TurnstileWidget` em `@v7m/ui`)**: Widget React/Next.js com carregamento assíncrono resiliente, tratamento de falha de script e renderização explícita.

### 3.3. Stalwart Mail Server
- **Cliente Administrativo JMAP (`mail/stalwart.py`)**: Gerenciamento de domínios, resolução de mapeamento de contas, criação idempotente de caixas de e-mail e rotação segura de senhas com alta entropia.
- **Webhooks de Status (`/v1/webhook/stalwart`)**: Ingestão monotônica e idempotente de confirmações de entrega e bounces para supressão de envios.

---

## 4. Evidências de Validação Automatizada

### Testes do Backend (`services/backend`)
```text
tests/test_omniroute_integrations.py::test_omniroute_ocr_detect_text_success PASSED
tests/test_omniroute_integrations.py::test_omniroute_ocr_retryable_error_on_503 PASSED
tests/test_omniroute_integrations.py::test_ocr_fallback_to_google_vision_when_omniroute_fails PASSED
tests/test_omniroute_integrations.py::test_synthesize_voice_note_with_omniroute PASSED
tests/test_omniroute_integrations.py::test_clean_text_for_speech PASSED
tests/test_omniroute_integrations.py::test_tts_victor_cross_gender_rule PASSED
tests/test_omniroute_integrations.py::test_probe_tts_diagnostics PASSED
tests/test_turnstile.py::test_turnstile_test_always_pass_token PASSED
tests/test_turnstile.py::test_turnstile_test_always_block_token PASSED
tests/test_turnstile.py::test_turnstile_mock_remote_verification_success PASSED
tests/test_turnstile.py::test_turnstile_mock_remote_verification_failure PASSED
tests/test_turnstile.py::test_turnstile_async_verification PASSED
tests/test_turnstile.py::test_turnstile_bypass_when_disabled PASSED
tests/test_turnstile.py::test_turnstile_tools_api_endpoint PASSED
```

### Testes do Notify (`services/notify`)
```text
tests/test_stalwart_integration_audit.py::test_stalwart_connection_timeout_handling PASSED
tests/test_stalwart_integration_audit.py::test_stalwart_multi_domain_resolution PASSED
tests/test_stalwart_integration_audit.py::test_stalwart_mailbox_full_lifecycle PASSED
tests/test_stalwart_integration_audit.py::test_stalwart_password_entropy PASSED
```

---

## 5. Procedimentos de Operação e Runbooks

1. **Testes de Conectividade de Rede**:
   Executar a suíte probe:
   ```bash
   node tooling/qa-audit/10-external-integrations-probe.mjs
   ```

2. **Configuração de Variáveis de Ambiente**:
   Garantir que as variáveis estejam no `.env` do container (ou via Infisical):
   ```bash
   OMNIROUTE_BASE_URL=http://10.0.1.135/v1
   OMNIROUTE_API_KEY=sk-omniroute-...
   TURNSTILE_SECRET_KEY=0x4AAAAAA...
   TURNSTILE_SITE_KEY=0x4AAAAAA...
   TURNSTILE_ENABLED=true
   STALWART_BASE_URL=http://10.0.1.20:8080
   STALWART_ADMIN_USER=ceo@v7m.org
   STALWART_ADMIN_PASSWORD=...
   ```
