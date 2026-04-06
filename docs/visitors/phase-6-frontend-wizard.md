# IEADPG Visitantes — Fase 6 (TTS: Frontend Wizard)

## 1. Objetivo

Construir o frontend do fluxo de visitantes em um único app Next.js, guiado 100% pelo backend, sem duplicar regra de negócio no cliente.

API de desenvolvimento atual:
- `https://api-ieadpg.m33.live/docs`

Princípios obrigatórios:
- backend é fonte única de verdade do fluxo
- frontend não decide etapa por regra própria
- `POST /visitors/login` devolve o status inicial da jornada autenticada
- cada etapa usa `GET` para carregar e `POST` para salvar + avançar

---

## 2. Resultado esperado

Ao final desta fase, o frontend deve permitir:
- cadastrar visitante online em `/`
- cadastrar visitante presencial em `/p`
- autenticar por OTP manual
- autenticar por magic link
- redirecionar automaticamente pela etapa correta
- editar dados principais, endereço e religião
- exibir estados finais `4`, `14` e `21` com orientação clara

---

## 3. Escopo funcional

Rotas públicas:
- `/`
- `/p`
- `/otp`
- `/login/[profile_uuid]`

Rotas autenticadas:
- `/cadastro/dados`
- `/cadastro/endereco`
- `/cadastro/religiao`
- `/cadastro/finalizacao`
- `/cadastro/presente`

Mapeamento por status:
- `1` e `11` -> `/cadastro/dados`
- `2` e `12` -> `/cadastro/endereco`
- `3` e `13` -> `/cadastro/religiao`
- `4` -> `/cadastro/finalizacao`
- `14` e `21` -> `/cadastro/presente`

---

## 4. Contratos obrigatórios do frontend

### 4.1 Authentication

Online:
```json
{
  "phone": "43996648750",
  "is_in_person": false
}
```

Presencial:
```json
{
  "phone": "43996648750",
  "is_in_person": true
}
```

Response esperada:
```json
{
  "message": "Codigo de verificacao enviado com sucesso.",
  "first_name": "",
  "profile_uuid": "<uuid>",
  "magic_link": "https://app.ieadpg.org/login/<uuid>?otp=123456",
  "is_visitor": true
}
```

### 4.2 Login

Request:
```json
{
  "profile_uuid": "<uuid>",
  "otp": "123456"
}
```

### 4.3 Refresh

Request:
```json
{
  "refresh": "<jwt>"
}
```

Response esperada:
```json
{
  "message": "Token atualizado com sucesso.",
  "access": "<jwt>",
  "refresh": "<jwt>"
}
```

Response esperada:
```json
{
  "message": "Login realizado com sucesso.",
  "access": "<jwt>",
  "refresh": "<jwt>",
  "is_visitor": true,
  "status": {
    "code": 2,
    "label": "Dados iniciais salvos - online",
    "description": "Dados pessoais principais já foram preenchidos no fluxo online.",
    "required_action": "Completar o endereço."
  }
}
```

Observação:
- `visitors/login` retorna `status`
- o bootstrap inicial do roteamento vem do próprio login

---

## 5. Fluxo de navegação

### 5.1 Entrada online
1. usuário acessa `/`
2. informa telefone
3. frontend chama `POST /visitors/authentication`
5. usuário escolhe:
   - digitar OTP em `/otp`
   - abrir magic link

### 5.2 Entrada presencial
1. usuário acessa `/p`
2. informa telefone
3. frontend chama `POST /visitors/authentication` com `is_in_person=true`
5. segue para login por OTP ou magic link

### 5.3 OTP manual
1. usuário informa `profile_uuid` + `otp`
2. frontend chama `POST /visitors/login`
3. salva sessão
4. resolve rota pelo `status.code` retornado no login

### 5.4 Magic link
1. usuário acessa `/login/[profile_uuid]?otp=xxxxxx`
2. frontend chama `POST /visitors/login`
3. em sucesso:
   - salva sessão
   - redireciona pela etapa correta
4. em falha:
   - manda para `/otp`
   - oferece reenvio

---

## 6. Estrutura sugerida

```txt
src/
  app/
    (public)/
      page.tsx
      p/page.tsx
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
      auth.ts
      profiles.ts
      visitors.ts
    guards/
      require-auth.ts
      resolve-visitor-route.ts
    schemas/
      auth.ts
      profile.ts
      visitor.ts
    components/
      phone-capture-form.tsx
      otp-form.tsx
      visitor-step-layout.tsx
      visitor-status-banner.tsx
  store/
    session-store.ts
    visitor-store.ts
```

---

## 7. Estado mínimo

`sessionStore`:
- `accessToken`
- `refreshToken`
- `profileUuid`
- `isAuthenticated`

