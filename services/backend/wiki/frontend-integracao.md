# Guia de integração dos apps com o backend

> Versão viva. Descreve como os apps **Clientes** (aluno/candidato) e **Colaboradores** (promotor/coordenador) conversam com a API. O app **Staff** fica para depois.
>
> Base da API: `https://backend.v7m.live/api/v1/{clients|collaborators|leadership}/`  
> OpenAPI público por enquanto: `/api/v1/{grupo}/docs` e `/openapi.json`.

---

## Sumário rápido

| App | Público | Namespace | Roles principais |
|---|---|---|---|
| **Clientes** | aluno, candidato, lead, ex-aluno | `/api/v1/clients/` | `lead`, `enrollment`, `student`, `veteran` |
| **Colaboradores** | promotor e coordenador no **mesmo app** | `/api/v1/collaborators/` (promotor) + `/api/v1/leadership/` (coordenador) | `promoter`, `coordinator` |

A role é **acumulativa**: um usuário pode ser promotor E coordenador (ou aluno e promotor). O JWT carrega todas as roles ativas. Quando a role muda, o `token_version` sobe e o token antigo cai.

---

## 1. Autenticação (passwordless por OTP) — comum a todos

1. `POST /auth/check` — dispara OTP.
   - Body: `cpf`, `phone` ou `external_id`.
   - Retorna `found`, `external_id` do **USER**, `roles`, `otp_sent`, `otp_wait`.
   - Use `roles` para rotear: `coordinator` → área do coordenador; `promoter` → área do promotor; `student|enrollment|lead|veteran` → app de clientes.
2. `POST /auth/login` — valida OTP.
   - Body: `external_id` do USER + `otp`.
   - Retorna `access_token`, `refresh_token`, `token_type`.
3. `POST /auth/refresh` — rotação silenciosa.
   - Body: `refresh_token`.
   - Devolve novo par. Use quando o access expirar.
4. `GET /whoami` — eco autenticado.
   - Retorna `external_id`, `roles`, `name`.

> **Regra importante:** login pede o `external_id` do **USER**, não do lead/candidato/matrícula. Guarde `user_external_id` vindo do `/register`.

---

## 2. App 1 — Clientes (lead → enrollment → student → veteran)

### 2.1 Máquina de estados

```
lead → enrollment → student → veteran
```

- **Lead** criado em `POST /clients/auth/register`.
- Lead paga → webhook cria automaticamente role `enrollment`.
- Matrícula concluída pelo coordenador → cria role `student`.
- Aluno retira diploma (foto) → adiciona role `veteran` (mantém `student`).

**Roteamento do front pelo token:**
- `veteran` → app de ex-aluno
- `student` → app do aluno
- `enrollment` → wizard de matrícula
- `lead` → tela de pagamento/recibo

### 2.2 Cadastro inicial

`POST /clients/auth/register`
- Body: `cpf`, `phone`, `email`, `payment_method` (`"card"` ou `"pix"`), `ref` opcional (promotor da landing).
- Retorna `lead.external_id`, `user_external_id`, `status`, `checkout`.
- A cobrança é async: `checkout.url` (link curto) já existe; o gateway pode demorar segundos.

### 2.3 Fase LEAD

- `GET /clients/lead/me` — dados do lead, cliente, promotor e checkout.
- `GET /clients/lead/checkout-url` — só a URL curta (pagar/recibo).
- Use **sempre** `checkout.url` nos botões; ela redireciona para checkout se pendente ou recibo se pago.

### 2.4 Fase ENROLLMENT — wizard

O `/me` canônico é `GET /clients/enrollment/me`. Ele devolve `status` da seção atual e todos os blocos (`profile`, `address`, `rg`, `education`, `selfie`). Pré-preencha a tela toda com uma chamada só.

Ordem: **RG → endereço → educação → selfie → awaiting_release**.

