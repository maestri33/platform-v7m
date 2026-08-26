/**
 * Modelo de roles do app do promotor (candidato → promotor).
 *
 * O `whoami`/JWT devolve TODAS as roles ativas (back: "emite JWT com TODAS as
 * roles ativas"). Este app só_rodeia o funil do promotor: `coordinator`/`staff`
 * ainda vêm no JWT (todo coordenador é promotor), mas a área de coordenação mora
 * num app separado (hub.v7m.org) — aqui quem tem essas roles acessa como
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

/** Áreas que o shell pode liberar conforme entitlement. */
export type Area = "onboarding" | "promoter";

/**
 * Trava de treinamento. Se `training` está nas roles, o ambiente de promotor
 * (e coordenação) fica BLOQUEADO — a pessoa só acessa o LMS até o back parar de
 * devolver `training`. Vale pro curso inicial e pra qualquer atualização/recado.
 */
export function isTrainingLocked(roles: string[]): boolean {
  return roles.includes("training");
}

/**
 * Onboarding do candidato: ainda é `candidate` e NÃO virou `promoter`. Enquanto
 * isso, vê o dashboard com o `OnboardingGrid` (5 tiles para as etapas) e o
 * alerta de hold de pagamento. As 5 etapas são acessíveis a partir dos tiles
 * — não há mais wizard forçado.
 *
 * Quem já é promoter não está mais em onboarding, mesmo que a flag candidate
 * sobreviva no back.
 */
export function isOnboarding(roles: string[]): boolean {
  return roles.includes("candidate") && !roles.includes("promoter");
}

/** Base de todo mundo que passou do funil: tem o painel/leads/comissões. */
export function isPromoter(roles: string[]): boolean {
  return roles.includes("promoter");
}

/** Poder de coordenação de polo/hub (aditivo — coordenador É também promotor). */
export function isCoordinator(roles: string[]): boolean {
  return roles.includes("coordinator");
}

/** Staff (admin geral) — fora deste app; usado só pra rotear pra fora com elegância. */
export function isStaff(roles: string[]): boolean {
  return roles.includes("staff");
}

/**
 * A pessoa pode acessar a área? Centraliza o gating do shell.
 *
 * Importante: `training` é trava DURA — quando ativa, nega `promoter` (só o
 * LMS passa, tratado fora daqui pelo guard que força `/treinamento`).
 * `onboarding` só existe enquanto candidato não é promotor.
 */
export function can(roles: string[], area: Area): boolean {
  if (area === "onboarding") return isOnboarding(roles);
  if (isTrainingLocked(roles)) return false; // trava: nada de promotor
  if (area === "promoter") return isPromoter(roles) || isOnboarding(roles);
  return false;
}

/**
 * Para onde a pessoa aterrissa pós-login (role-router central). Ordem de
 * prioridade espelha os eixos: trava de treino → onboarding → shell normal.
 * `staff` puro (sem promoter/coordinator) cai no painel, que mostra o aviso de
 * "use o app de staff" — não derruba a sessão.
 */
export function landingFor(roles: string[]): string {
  if (isTrainingLocked(roles)) return "/treinamento";
  if (isOnboarding(roles)) return "/painel"; // dashboard com grid de etapas + alerta de hold
  return "/painel";
}