`visitorStore`:
- `status`
- `missingFields`
- `lastResolvedRoute`

Regras:
- nunca persistir OTP
- reidratar a jornada usando o GET da etapa atual
- JWT pode ficar em cookie httpOnly preferencialmente

---

## 8. Telas por etapa

### `/cadastro/dados`
Campos:
- `full_name`
- `date_of_birth`
- `gender`
- `marital_status`
- `email`

Ação:
- `GET /visitors/data`
- `POST /visitors/data`

### `/cadastro/endereco`
Campos:
- `zipcode`
- `street`
- `number`
- `complement`
- `neighborhood`
- `city`
- `state`
- `country`

Ação:
- `GET /visitors/address`
- `POST /visitors/address`

### `/cadastro/religiao`
Campos:
- `religion`
- `christianity_type`
- `evangelical_church_name`
- `evangelical_is_in_communion`

Ação:
- `GET /visitors/religious-data`
- `POST /visitors/religious-data`

### `/cadastro/finalizacao`
Função:
- refletir estado `4`
- exibir `required_action`

### `/cadastro/presente`
Função:
- refletir estados `14` e `21`
- exibir instrução final de balcão/recepção

---

## 9. Tratamento de erros

Erros de validação:
- exibir `message`
- mapear `missing_fields` no formulário
- usar `allowed_values` para popular selects ou mensagens de correção

Erros de autenticação:
- OTP inválido -> mensagem clara
- OTP expirado -> CTA de reenvio
- `429` em `visitors/authentication` -> avisar cooldown

Mensagem de bloqueio esperada:
- `Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.`

Erros de rede:
- banner global com retry
- manter rascunho local antes do envio

---

## 10. Tarefas técnicas

### Tarefa A — Cliente HTTP
- criar client central
- anexar JWT
- tratar `401`
- preparar `POST /visitors/refresh`

### Tarefa B — Registro público
- construir tela `/`
- construir tela `/p`
- compartilhar formulário de telefone

### Tarefa C — OTP
- construir `/otp`
- construir parsing de magic link
- implementar reenvio

### Tarefa D — Bootstrap autenticado
- usar o `status` retornado em `POST /visitors/login`
- complementar com o GET da etapa atual
- bloquear acesso direto à etapa errada

### Tarefa E — Etapas do wizard
- dados
- endereço
- religião
- finalização
- presente

### Tarefa F — UX e feedback
- estados de loading
- feedback de erro
- persistência de rascunho
- mensagens orientadas por `required_action`

---

## 11. Critérios de aceite

- visitante online consegue iniciar em `/`
- visitante presencial consegue iniciar em `/p`
- login manual por OTP funciona
- login por magic link funciona
- frontend nunca decide etapa sem consultar o status devolvido pelo backend
- cada POST de etapa salva e avança automaticamente quando válido
- erros de `missing_fields` e `allowed_values` aparecem corretamente na UI
- estados `4`, `14` e `21` têm telas próprias de orientação

---

## 12. Agentes sugeridos

### Agente 1 — Estrutura de Frontend
Responsabilidade:
- pastas
- módulos
- stores
- guards
- client HTTP

Entrega:
- esqueleto do projeto e arquitetura interna

### Agente 2 — Fluxo Público e Auth
Responsabilidade:
- `/`
- `/p`
- `/otp`
- `/login/[profile_uuid]`
- integração com `visitors/authentication`, `visitors/login` e `visitors/refresh`

Entrega:
- entrada completa no fluxo autenticado

### Agente 3 — Wizard de Cadastro
Responsabilidade:
- `/cadastro/dados`
- `/cadastro/endereco`
- `/cadastro/religiao`
- chamadas GET + POST por etapa

Entrega:
- jornada principal do visitante funcionando

### Agente 4 — Finalização e UX
Responsabilidade:
- `/cadastro/finalizacao`
- `/cadastro/presente`
- banners de erro
- loading
- mensagens de `required_action`

Entrega:
- fechamento de jornada e experiência do usuário

### Agente 5 — QA de Fluxo
Responsabilidade:
- validar redirecionamento por status
- validar OTP expirado
- validar cooldown
- validar retomada por magic link

Entrega:
- checklist funcional do fluxo completo

---

## Handoff

### O que ficou definido
- frontend será orientado por status do backend
- `phone` é o campo canônico
- `is_in_person` e `is_visitor` são booleanos
- `visitors/login` carrega `status`
- os GETs de etapa devolvem contexto do que já foi feito e do que ainda falta

### O que depende da construção
- escolher stack final de estado e fetch
- decidir persistência final do token
- definir copy final das telas `4`, `14` e `21`

### O que não deve ser alterado sem nova validação
- mapeamento por `status.code`
- regra de GET + POST por etapa
- rota de magic link `/login/<profile_uuid>?otp=<codigo>`