| Ação | Endpoint | Body | Retorna |
|---|---|---|---|
| Upload RG | `POST /enrollment/documents/rg/photo/{slot}` | multipart `file` (`front`/`back`/`full`) | ack de análise |
| Ler RG | `GET /enrollment/documents/rg` | — | seção RG + fotos + `missing_fields` |
| Corrigir RG | `PATCH /enrollment/documents/rg` | campos editáveis | `/enrollment/me` |
| Endereço por CEP | `POST /enrollment/address` | `{cep}` | `/enrollment/me` |
| Completar endereço | `PATCH /enrollment/address` | campos vazios | `/enrollment/me` |
| Educação | `POST /enrollment/education` | `{level, grade, completed, last_school, city, state, last_year_when?}` | `/enrollment/me` |
| Selfie | `POST /enrollment/selfie` | multipart `file` | `/enrollment/me` + ack |

**Regras de avanço:**
- Selfie só libera quando RG `approved` e `missing_fields` do RG/perfil vazio.
- `analysis_status` canônico: `null` (sem foto), `pending`, `approved`, `rejected`, `review`.
- A fase da **taxa é invisível ao aluno**: `awaiting_release` cobre `fee_paid`/`fee_scheduled`.

### 2.5 Fase STUDENT

- `GET /clients/student/me` — status, plataforma (`url`, `login`, `password`, `notes`), documentos, pendências, diploma.
- `POST /clients/student/blood-type` — `{blood_type}`.
- `POST /clients/student/documents/{doc_type}` — upload de documento.
  - `doc_type`: `certificate`, `transcript`, `address_proof`, `id_card`, `birth_certificate`, `military_service` (só homens).
- `GET /clients/student/pendencies` — pendências em aberto.
- `POST /clients/student/exam/schedule` — `{subject, scheduled_at}`.
- `POST /clients/student/diploma/pickup` — multipart foto da retirada → adiciona `veteran`. Force refresh/re-login para atualizar roles.

### 2.6 Polling de análises async

Toda mutação que dispara IA retorna um ack:

```json
{
  "analysis_status": "pending",
  "poll_after_ms": 2500,
  "expires_at": "2026-06-24T12:05:00-03:00"
}
```

Fluxo:
1. Aguarde `poll_after_ms`.
2. Chame o GET da seção.
3. Se ainda `pending` e não estourou `expires_at`, repita.
4. Se estourou sem mudar → backend converte para `review` (decisão humana).
5. `rejected` → mostre mensagem padrão e permita reenvio.
6. `approved` → avance pelo `status` do funil.

---

## 3. App 2 — Colaboradores (promotor + coordenador)

O mesmo app serve as duas roles. A role do usuário decide qual namespace chamar.

### 3.1 Autenticação e detecção de papel

Use `/api/v1/collaborators/auth/*` para obter o token. Depois use `GET /collaborators/whoami` (ou `GET /leadership/whoami`) para ler `roles`.

- Tem `promoter` e não tem `coordinator` → mostrar área de promotor.
- Tem `coordinator` → mostrar área de coordenador (mesmo app, rotas diferentes).
- Tem ambas → ofereça switch ou una as duas visões.

> O token do `/collaborators/auth/login` **não serve** automaticamente no `/leadership`; as APIs são namespaces separados, mas o JWT é o mesmo se o usuário tiver a role. O front só precisa trocar a base URL.

### 3.2 Promotor — `/api/v1/collaborators/`

- `GET /promoter/me` — dados do promotor, status e `locked` (travado no treino).
- `GET /promoter/me/leads` — leads captados.
- `GET /promoter/me/commissions` — comissões.
- `GET /promoter/study/pricing` — preço de vitrine para divulgação.
- `POST /promoter/study/start` — inicia um novo lead (gera link de checkout para enviar).
- `GET /training/materials` — matérias pendentes/disponíveis.
- `GET /training/progress` — progresso no treino.
- `POST /training/submissions` — submeter resposta de uma matéria.

**Trava do treino:**
- `locked = true` quando há matéria `blocking` pendente.
- O promotor não pode captar/receber enquanto travado.
- A trava é lida do banco, não do JWT; chame `/promoter/me` para atualizar.

### 3.3 Coordenador — `/api/v1/leadership/`

