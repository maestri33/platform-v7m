/**
 * Modelo de roles do app do promotor (candidato → promotor).
 *
 * O `whoami`/JWT devolve TODAS as roles ativas (back: "emite JWT com TODAS as
 * roles ativas"). Este app só_rodeia o funil do promotor: `coordinator`/`staff`
 * ainda vêm no JWT (todo coordenador é promotor), mas a área de coordenação mora
 * num app separado (hub.maestri.group) — aqui quem tem essas roles acessa como
 * promotor. Se paramos em três eixos:
 *
 *  - **stage** (eixo 1, linear, do funil): candidate → promoter. É "onde a
 *    pessoa está" no onboarding. Pega-se o mais avançado.
 *  - **gate** (trava temporária que pode surgir a qualquer momento): `training`.
 *    Curso inicial OU atualização/recado obrigatório. Enquanto presente, tranca
 *    tudo no LMS. É a PRIORIDADE MÁXIMA (inverte o velho comportamento, em que
 *    `training` era a prioridade mais baixa e a tela de treino te expulsava).
 *  - **grant** (poder administrativo, aditivo, empilha por cima de promotor):
 *    `coordinator`/`staff` — reconhecidas, mas NÃO roteiam pra nada neste app.
 *
 * Funções PURAS sobre `string[]` — sem `server-only`, pra valer no server
 * (layout/guard) e no client (nav) igual.
 */

/** Roles conhecidas do funil/poderes. `staff` é reconhecida só pra rotear pra fora. */
export type Role = "candidate" | "training" | "promoter" | "coordinator" | "staff";

/** App do cliente final (lead/enrollment/student/veteran) — quem não é do V7M vai pra lá. */
export const OUTSIDE_APP_URL = "https://app.supletivo.net.br";

/** Nenhuma role interna reconhecida — a conta é do app do cliente (Supletivo). */
export function isOutsider(roles: string[]): boolean {
  return (
    !roles.includes("candidate") &&
    !roles.includes("training") &&
    !roles.includes("promoter")
  );
}

/**
 * Trava de elegibilidade de promotor pleno / saques.
 * Se `training` está nas roles, o status de promotor pleno e recebimento de saques
 * aguarda a conclusão das matérias obrigatórias, sem travar a captação de leads.
 */
export function isTrainingLocked(roles: string[]): boolean {
  return roles.includes("training");
}

/**
 * Onboarding do candidato: ainda é `candidate` e NÃO virou `promoter`.
 */
export function isOnboarding(roles: string[]): boolean {
  return roles.includes("candidate") && !roles.includes("promoter");
}

/** Base de todo mundo que passou do funil: tem o status de promotor pleno. */
export function isPromoter(roles: string[]): boolean {
  return roles.includes("promoter");
}

/**
 * Para onde a pessoa aterrissa pós-login (role-router central).
 * No modelo assíncrono, todos os colaboradores logados aterrissam no /painel.
 */
export function landingFor(roles?: string[]): string {
  void roles;
  return "/painel";
}


