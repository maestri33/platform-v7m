# Migração — Fluxo "Tudo-Async-Até-Receber"

> **Data:** 2026-08-13 · **Status:** front pronto, aguardando back
> **Spec de API para o time de back:** `.reviews/api-spec-me-unificado.md`

## TL;DR

Antes: candidato em onboarding era forçado num wizard de 5 passos (redirect
`candidateStageHref` em cada página). Sem painel, sem `ref_url` visível, sem
leads, sem comissões até virar `promoter`.

Depois: candidato entra e cai direto no `/painel` (dashboard). Vê o link de
captação, a meta da semana, o saldo acumulado, e uma grade com os 5 ícones
das etapas. Cada ícone leva à rota correspondente da etapa (não há mais
wizard forçado). O alerta de hold no topo explica que, enquanto não
concluir as etapas, o pagamento das comissões acumula para a próxima
sexta. Promotor pleno vê a versão limpa do painel, sem grade, sem alerta.

## Mudanças por arquivo

### ✚ Novos arquivos
| Arquivo | O que faz |
|---|---|
| `src/lib/api/me.ts` | `getMe(roles)` — unificado com fallback pros 3 endpoints legados. Tenta `GET /me`; se 404, monta o mesmo shape a partir de `candidate/me` + `promoter/me` + `promoter/me/summary` (tolerante a 403). Helpers `pendingStepsCount` e `payoutStatus`. |
| `src/components/painel/PaymentHoldAlert.tsx` | Banner persistente. 3 estados visuais: âmbar (onboarding_incomplete), azul (pending_polo_approval), verde (liberado). Mostra `pendingCount`, `amountHeld` (R$), e `nextPayoutAt`. |
| `src/components/painel/OnboardingGrid.tsx` | 5 cards (RG/CNH, Comprovante, Pix, Escolaridade, Selfie) com ícone Lucide, status (done/review/pending/rejected) e CTA pro componente. |
| `.reviews/api-spec-me-unificado.md` | Contrato de API para o time de back. Recomenda `GET /api/v1/collaborators/me`; alternativa = abrir os 3 endpoints legados e adicionar `payout_hold` em `/summary`. |
| `.reviews/migracao-fluxo-async-ate-receber.md` | Este doc. |

### ✏️ Arquivos modificados
| Arquivo | Mudança |
|---|---|
| `src/lib/api/types.ts` | Adiciona `MeResponse`, `MeCandidate`, `MePromoter`, `OnboardingStep(s)`, `StepStatus`, `PayoutHold`, `PayoutHoldReason`. Torna `payout_hold?` opcional em `PromoterSummary` (back pode não ter deployado). |
| `src/lib/candidate/funnel.ts` | `NEXT_STAGE` agora aponta tudo pra `/painel` (antes era wizard auto-avançante). Doc explica a mudança. |
| `src/lib/auth/roles.ts` | Comentário de `isOnboarding` atualizado (não há mais wizard forçado). |
| `src/components/layout/AppNav.tsx` | Aceita `variant="promoter"|"candidate"`. Promotor: 4 abas. Candidato: 2 (Início · Conta). |
| `src/components/layout/AppShell.tsx` | Decide `navVariant` a partir de `isPromoter`/`isOnboarding`/`isTrainingLocked`. Candidato em onboarding vê 2 abas; promotor vê 4; treinado não vê nav. |
| `src/app/(app)/painel/page.tsx` | **Reescrito**. Candidato onboarding vê alerta + grade + (se back expôs) goal + money + link. Promotor pleno vê o painel limpo. Rejeitado pelo polo vê mensagem única. Sessão degenerada (sem `ref_url`) vê tela de "preparando". |
| `src/app/(app)/documento/page.tsx` | Remove redirect `if (documentSectionCaptured(doc) && target !== "/documento") redirect(target)`. Página livre — o candidato chega aqui pelo tile do painel. |
| `src/app/(app)/endereco/page.tsx` | Remove `if (target !== "/endereco") redirect(target)`. Página livre. |
| `src/app/(app)/pix/page.tsx` | Remove `if (!me.pix_validated && target !== "/pix") redirect(target)`. Estado "já validada" agora volta pro `/painel` (botão "Voltar pro painel"). |
| `src/app/(app)/escolaridade/page.tsx` | Remove `if (!educationComplete && target !== "/escolaridade") redirect(target)`. Estado "já registrada" volta pro painel. |
| `src/app/(app)/selfie/page.tsx` | Remove o redirect do `FUNNEL_ORDER.indexOf(...)`. Página livre. |
| `src/app/(app)/perfil/page.tsx` | Redireciona direto pra `/painel` (era `candidateStageHref(me)`). |