Toda ação exige que o usuário coordene um polo (`NOT_HUB_COORDINATOR` se não).

#### Fila única de decisões
`GET /reviews` devolve 7 baldes. Cada item é `ReviewItemOut` homogêneo:

```json
{
  "external_id": "...",
  "type": "enrollment | candidate | student | promoter",
  "kind": "rg | selfie | document | awaiting_approval | locked_training",
  "name": "...",
  "doc_type": "...",
  "since": "...",
  "rejected": true | false,
  "document_external_id": "...",
  "student_external_id": "...",
  "promoter_external_id": "...",
  "pending_materials": [...]
}
```

O front roteia por `type` + `kind` e linka por `external_id`.

#### Candidato → promotor
- `GET /candidates` — fila de aprovação.
- `GET /candidates/{external_id}` — detalhe do candidato.
- `GET /candidates/{external_id}/selfie` — detalhe da selfie em revisão.
- `POST /candidates/{external_id}/selfie/decide` — `{approve, reason}`.
- `POST /candidates/{external_id}/document/decide` — `{approve, reason}`.
- `POST /candidates/{external_id}/document/reset` — destrava tipo de documento errado.
- `POST /candidates/{external_id}/approve` — promove a promotor.
- `POST /candidates/{external_id}/reject` — `{reason}` (soft rejection).

#### Matrícula
- `GET /enrollments` e `GET /enrollments/{external_id}` — lista e detalhe rico.
- `POST /enrollments/{external_id}/fee/pay` — 1ª parcela, body `{qr_code, amount?}`.
- `POST /enrollments/{external_id}/fee/schedule` — 2ª parcela, exige QR com vencimento.
- `POST /enrollments/{external_id}/conclude` — body `{platform_login, platform_password, platform_url?, platform_notes?}`. Exige duas parcelas resolvidas.
- `POST /enrollments/{external_id}/rg/decide` — decide RG em revisão.
- `POST /enrollments/{external_id}/selfie/decide` — decide selfie em revisão.
- Proxy auditado (cliente sem prática digital): `POST /enrollments/{external_id}/address`, `POST /enrollments/{external_id}/documents/rg/photo/{slot}`, `POST /enrollments/{external_id}/selfie`, `PATCH /enrollments/{external_id}/profile`.

#### Aluno
- `GET /students?status=&limit=&offset=` — paginação.
- `GET /students/{external_id}` — detalhe rico.
- `POST /students/{external_id}/exam/grade` — `{passed, notes?}`.
- `POST /students/{external_id}/documents/{document_external_id}/decide` — `{approve, reason}`.
- `POST /students/{external_id}/pendencies` — abre pendência: `{kind, description, amount_cents?}`.
- `POST /pendencies/{external_id}/resolve` — resolve pendência.
- `POST /students/{external_id}/documentation/clear` — libera diploma.
- `POST /students/{external_id}/diploma/issue` — emite diploma.

#### Promotores do polo
- `GET /promoters` — lista com `status` e `locked`.
- `POST /promoters/{external_id}/suspend` — suspender.
- `POST /promoters/{external_id}/reactivate` — reativar.
- `POST /promoters/{external_id}/materials/{material_external_id}/approve` — aprovar matéria em aberto.

#### Autoria de treino
- `GET /training/materials`, `POST /training/materials`, `PUT /training/materials/{external_id}` — mesmo contrato do staff.

---

## 4. Mídia

Todas as fotos/documentos vêm como **path relativo**. Prefixe com:

```
https://backend.v7m.live/media/<path>
```

O `/media/` é público por ora. O path contém token aleatório — nunca reconstrua por `external_id`.

---

## 5. Envelope de erro — `switch(code)`

Todo erro 4xx/5xx vem assim:

```json
{
  "detail": "...",
  "code": "...",
  "...extra": "..."
}
```

O front deve fazer `switch(response.code)`, **nunca parsear `detail`**.

### Códigos principais

