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

import { ApiError, checkPhone, getReferralName } from "@/lib/api";

import type { ModalKind } from "./flow-data";

/** Cooldown de reenvio do OTP quando o backend não manda um (protótipo: 30s). */
export const OTP_COOLDOWN_S = 30;

/** Roles do funil do aluno que JÁ passaram do lead — este app não as atende (DOCUMENTACAO §33). */
const PAST_LEAD_ROLES = ["enrollment", "student", "veteran"];

export type CheckOutcome =
  | { kind: "otp"; externalId: string; otpWait: number }
  /** `block` = o número entra na lista de bloqueados (não repetimos a chamada). */
  | { kind: "modal"; modal: ModalKind; block?: boolean };

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

function mockCheck(phone: string): Promise<CheckOutcome> {
  const hit = MOCK_TAILS[phone.slice(-2)];
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          hit ?? { kind: "otp", externalId: "mock-external-id", otpWait: OTP_COOLDOWN_S },
        ),
      1100,
    ),
  );
}

/**
 * Passo 1 do funil: verifica o telefone e devolve o que a tela deve fazer.
 *
 * Nunca rejeita — falha de rede/servidor também é um `CheckOutcome` (modal). A tela do check
 * não tem caminho de exceção: ou avança, ou mostra um modal com saída.
 */
export async function runPhoneCheck(phone: string, ref: string): Promise<CheckOutcome> {
  if (MOCK) return mockCheck(phone);
  try {
    const res = await checkPhone(phone, ref);
    const roles = res.roles ?? [];

    if (res.found) {
      // Gate de role (DOCUMENTACAO §33): AQUI só entra `lead`.
      if (roles.some((r) => PAST_LEAD_ROLES.includes(r))) {
        return { kind: "modal", modal: "client" }; // 🎓 já é aluno → app.v7m.org
      }
      if (!roles.includes("lead")) {
        return { kind: "modal", modal: "staff" }; // 🙌 equipe/promotor → portal da equipe
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
    };
  } catch (error: unknown) {
    return checkFailure(error);
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
