# IEADPG Visitantes — Fase 6 (Agente 4: Frontend Wizard)

## 1. Resumo da estratégia
Logica https://api-ieadpg.m33.live/api/docs > Url Provisória para fase desenvolvimento/sandbox
Estratégia oficial para um único app Next.js servindo online (`/`) e presencial (`/p`):
- Backend é fonte de verdade do fluxo.
- Frontend não decide próxima etapa por regra local; sempre consulta `GET /api/visitors/me`.
- A diferença entre online/presencial nasce no `register` inicial (`is_in_person`) e, depois da autenticação, o redirecionamento é guiado por `status.code`.
- Evitar duplicação entre rotas com páginas compostas por “step components” reutilizáveis.

---

## 2. Rotas

Rotas públicas:
- `/` → captura online (telefone + início de cadastro)
- `/p` → captura presencial (telefone + início de cadastro com `is_in_person=true`)
- `/login/[profile_uuid]` → entrada por magic link (lê `otp` da query string)
- `/otp` → confirmação manual de OTP

Rotas autenticadas (wizard):
- `/cadastro/dados`
- `/cadastro/endereco`
- `/cadastro/religiao`
- `/cadastro/finalizacao`
- `/cadastro/presente`

Mapeamento sugerido por status:
- `1`/`11` -> `/cadastro/dados`
- `2`/`12` -> `/cadastro/endereco`
- `3`/`13` -> `/cadastro/religiao`
- `4` -> `/cadastro/finalizacao`
- `5` -> `/cadastro/finalizacao` (aguardando presença)
- `14`/`15` -> `/cadastro/presente`

---

## 3. Fluxo de autenticação

### 3.1 Captura de telefone
1. Usuário informa telefone em `/` ou `/p`.
2. Front chama `POST /api/visitors/register` com:
   - online: `is_in_person=false`
   - presencial: `is_in_person=true`
3. Front chama `POST /api/auth/check` com `phone`.
   - `contact_number` fica apenas como compatibilidade legada.
4. Recebe `first_name`, `profile_uuid`, `magic_link`.

### 3.2 OTP manual
1. Usuário informa OTP em `/otp`.
2. Front chama `POST /api/auth/login` com `profile_uuid` + `otp`.
3. Salva JWT (access/refresh).
4. Chama `GET /api/visitors/me` e redireciona pela tabela de status.
   - `auth/login` nao deve ser tratado como fonte de status.

### 3.3 Magic link
1. Usuário abre `/login/[profile_uuid]?otp=xxxxxx`.
2. Front chama `POST /api/auth/login` automaticamente.
3. Em sucesso, chama `GET /api/visitors/me` e redireciona.
4. Em erro (otp expirado/inválido), envia para `/otp` com CTA de reenvio.

---

## 4. Fluxo por status

Regra única de roteamento:
- Ler `status.code` em `GET /api/visitors/me`.
- Resolver a rota por mapa determinístico local.
- Se backend mudar status, frontend apenas reage (sem ifs de negócio paralelos).

Ações por etapa:
- `1/11`: PATCH `/api/profiles/data` e depois POST `/api/visitors/update`.
- `2/12`: PATCH `/api/profiles/address` e depois POST `/api/visitors/update`.
- `3/13`: PATCH `/api/visitors/religious-data` e depois POST `/api/visitors/update`.
- `4/14`: POST `/api/visitors/update` para finalizar etapa.
- `5/15`: tela de orientação final conforme `required_action`.

---

## 5. Estrutura de projeto

Sugestão de pastas:

```txt
src/
  app/
    (public)/
      page.tsx                # /
      p/page.tsx              # /p
      otp/page.tsx
      login/[profile_uuid]/page.tsx
    (authenticated)/
      cadastro/
        dados/page.tsx
        endereco/page.tsx
        religiao/page.tsx
        finalizacao/page.tsx
        presente/page.tsx
  modules/visitors/
    api/
      visitors.ts
      auth.ts
      profiles.ts
    status/
      status-route-map.ts
      status-guard.ts
    components/
      phone-capture-form.tsx
      otp-form.tsx
      step-layout.tsx
  store/
    session-store.ts
    visitor-store.ts
```

---

## 6. Store/estado

Estado global mínimo:
- `sessionStore`
  - `accessToken`
  - `refreshToken`
  - `profileUuid`
  - `isAuthenticated`
- `visitorStore`
  - `status` (`code`, `label`, `description`, `required_action`)
  - `missingFields`
  - `lastResolvedRoute`

Princípios:
- Não persistir OTP.
- Persistir JWT com estratégia segura definida pelo time (cookie httpOnly preferencial).
- Reidratar estado sempre a partir de `GET /api/visitors/me` após login/refresh.

---

## 7. Tratamento de erros

Erros de validação de etapa:
- Exibir `message` + lista de `missing_fields` por campo.
- Usar `required_action` como texto principal da CTA da tela.

Erros de autenticação:
- OTP inválido/expirado: exibir feedback claro + botão de reenvio (chamar `auth/check`).
- Token expirado: tentar refresh; se falhar, voltar para captura de telefone.

Erros de rede:
- Banner global com retry.
- Guardar rascunho local do formulário antes de reenviar PATCH.

---

## 8. Checklist de implementação

- [ ] Implementar mapa `status.code -> route` em módulo único.
- [ ] Centralizar cliente HTTP com interceptors (JWT/refresh).
- [ ] Implementar captura unificada de telefone para `/` e `/p` mudando apenas `is_in_person`.
- [ ] Implementar fluxo de login por OTP e por magic link.
- [ ] Garantir chamada obrigatória de `GET /api/visitors/me` no bootstrap autenticado.
- [ ] Implementar telas de erro para `missing_fields` e `allowed_values`.
- [ ] Evitar duplicação de componentes entre online/presencial.

---

## Handoff (obrigatório)

### 1. O que ficou validado
- Frontend será 100% guiado por `GET /api/visitors/me` para roteamento de etapas.
- Rotas `/` e `/p` compartilham a mesma base, mudando só o contexto inicial de `register`.
- Fluxos OTP e magic link convergem para `auth/login` + `visitors/me`.

### 2. O que depende do próximo agente
- Agente 6 deve cobrir QA de redirecionamento por status, expiração de OTP e retomada de sessão.

### 3. O que ainda está ambíguo
- Estratégia final de persistência de token (cookie httpOnly vs storage) no frontend atual.
- UX final para status `5` e `15` (copy e ações de balcão).

### 4. O que NÃO deve ser alterado sem nova validação
- Backend como fonte única de verdade de status.
- Regra PATCH salva / POST `visitors/update` avança.
- Padrão de magic link `/login/<profile_uuid>?otp=<codigo>`.
