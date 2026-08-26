/**
 * Funil do candidato (ordem do backend) — helpers compartilhados entre o painel
 * e as páginas de etapa.
 *
 * Modelo "tudo-async-até-receber" (ver .reviews/api-spec-me-unificado.md):
 * as 5 etapas viraram componentes independentes acessíveis a partir dos
 * tiles do `/painel`. Não há mais wizard forçado: ao concluir uma etapa o
 * usuário volta pro `/painel` e decide qual fazer a seguir (ou ver os
 * números da semana). `NEXT_STAGE` aponta tudo pra `/painel`.
 *
 * Mantemos `STAGE_HREF` + `candidateStageHref` porque o back ainda
 * responde com `WRONG_STATUS`/`expected_status` quando o candidato
 * tenta enviar uma foto numa etapa que o backend considera passada
 * (ex.: reenviar RG depois de status=approved). Nesse caso, o form
 * navega pra `STAGE_HREF[expected]` em vez de quebrar — o destino
 * provável é `/painel` mesmo, e o front usa isso como fallback.
 */
import type { CandidateMe, CandidateStatus } from "@/lib/api/types";

/** Ordem do funil (mesma do backend). `status` nomeia a PRÓXIMA etapa a fazer. */
export const FUNNEL_ORDER: CandidateStatus[] = [
  "started",
  "profile",
  "address",
  "documents",
  "pix",
  "education",
  "selfie",
  "completed",
];

/** Página da etapa atual — pra onde o painel manda o candidato direto. */
export const STAGE_HREF: Record<CandidateStatus, string> = {
  started: "/documento",
  profile: "/documento",
  address: "/documento",
  documents: "/pix",
  pix: "/pix",
  education: "/selfie",
  selfie: "/selfie",
  completed: "/painel",
  approved: "/painel",
  rejected: "/painel",
};

/**
 * `STAGE_HREF` à prova de drift: se o backend ganhar um status que este build
 * não conhece, cai no painel em vez de `redirect(undefined)` (500 na cara do
 * candidato — aconteceu quando `education` nasceu só no back).
 */
export function stageHref(status: string | undefined | null): string {
  return STAGE_HREF[status as CandidateStatus] ?? "/painel";
}

/** Retomada canônica usando também os flags que o `status` sozinho não distingue. */
export function candidateStageHref(me: CandidateMe): string {
  if (me.address_proof?.status === "rejected" || me.address_proof?.needs_kinship) {
    return "/endereco";
  }
  const recovery = me.blocks?.find((block) =>
    ["rg", "cnh", "address_proof", "selfie"].includes(block.source_type),
  );
  if (recovery?.source_type === "address_proof") return "/endereco";
  if (recovery?.source_type === "rg" || recovery?.source_type === "cnh") {
    return "/documento";
  }
  if (recovery?.source_type === "selfie") return "/selfie";
  if (["started", "profile", "address", "documents", "pix"].includes(me.status)) {
    if (!hasCapturedIdentityDocument(me)) return "/documento";
    if (!me.address_proof?.photo) return "/endereco";
    if (!me.pix_validated) return "/pix";
    return "/escolaridade";
  }
  return stageHref(me.status);
}

export function hasCapturedIdentityDocument(me: CandidateMe): boolean {
  const rg = me.documents?.rg;
  const cnh = me.documents?.cnh;
  const rgComplete = Boolean(rg?.full_photo || (rg?.front_photo && rg?.back_photo));
  const cnhComplete = Boolean(cnh?.full_photo || cnh?.front_photo || cnh?.back_photo);
  return rgComplete || cnhComplete;
}

export function documentSectionCaptured(doc: {
  doc_type?: string | null;
  has_front?: boolean;
  has_back?: boolean;
  has_full?: boolean;
  front_photo?: string | null;
  back_photo?: string | null;
  full_photo?: string | null;
}): boolean {
  const hasFront = Boolean(doc.has_front || doc.front_photo);
  const hasBack = Boolean(doc.has_back || doc.back_photo);
  const hasFull = Boolean(doc.has_full || doc.full_photo);
  if (doc.doc_type === "rg") return hasFull || (hasFront && hasBack);
  if (doc.doc_type === "cnh") return hasFull || hasFront || hasBack;
  return false;
}

/**
 * Próximo passo depois de concluir cada etapa.
 *
 * **Mudou:** antes era wizard auto-avançante (concluir `documents` →
 * `address`, etc.). Agora todas as etapas voltam pro `/painel` — o
 * candidato decide a próxima, vê os números da semana, e o
 * `OnboardingGrid` mostra o estado atualizado de cada tile.
 *
 * Mantido como `Record<string, string>` por compatibilidade com os
 * `*Form.tsx` que referenciam `NEXT_STAGE.documents`, `NEXT_STAGE.pix`,
 * etc. — todos retornam `/painel`.
 */
export const NEXT_STAGE: Record<string, string> = {
  profile: "/painel",
  address: "/painel",
  documents: "/painel",
  pix: "/painel",
  education: "/painel",
  selfie: "/painel",
};

/**
 * A etapa `stage` já foi concluída pra quem está em `current`? Usado pra travar
 * etapas preenchidas em resumo somente-leitura (só reabre se o back reprovar).
 */
export function stageCompleted(stage: CandidateStatus, me: CandidateMe): boolean {
  const currentIndex = FUNNEL_ORDER.indexOf(me.status);
  switch (stage) {
    case "profile":
      return currentIndex >= FUNNEL_ORDER.indexOf("profile");
    case "address":
      return currentIndex >= FUNNEL_ORDER.indexOf("address");
    case "documents":
      return currentIndex >= FUNNEL_ORDER.indexOf("pix");
    case "pix":
      return Boolean(me.pix_validated);
    case "education":
      return (
        me.profile?.education_level != null &&
        me.profile?.education_completed != null
      );
    default:
      return currentIndex > FUNNEL_ORDER.indexOf(stage);
  }
}

/**
 * `WRONG_STATUS` (409): a etapa desta tela não é a atual do funil (aba velha /
 * fora de ordem). Em vez de mostrar erro, os forms navegam pra etapa que o
 * backend espera (`expected_status` vem no envelope do erro).
 */
export function wrongStatusHref(
  code: string | undefined,
  expectedStatus: string | undefined,
): string | null {
  if (code !== "WRONG_STATUS") return null;
  return STAGE_HREF[expectedStatus as CandidateStatus] ?? "/painel";
}
