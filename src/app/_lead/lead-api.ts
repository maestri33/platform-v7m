/**
 * Adaptador entre a API real (`src/lib/api.ts`) e a máquina de estados do funil.
 *
 * A tela não sabe falar HTTP: ela recebe um `CheckOutcome` já decidido — ou segue pro OTP, ou
 * abre um modal. Todo o "qual erro vira qual modal" mora aqui, num lugar só, porque é aqui que
 * o contrato do protótipo (`flow-data.ts`) encosta no contrato do backend.
 *
 * O mock determinístico do protótipo (gatilhos por final de número) continua disponível atrás de
 * `NEXT_PUBLIC_LEAD_MOCK=1` — serve pra demonstrar as saídas sem backend. **Atenção: as
 * `NEXT_PUBLIC_*` são embutidas no BUILD**, então trocar a flag exige rebuild; não é chave de
 * runtime. Os testes E2E não usam o mock: eles interceptam a rede (`page.route`) pra exercitar
 * a fiação de verdade.
 */

import { ApiError, checkPhone, getReferralName, loginOtp, type LoginResponse } from "@/lib/api";

import type { ModalKind } from "./flow-data";

/** Cooldown de reenvio do OTP quando o backend não manda um (protótipo: 30s). */
export const OTP_COOLDOWN_S = 30;

/** Roles do funil do aluno que JÁ passaram do lead — este app não as atende (DOCUMENTACAO §33). */
const PAST_LEAD_ROLES = ["enrollment", "student", "veteran"];

export type CheckOutcome =
  | {
      kind: "otp";
      externalId: string;
      otpWait: number;
      /** `false` = rate-limit: nenhum código NOVO saiu agora (um recente já tinha saído). */
      sent: boolean;
      /** Roles vigentes — decidem pra onde o login manda (funil × matrícula × app do aluno). */
      roles: string[];
    }
  /** `block` = o número entra na lista de bloqueados (não repetimos a chamada). */
  | { kind: "modal"; modal: ModalKind; block?: boolean };

/**
 * `funnel` = entrada normal (passo 1 → 2), com o gate de role do funil do lead.
 * `relogin` = quem volta de `/matricula` ou `/provas` com o JWT morto — JÁ passou do lead,
 * então o gate não se aplica (barrar ali seria expulsar o aluno do próprio app).
 */
export type CheckMode = "funnel" | "relogin";

const MOCK = process.env.NEXT_PUBLIC_LEAD_MOCK === "1";

/** Gatilhos determinísticos do protótipo, por final do número (ver TRIGGERS em flow-data). */
const MOCK_TAILS: Record<string, CheckOutcome> = {
  "00": { kind: "modal", modal: "server" },
  "11": { kind: "modal", modal: "slow" },
  "22": { kind: "modal", modal: "offline" },
  "33": { kind: "modal", modal: "client" },
  "77": { kind: "modal", modal: "staff" },
  "88": { kind: "modal", modal: "unverified" },
  "99": { kind: "modal", modal: "invalid", block: true },
};

const MOCK_OTP_OK: CheckOutcome = {
  kind: "otp",
  externalId: "mock-external-id",
  otpWait: OTP_COOLDOWN_S,
  sent: true,
  roles: ["lead"],
};

function mockCheck(phone: string): Promise<CheckOutcome> {
  const hit = MOCK_TAILS[phone.slice(-2)];
  return new Promise((resolve) => setTimeout(() => resolve(hit ?? MOCK_OTP_OK), 1100));
}

/**
 * Passo 1 do funil: verifica o telefone e devolve o que a tela deve fazer. É também o
 * REENVIO do passo 2 — pedir outro código é chamar o check de novo (não há endpoint próprio).
 *
 * Nunca rejeita — falha de rede/servidor também é um `CheckOutcome` (modal). A tela do check
 * não tem caminho de exceção: ou avança, ou mostra um modal com saída.
 */
