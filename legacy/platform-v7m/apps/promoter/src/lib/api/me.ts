import "server-only";

import { djangoFetch, DjangoError } from "./client";
import {
  candidateToMeCandidate,
  pendingSteps as pendingStepsImpl,
} from "./me-derive";
import type {
  CandidateMe,
  Commission,
  Lead,
  MeCandidate,
  MePromoter,
  MeResponse,
  PromoterMe,
  PromoterSummary,
} from "./types";

/**
 * `GET /me` — endpoint unificado do fluxo "tudo-async-até-receber".
 * Ver `.reviews/api-spec-me-unificado.md` para o contrato.
 *
 * Estratégia de 2 caminhos:
 *  1) Tenta o novo endpoint unificado. Se 200, usa o shape novo.
 *  2) Se 404 (back ainda não deployou), cai pro modo legado: chama
 *     `candidate/me`, `promoter/me`, `promoter/me/summary` em paralelo
 *     e monta o `MeResponse` client-side. Sessões que não têm role
 *     `promoter` recebem 403/404 nos endpoints legados — segue com
 *     `promoter: null` (degrade gracioso: o painel mostra só o alerta
 *     de onboarding + link de captação, sem goal/leads/comissões).
 *
 * O painel nunca quebra por causa de um endpoint que ainda não subiu.
 */
export async function getMe(roles: string[]): Promise<MeResponse> {
  try {
    return await djangoFetch<MeResponse>("/api/v1/collaborators/me");
  } catch (err) {
    if (!(err instanceof DjangoError) || err.status !== 404) {
      // 401, 500, etc. — propaga. O layout já trata 401.
      throw err;
    }
    // Fallback: back ainda não deployou o /me.
    return getMeLegacy(roles);
  }
}

async function getMeLegacy(roles: string[]): Promise<MeResponse> {
  const wantCandidate = roles.includes("candidate");
  const wantPromoter = roles.includes("promoter") || wantCandidate; // novo fluxo: candidato já quer ver

  const [candidate, promoter, summary] = await Promise.all([
    wantCandidate
      ? safeFetch<CandidateMe>("/api/v1/collaborators/candidate/me")
      : Promise.resolve(null),
    wantPromoter
      ? safeFetch<PromoterMe>("/api/v1/collaborators/promoter/me")
      : Promise.resolve(null),
    wantPromoter
      ? safeFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary")
      : Promise.resolve(null),
  ]);

  const meCandidate: MeCandidate | null = candidate
    ? candidateToMeCandidate(candidate)
    : null;

  const mePromoter: MePromoter | null = promoter
    ? {
        external_id: promoter.external_id,
        hub_external_id: promoter.hub_external_id,
        status: promoter.status,
        ref_url: promoter.ref_url,
        pre_matriculado: promoter.pre_matriculado,
        blocks: promoter.blocks,
        summary: summary ?? null,
      }
    : null;

  // Sem candidate/me nem promoter/me? Sessão degenerada — devolve o mínimo.
  return {
    external_id: promoter?.external_id ?? "unknown",
    name: "Você", // o nome real vem via `session.name` no layout; aqui só estrutural
    roles,
    candidate: meCandidate,
    promoter: mePromoter,
  };
}

/** Fetch tolerante a 404/403 — devolve `null` em vez de explodir. */
async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    return await djangoFetch<T>(path);
  } catch (err) {
    if (err instanceof DjangoError && (err.status === 404 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Derivação de `steps` a partir do `candidate/me` legado.
// Re-exporta `candidateToMeCandidate` de `./me-derive` (módulo puro,
// testável fora do runtime Next.js). Mantém equivalência 1:1 com a regra
// documentada em api-spec-me-unificado.md. Quando o back disponibilizar
// o /me, esta função vira dead code — o front passa a ler
// `me.candidate.steps` direto.
// -----------------------------------------------------------------------------

// (mantido apenas como re-export via `me-derive` — sem duplicação)

// -----------------------------------------------------------------------------
// Helpers de conveniência para o painel.
// -----------------------------------------------------------------------------

/** Quantas etapas ainda estão pendentes. */
export function pendingStepsCount(me: MeResponse): number {
  if (!me.candidate) return 0;
  return pendingStepsImpl(me.candidate.steps);
}

/** Teto de pagamento (held ou liberado) para o header "Acumulado / Liberado". */
export function payoutStatus(me: MeResponse): {
  held: boolean;
  reason: string;
  amount: string;
  nextPayoutAt: string | null;
} {
  const hold = me.promoter?.summary?.payout_hold;
  if (!hold) {
    return { held: false, reason: "none", amount: "0.00", nextPayoutAt: null };
  }
  return {
    held: hold.held,
    reason: hold.reason,
    amount: hold.amount_held,
    nextPayoutAt: hold.next_payout_at,
  };
}

// Re-exports para os consumidores não terem que importar de `./types`.
export type { Lead, Commission, PromoterMe, PromoterSummary };

/** Tipo do summary já desembrulhado (pra subcomponentes do painel). */
export type Summary = NonNullable<MePromoter["summary"]>;