## Fluxo do candidato — antes e depois

```
ANTES
─────
Login
  ↓
/                 (auth/CheckFlow — entra por telefone)
  ↓
/painel           (apenas se role === promoter)
  ↓ [redirect se candidate]
/documento        ← wizard forçado
  ↓ [submit]
/endereco         ← wizard forçado
  ↓ [submit]
/pix              ← wizard forçado
  ↓ [submit]
/escolaridade     ← wizard forçado
  ↓ [submit]
/selfie           ← wizard forçado
  ↓ [submit]
(back analisa) → approved → /painel (dashboard pleno)
```

```
DEPOIS
──────
Login
  ↓
/                 (auth/CheckFlow — entra por telefone)
  ↓
/painel           ← dashboard único, desde o 1º login
  │
  ├── Alerta: "Para você receber, falta(m) N etapa(s)…
  │             seu saldo de R$ Y só libera na próxima sexta"
  │
  ├── [RG/CNH] [Comprovante] [Pix] [Escolaridade] [Selfie]
  │   ↓        ↓              ↓      ↓              ↓
  │   /documento /endereco   /pix   /escolaridade  /selfie
  │   (qualquer hora, em qualquer ordem)
  │   [submit] volta pro /painel (não avança)
  │
  ├── [Meta da semana · N/M]   (se back expôs /me)
  ├── [Acumulado · R$ Y | Libera · R$ Z]
  └── [Seu link · https://...] (sempre, desde o cadastro)
```

## Compatibilidade / degradação graciosa

O front está escrito para tolerar back ainda não-deployado:

| Back estado | Front comportamento |
|---|---|
| Back tem `GET /me` | Painel completo: alerta, grade, goal, money, link |
| Back NÃO tem `GET /me` (404) e candidato NÃO tem role `promoter` | Painel mostra alerta + grade + link; goal/money ausentes com aviso suave |
| Back tem os 3 endpoints legados abertos para `candidate` | Tudo funciona |
| Back NÃO liberou `promoter/me*` para `candidate` | `getMeLegacy` engole 403/404 e segue com `promoter: null` (degrade) |

**Em nenhum caso a tela quebra.** O pior cenário: candidato vê o alerta de
hold + a grade de 5 tiles + o link de captação, mas sem os números da
semana. Quando o back expuser, eles aparecem sem mudança de front.

## O que o time de back precisa fazer

Ler `.reviews/api-spec-me-unificado.md`. Resumo dos requisitos:

1. **Recomendado:** criar `GET /api/v1/collaborators/me` que devolve o shape
   `MeResponse` (candidato + promotor lado a lado).
2. **Alternativa:** abrir os 3 endpoints `promoter/me`, `/summary`, `/leads`
   para o role `candidate` (se a sessão tem `ref_url`). Adicionar
   `payout_hold` em `PromoterSummary`.
3. **Adicionar** `payout_hold` em `Commission` (`held_until` por item).
4. **Mudar regra de payout:** só processa comissões onde
   `payout_hold.reason == "none"`. Onboarding incompleto e polo-não-aprovou
   seguram a próxima sexta.
