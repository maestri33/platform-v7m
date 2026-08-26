# Dev Preview — `/dev-preview`

> Showcase visual de **todos** os estados do app V7M Promotor, sem backend.
> Fonte canônica: `src/app/dev-preview/page.tsx` + `src/components/dev/**` +
> `src/lib/dev/mocks.ts`. Este doc aponta, não duplica.

## O que é

Uma rota **dev-only** (`NODE_ENV=production` → 404) que renderiza cada
componente, form, página e estado do app num layout próprio com scroll nativo
(sem `FitViewport`, que não aguenta os 8000+px do showcase). Serve para QA
visual rápido: capturar screenshots, validar tema claro/escuro, checar contraste
e states sem precisar mockar fluxo nem backend.

**Não é rota de produto.** Em produção ela retorna 404 (guard no topo da page).

## Como acessar

```
http://localhost:3000/dev-preview
```

Suba o dev server com `npx next dev` (porta 3000).

## Query params

| Param    | Default     | Valores                                                    |
| -------- | ----------- | --------------------------------------------------------- |
| `section`| `overview`  | `overview` · `components` · `forms` · `pages` · `states` · `auth` |
| `role`   | `promoter`  | `promoter` · `candidate` · `coordinator` · `training` · `outsider` |
| `theme`  | *(sistema)* | `light` · `dark` · `system` (também via bolha no canto)   |

Exemplos:

```
/dev-preview?section=pages&role=candidate
/dev-preview?section=components&theme=dark
/dev-preview?section=auth&role=candidate
```

## Seções

| Seção        | Conteúdo                                                        |
| ------------ | --------------------------------------------------------------- |
| `overview`   | Índice + what's new (default)                                   |
| `components` | Primitivos de UI em todos os estados (Field, Badge, Card, AppNav, PaymentHoldAlert, OtpInput, …) |
| `forms`      | Forms em todos os estados (CEP, Pix, Doc, Selfie c/ AgreementSheet, Escolaridade, …) |
| `pages`      | Mock de cada página real. **Role-aware no Painel** (grupo "Painel — persona atual") + catálogo completo de estados |
| `states`     | Loading / empty / error / success / 404 / lock                  |
| `auth`       | 3 estágios do CheckFlow (check → register → otp) no `AuthShell` |

## Roles (personas)

O `role` muda o header e — no `pages` — o estado canônico do `/painel`
(`mockPainelByRole` em `src/lib/dev/mocks.ts`):

| Role          | Persona        | Painel canônico                                |
| ------------- | -------------- | ---------------------------------------------- |
| `promoter`    | Bia Promotora  | Meta em andamento, ativa, sem hold             |
| `candidate`   | Ana Candidata  | Onboarding incompleto: hold + grade de etapas  |
| `coordinator` | Cau Coordenador| Promotor sênior: meta batida, bônus garantido  |
| `training`    | Dudu Trainee   | Bolsista (pré-matriculado): default + card bolsa |
| `outsider`    | Visitante      | Sem sessão — fallback pra persona promoter     |

> Os demais mocks (Leads, Comissões, Conta, Treinamento) são um **catálogo de
> estados**, não role-aware — o ponto é ver todos os states de cada página.

## Theme control

Bolha fixa no canto inferior direito (☀️ claro / 🌙 escuro / 🖥️ sistema).
Persistência em `localStorage` chave `v7m-theme`, aplicada via
`data-theme` no `:root`. A seção `auth` esconde a bolha (tema dark fixo do shell
de auth).

## Como adicionar uma variante/seção

1. **Novo mock** → adicione em `src/lib/dev/mocks.ts` (tipado contra
   `src/lib/api/types.ts`). Um único source of truth: todas as seções veem os
   mesmos dados.
2. **Nova variante num componente/página existente** → abra o `*-section.tsx`
   relevante em `src/components/dev/showcase/` e adicione um `<Variant>`.
3. **Nova seção** →
   - adicione a entrada em `src/components/dev/sections.ts` (constante pura,
     **sem** `"use client"` — é importada pelo server component);
   - crie `src/components/dev/showcase/<id>-section.tsx` com um
     `<ShowcaseShell>`;
   - adicione o `case` no router `Showcase` (`src/components/dev/showcase/index.tsx`).

## Padrões do showcase

- **`ShowcaseGroup`** = card branco com label + descrição. **`Variant`** =
  sub-bloco tracejado com a variante real. Ambos em `src/components/dev/showcase/_parts.tsx`.
- **Visuais, não fluxo:** inputs são "controlled-on-mount" (`useState` estático);
  o foco é o snapshot de cada estado, não interação real.
- **Overlays/modais fixed:** renderize **estático e em frame** (ex.: `AgreementSheet`,
  `LoadingOverlay`), nunca o modal `fixed inset-0` direto — ele escapa do card.
  Quando precisar do real, contenha com `transform: translateZ(0)` + `overflow-hidden`.
- **Auth (`section=auth`)** usa `AuthShellDev` (overflow visível, `max-w-5xl`) em
  vez do `AuthShell` de prod, que é restrito a 1 stage por viewport.

## Validação

```bash
npx tsc --noEmit                              # tipos
npx eslint .                                  # lint
node ~/.agents/skills/impeccable/scripts/detect.mjs --json "src/components/dev"  # UI/UX detector
```

O detector impeccável é a checagem canônica de UI/UX: `[]` = zero findings.