| code | status | quando |
|---|---|---|
| `UNAUTHORIZED` | 401 | token ausente/expirado |
| `SESSION_EXPIRED` | 401 | refresh inválido |
| `FORBIDDEN_ROLE` / `NOT_HUB_COORDINATOR` | 403 | sem papel ou não coordena polo |
| `WRONG_STATUS` | 409 | ação fora da etapa; `extra.expected_status` |
| `FEES_INCOMPLETE` | 409 | concluir sem as duas parcelas |
| `FEE_QR_INVALID` / `FEE_QR_NO_DUE_DATE` | 422 | QR PIX inválido |
| `RG_NOT_IN_REVIEW` / `DOC_NOT_IN_REVIEW` / `SELFIE_NOT_IN_REVIEW` | 422 | decide análise não em revisão |
| `EDUCATION_LEVEL_INVALID` / `EDUCATION_GRADE_OUT_OF_RANGE` | 422 | escolaridade fora da faixa |
| `DOC_TYPE_LOCKED` / `DOC_TYPE_NOT_SET` | 422 | documento travado/não definido |
| `MILITARY_MALE_ONLY` | 422 | documento militar só para gênero masculino |
| `OPEN_PENDENCIES` / `PENDENCY_NOT_FOUND` | 409/404 | pendência do aluno |
| `NO_PENDING_EXAM` / `DIPLOMA_NOT_ISSUED` | 409 | exame/diploma fora de ordem |
| `RATE_LIMITED` | 429 | OTP; `extra.retry_after_s` |

A descrição do grupo `leadership` no OpenAPI lista todos os códigos com status e extras.

---

## 6. UX gotchas

1. **Login usa `external_id` do USER.** Guarde `user_external_id` do `/register`.
2. **Roles avançam automaticamente.** Após pagamento, conclusão de matrícula ou retirada de diploma, force refresh/re-login para atualizar o token.
3. **Wizard por `status`.** Use `GET /enrollment/me` e renderize a seção indicada por `status`; `None`/`missing_fields` diz o que falta.
4. **Selfie é bloqueada até RG aprovado + perfil completo.** Trave o botão enquanto `missing_fields` não estiver vazio.
5. **Análises async:** respeite `poll_after_ms` e `expires_at`. Após expirar, mostre "em revisão manual".
6. **Taxa invisível ao aluno.** Não mostre progresso de pagamento de taxa; `awaiting_release` é suficiente.
7. **Rejeição soft de candidato.** Candidato rejeitado continua na fila com `rejected: true`; pode ser aprovado depois.
8. **Não reenvie documento aprovado.** O backend retorna `ALREADY_APPROVED`.
9. **Coordenador e promotor no mesmo app.** Troque só a base URL (`collaborators` vs `leadership`); o token é o mesmo.
10. **Documentação pública.** `/docs` e `/openapi.json` estão abertos hoje; o front pode gerar tipos deles, mas não exponha dados sensíveis na URL.

---

## 7. Checklist por tela

### App Clientes
- [ ] Tela pública: `GET /clients/pricing` + `POST /clients/auth/register`.
- [ ] Login: `POST /clients/auth/check` → `POST /clients/auth/login` → guardar tokens.
- [ ] Lead: `GET /clients/lead/me` + botão `checkout.url`.
- [ ] Wizard matrícula: `GET /clients/enrollment/me` → mutações → polling → avanço por `status`.
- [ ] Aluno: `GET /clients/student/me` → documentos/pendências/prova/diploma.
- [ ] Refresh automático do token quando 401.

### App Colaboradores
- [ ] Login comum: `POST /collaborators/auth/*`.
- [ ] Whoami para decidir promotor/coordenador.
- [ ] Promotor: `/promoter/me`, `/promoter/me/leads`, `/promoter/me/commissions`, `/training/*`.
- [ ] Coordenador: `GET /leadership/reviews` como tela-âncora.
- [ ] Coordenador: filas de candidatos, matrículas, alunos, promotores.
- [ ] Coordenador: autoria de treino em `/leadership/training/materials`.

---

*Atualizado em 2026-06-24 após tipagem completa do OpenAPI do grupo `leadership`.*