export async function runPhoneCheck(
  phone: string,
  ref: string,
  mode: CheckMode = "funnel",
): Promise<CheckOutcome> {
  if (MOCK) return mockCheck(phone);
  try {
    const res = await checkPhone(phone, ref);
    const roles = res.roles ?? [];

    if (res.found) {
      const pastLead = roles.some((r) => PAST_LEAD_ROLES.includes(r));
      if (!roles.includes("lead") && !pastLead) {
        return { kind: "modal", modal: "staff" }; // 🙌 equipe/promotor → portal da equipe
      }
      // Gate de role (DOCUMENTACAO §33): no FUNIL só entra `lead` — o re-login não passa
      // por aqui, quem volta de /matricula ou /provas já é aluno por definição.
      if (mode === "funnel" && pastLead) {
        return { kind: "modal", modal: "client" }; // 🎓 já é aluno → app.v7m.org
      }
    } else if (!res.created) {
      // Não achou e não criou: o motivo está no WhatsApp (o backend só captura com zap confirmado).
      if (res.whatsapp === false) return { kind: "modal", modal: "invalid", block: true };
      if (res.whatsapp === null) return { kind: "modal", modal: "unverified" };
      // Zap ok mas a captura degradou (sem promotor padrão, corrida de unicidade…): tentar de novo.
      return { kind: "modal", modal: "server" };
    }

    if (!res.external_id) return { kind: "modal", modal: "server" };
    // `otp_sent:false` + `otp_wait` = rate-limit: um código recente JÁ saiu, então a tela do OTP é
    // o lugar certo (com o cooldown restante). Sem `otp_wait`, nenhum código saiu → erro.
    if (!res.otp_sent && res.otp_wait == null) return { kind: "modal", modal: "server" };
    return {
      kind: "otp",
      externalId: res.external_id,
      otpWait: res.otp_wait ?? OTP_COOLDOWN_S,
      sent: res.otp_sent,
      roles,
    };
  } catch (error: unknown) {
    return checkFailure(error);
  }
}

export type LoginOutcome =
  | { kind: "ok"; tokens: LoginResponse }
  /** 👀 errou o código — ele AINDA vale, é só digitar de novo. */
  | { kind: "wrong" }
  /** ⏳ não há código utilizável (venceu, esgotou tentativas ou já foi usado): pedir outro. */
  | { kind: "expired" }
  /** A sessão guardada aponta pra um usuário que não existe: recomeçar o funil. */
  | { kind: "restart" }
  | { kind: "modal"; modal: ModalKind };

/** Gatilhos do protótipo (só com NEXT_PUBLIC_LEAD_MOCK=1). Ver TRIGGERS em flow-data. */
const MOCK_CODES: Record<string, LoginOutcome> = {
  "000000": { kind: "wrong" },
  "111111": { kind: "expired" },
};

const MOCK_TOKENS: LoginResponse = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "bearer",
};

function mockLogin(code: string): Promise<LoginOutcome> {
  const hit = MOCK_CODES[code];
  return new Promise((resolve) =>
    setTimeout(() => resolve(hit ?? { kind: "ok", tokens: MOCK_TOKENS }), 900),
  );
}

/**
 * Passo 2 do funil: troca o código pelo JWT. Como o check, nunca rejeita.
 *
 * `wrong` × `expired` é o contrato novo do backend (401 `OTP_INVALID` × `OTP_EXPIRED`):
 * são telas DIFERENTES pro usuário — 👀 "confere e digita de novo" contra ⏳ "esse venceu,
 * já te mandei outro". Com um 401 genérico, quem esgotou as tentativas ficava preso
 * digitando um código que nunca mais ia passar.
 */
export async function runOtpLogin(externalId: string, code: string): Promise<LoginOutcome> {
  if (MOCK) return mockLogin(code);
  try {
    return { kind: "ok", tokens: await loginOtp(externalId, code) };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "modal", modal: "slow" };
    }
    if (!(error instanceof ApiError)) return { kind: "modal", modal: "offline" };
    if (error.status === 401) {
      return error.code === "OTP_EXPIRED" ? { kind: "expired" } : { kind: "wrong" };
    }
    // 404 = `external_id` desconhecido: a sessão do aparelho envelheceu (conta removida,
    // banco recriado). Insistir no código não resolve — o caminho é refazer o passo 1.
    if (error.status === 404) return { kind: "restart" };
    // 403 NOT_IN_FUNNEL: o número é da equipe — o acesso dela é por outro portal.
    if (error.status === 403) return { kind: "modal", modal: "staff" };
    return { kind: "modal", modal: "server" };
  }
}

function checkFailure(error: unknown): CheckOutcome {
  // Timeout do AbortController (API_TIMEOUT_MS) → "servidor lento ☕", que oferece tentar de novo.
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "modal", modal: "slow" };
  }
  // `fetch` só rejeita fora de ApiError quando a rede nem saiu do aparelho.
  if (!(error instanceof ApiError)) return { kind: "modal", modal: "offline" };
  // 422 = o backend recusou o FORMATO do número (DDD inexistente…) — bloqueia como o gatilho "99".
  if (error.status === 422) return { kind: "modal", modal: "invalid", block: true };
  return { kind: "modal", modal: "server" };
}

/**
 * Nome do promotor pro selo "Indicado por …". Best-effort: qualquer falha vira "sem selo" —
 * um selo ausente é infinitamente melhor que travar a entrada do funil por causa dele.
 */
export async function resolveReferralName(ref: string): Promise<string> {
  if (!ref || MOCK) return MOCK ? ref : "";
  try {
    const res = await getReferralName(ref);
    return res.name ?? "";
  } catch {
    return "";
  }
}