5. **Conceder role `promoter` quando `onboarding_complete` vir** (opcional,
   só se for preferível a abrir os 3 endpoints manualmente).

## O que NÃO mudou (intencionalmente)

- As 5 rotas `/documento`, `/endereco`, `/pix`, `/escolaridade`, `/selfie`
  continuam existindo com as mesmas URLs e os mesmos componentes
  (`DocForm`, `EnderecoForm`, `PixForm`, `EscolaridadeForm`, `SelfieForm`).
  Só perdem o redirect forçado e voltam pro `/painel` no fim.
- O `Stepper` (visual de 5 passos) continua como componente, só não
  aparece mais no `CompactHeader` de cada rota — agora é detalhe visual
  interno, opcional.
- O `AuthShell`/`CheckFlow` (entrada por telefone) fica igual.
- A bottom-nav de promotor pleno fica igual.
- O treinamento (matérias, refresh, envio) fica igual. Só muda *quando* ele
  aparece — `training` role só é concedida após `onboarding_complete +
  approved`.

## Risco & reversibilidade

A mudança é majoritariamente *aditiva* — novos componentes
(`OnboardingGrid`, `PaymentHoldAlert`), novo helper (`getMe`),
remoção de redirects forçados (que eram defensivos, não obrigatórios pelo
back). Se precisar reverter:

- Reativar o `redirect(candidateStageHref(me))` em cada page.tsx de etapa
  (1 linha por arquivo).
- Reverter `NEXT_STAGE` no `funnel.ts` (1 mapa).
- O `getMe` continua funcionando (o fallback legado bate nos 3 endpoints).

## QA sugerido

1. **Candidato onboarding, nada preenchido:** painel mostra alerta âmbar
   com "Falta(m) 5 etapas", 5 tiles em estado "Pendente" (cinza), link
   visível, bottom-nav 2 abas.
2. **Candidato onboarding, 2 etapas feitas (RG + Pix):** alerta diz
   "Faltam 3 etapas", tiles RG/Pix verdes (✓), outros 3 cinza. Saldo
   R$ 0,00 (nenhuma comissão).
3. **Candidato onboarding, todas as 5 etapas feitas, status `pending_review`:**
   alerta azul "Cadastro concluído — análise do polo em andamento", 5
   tiles verdes, sem CTA. Goal/Acumulado visíveis se back expôs.
4. **Promotor pleno, aprovado, comissões geradas:** painel limpo, sem
   alerta (se `payout_hold.reason == "none"`), 4 abas na bottom-nav,
   hero dark com countdown, money "Recebido/Previsto".
5. **Candidato onboarding com 1ª comissão gerada (lead convertido):**
   alerta âmbar "Falta(m) N etapas" + "Seu saldo de R$ 100 está acumulado
   e só libera na próxima sexta depois da última etapa". "Acumulado"
   no card de money.
6. **Candidato rejeitado pelo polo:** tela única "Cadastro não
   aprovado — Fale com o seu polo." Sem grade, sem goal.
7. **Treino-locked durante onboarding:** `TrainingGate` cobre tudo e
   manda pro `/treinamento`. Não mostra nav. (Edge case — `training` role
   só deveria ser concedida após onboarding, mas se acontecer, a UX está
   correta.)

## Próximos passos (fora do escopo desta task)

- Atualizar `docs/design-system.md` com o novo padrão de "OnboardingGrid
  + PaymentHoldAlert" (cores, ícones, estados).
- Adicionar stories/tests de Playwright para os 7 cenários de QA acima.
- Decidir se `treinamento` vira também um tile no `OnboardingGrid` para
  onboarding-completo-aguardando-aprovação (atualmente, é redirect duro).
- Investigar se o `candidate/funnel.ts` ainda faz sentido manter —
  `STAGE_HREF` e `candidateStageHref` continuam sendo usados pelo
  `wrongStatusHref` quando o back devolve 409 com `expected_status`.
  Manter.
