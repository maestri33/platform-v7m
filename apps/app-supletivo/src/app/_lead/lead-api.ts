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

import {
  ApiError,
  checkPhone,
  confirmIdentity,
  fetchPricing,
  getLeadMe,
  getReferralName,
  type IdentityOut,
  type LeadMe,
  loginOtp,
  type LoginResponse,
  setLeadCheckout,
  setLeadEmail,
} from "@/lib/api";
import { parsePaymentMethod, type PaymentMethod, type Pricing } from "@/lib/payment";

import { MOCK_IDENTITY, type ModalKind } from "./flow-data";

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

const MOCK = process.env.NEXT_PUBLIC_LEAD_MOCK === "1";

/** Exposto pra máquina de estados: no mock o checkout NÃO redireciona de verdade. */
export const LEAD_MOCK = MOCK;

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
export async function runPhoneCheck(phone: string, ref: string): Promise<CheckOutcome> {
  if (MOCK) return mockCheck(phone);
  try {
    const res = await checkPhone(phone, ref);
    const roles = res.roles ?? [];

    if (res.found) {
      const pastLead = roles.some((r) => PAST_LEAD_ROLES.includes(r));
      // Regra de casa (Victor 2026-07-28): CLIENTE — lead, enrollment, student, veteran —
      // segue AQUI pro OTP, e o `goAfterLogin` roteia por role (/matricula, /aluno…). Só
      // quem NÃO tem nenhuma role de cliente (equipe/promotor puro) vai pro portal. O gate
      // antigo desviava o matriculado pro app.maestri.group e o deixava sem onde digitar o
      // código que este mesmo check acabava de disparar.
      if (!roles.includes("lead") && !pastLead) {
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

export type IdentityOutcome =
  | { kind: "ok"; identity: IdentityOut }
  /**
   * 409 `CPF_CONFLICT` — o CPF é de outra conta. Não é só um erro de tela: o backend JÁ
   * apagou a conta criada nesta tentativa e avisou o titular real. Logo a sessão deste
   * aparelho aponta pra um usuário que não existe mais e PRECISA morrer junto — por isso
   * isto é um `kind` próprio e não um `modal`, pra máquina de estados não poder esquecer.
   */
  | { kind: "conflict" }
  /** 401 depois do refresh: o JWT morreu no meio do funil — refazer do passo 1. */
  | { kind: "restart" }
  | { kind: "modal"; modal: ModalKind };

/** Gatilhos do protótipo (só com NEXT_PUBLIC_LEAD_MOCK=1): final 0 = já existe · 9 = servidor. */
function mockIdentity(cpf: string): Promise<IdentityOutcome> {
  const tail = cpf.slice(-1);
  const out: IdentityOutcome =
    tail === "0"
      ? { kind: "conflict" }
      : tail === "9"
        ? { kind: "modal", modal: "server" }
        : {
            kind: "ok",
            identity: {
              cpf,
              name: MOCK_IDENTITY.name,
              birth_date: `${MOCK_IDENTITY.birthYear}-${String(MOCK_IDENTITY.birthMonth + 1).padStart(2, "0")}-${String(MOCK_IDENTITY.birthDay).padStart(2, "0")}`,
              sex: MOCK_IDENTITY.sex,
              photo: null,
            },
          };
  return new Promise((resolve) => setTimeout(() => resolve(out), 1100));
}

/**
 * Passo 3 do funil: confirma o CPF e traz a identidade do pergaminho. Como o check e o
 * login, nunca rejeita — toda falha vira uma saída que a tela sabe desenhar.
 *
 * `CPF_NOT_FOUND` cai no MESMO sheet do DV inválido de propósito: pro usuário as duas coisas
 * são "esse número não fechou, confere aí". Separar viraria uma tela a mais explicando uma
 * distinção (base da Receita × dígito) que não muda em nada o que ele tem a fazer.
 */
export async function runIdentity(cpf: string): Promise<IdentityOutcome> {
  if (MOCK) return mockIdentity(cpf);
  try {
    return { kind: "ok", identity: await confirmIdentity(cpf) };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "modal", modal: "slow" };
    }
    if (!(error instanceof ApiError)) return { kind: "modal", modal: "offline" };
    if (error.status === 409) {
      // `CPF_ALREADY_SET` = esta conta já confirmou OUTRO CPF; trocar é com o suporte.
      return error.code === "CPF_ALREADY_SET"
        ? { kind: "modal", modal: "support" }
        : { kind: "conflict" };
    }
    if (error.status === 422) return { kind: "modal", modal: "cpfinvalid" };
    if (error.status === 401) return { kind: "restart" };
    // 502 `CPF_SERVICE_DOWN` (CPFHub fora) e 5xx: tem saída de "tentar de novo".
    return { kind: "modal", modal: "server" };
  }
}

export type EmailOutcome =
  /** Gravou. `alreadyYours` troca a celebração: novo → "Excelente!" · o próprio → "já é o seu". */
  | { kind: "ok"; alreadyYours: boolean }
  /**
   * 409 `EMAIL_CONFLICT` — e-mail de OUTRA conta. Vira o estado-escudo INLINE da tela
   * ("Esse e-mail já está protegido"), nunca modal (DOCUMENTACAO §216) — e sem vazar
   * nada de quem é o dono.
   */
  | { kind: "taken" }
  /** 422 — o backend recusou o formato. Última linha: o front já validou antes de enviar. */
  | { kind: "invalid" }
  /** 401 depois do refresh: o JWT morreu no meio do funil — refazer do passo 1. */
  | { kind: "restart" }
  | { kind: "modal"; modal: ModalKind };

/** Gatilhos do protótipo (só com NEXT_PUBLIC_LEAD_MOCK=1): local `outro`/`usado` = de outra
 * conta · `mesmo` = já é o seu · demais válidos = novo. Ver TRIGGERS em flow-data. */
function mockEmail(email: string): Promise<EmailOutcome> {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const out: EmailOutcome =
    local === "outro" || local === "usado"
      ? { kind: "taken" }
      : { kind: "ok", alreadyYours: local === "mesmo" };
  return new Promise((resolve) => setTimeout(() => resolve(out), 1100));
}

/**
 * Passo 5 do funil: grava o e-mail. Como os anteriores, nunca rejeita — toda falha
 * vira uma saída que a tela sabe desenhar (escudo inline, shake, modal transitório).
 */
export async function runEmail(email: string): Promise<EmailOutcome> {
  if (MOCK) return mockEmail(email);
  try {
    const res = await setLeadEmail(email);
    return { kind: "ok", alreadyYours: res.already_yours };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "modal", modal: "slow" };
    }
    if (!(error instanceof ApiError)) return { kind: "modal", modal: "offline" };
    if (error.status === 409) return { kind: "taken" };
    if (error.status === 422) return { kind: "invalid" };
    if (error.status === 401) return { kind: "restart" };
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

export type CheckoutOutcome =
  /** Sessão criada. `url` null = o gateway ainda está gerando — acompanhar por /lead/me. */
  | { kind: "ok"; url: string | null }
  /** 409 `ALREADY_PAID` — este lead JÁ pagou: o lugar dele é o painel, não outro checkout. */
  | { kind: "paid" }
  /** 409 `PROFILE_INCOMPLETE` — pulou etapa (URL na mão): volta pro passo que falta. */
  | { kind: "incomplete"; missing: string[] }
  /** 401 depois do refresh: o JWT morreu no meio do funil — refazer do passo 1. */
  | { kind: "restart" }
  /** Rede/5xx/timeout → a tela ELEGANTE de erro do checkout (sem modal — DOCUMENTACAO §229). */
  | { kind: "error" };

/** Gatilhos do protótipo (só com NEXT_PUBLIC_LEAD_MOCK=1): PIX conclui · Cartão simula o
 * erro de criação. Ver TRIGGERS em flow-data. */
function mockCheckout(method: string): Promise<CheckoutOutcome> {
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  const out: CheckoutOutcome =
    method === "card"
      ? { kind: "error" }
      : { kind: "ok", url: `https://pagamento.parceiro.com.br/c/${token}` };
  return new Promise((resolve) => setTimeout(() => resolve(out), 3400));
}

/**
 * Passo 6 do funil: cria (ou TROCA) a sessão de pagamento. Como os anteriores, nunca
 * rejeita. O erro de criação NÃO vira modal: a spec pede a tela elegante com
 * Tentar novamente / outra forma / suporte — quem desenha é o próprio checkout.
 */
export async function runCheckout(method: string): Promise<CheckoutOutcome> {
  if (MOCK) return mockCheckout(method);
  try {
    const co = await setLeadCheckout(method);
    return { kind: "ok", url: co.url ?? co.checkout_url ?? null };
  } catch (error: unknown) {
    if (!(error instanceof ApiError)) return { kind: "error" };
    if (error.status === 401) return { kind: "restart" };
    if (error.status === 409) {
      if (error.code === "ALREADY_PAID") return { kind: "paid" };
      if (error.code === "PROFILE_INCOMPLETE") {
        // `missing_fields` pode vir no extra; sem ele, o CPF é o primeiro buraco possível
        // do caminho canônico — mandar pra lá nunca é errado (cpf → email → planos).
        const missing = error.extra?.missing_fields;
        return { kind: "incomplete", missing: Array.isArray(missing) ? missing : ["cpf"] };
      }
    }
    return { kind: "error" };
  }
}

export type CheckoutPollOutcome =
  | { kind: "url"; url: string }
  /** Sessão existe mas o gateway ainda não devolveu a URL — continuar acompanhando. */
  | { kind: "pending" }
  | { kind: "paid" }
  | { kind: "restart" }
  /** Falha momentânea da consulta — o poll continua; quem decide desistir é o deadline. */
  | { kind: "transient" };

/**
 * Acompanha o nascimento da URL do gateway (`GET /lead/me`) quando a criação voltou
 * sem ela. Uma consulta = um outcome; o loop e o deadline moram na máquina de estados.
 */
export async function runCheckoutStatus(): Promise<CheckoutPollOutcome> {
  try {
    const me = await getLeadMe();
    if (me.status === "paid") return { kind: "paid" };
    const url = me.checkout?.url ?? me.checkout?.checkout_url ?? null;
    return url ? { kind: "url", url } : { kind: "pending" };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) return { kind: "restart" };
    return { kind: "transient" };
  }
}

/** O que o painel de retorno precisa saber do checkout VIGENTE (GET /lead/me). */
export interface PainelCheckout {
  method: PaymentMethod;
  /** Valor da sessão vigente — o que será cobrado de fato (não a vitrine). */
  amount: string;
  /** URL viva do gateway. Retomar é REUSAR isto — recriar mataria o PIX antigo. */
  url: string | null;
}

export type LeadMeOutcome =
  | {
      kind: "ok";
      /** `paid` → o lugar da pessoa é a matrícula, não o funil. */
      paid: boolean;
      name: string | null;
      checkout: PainelCheckout | null;
    }
  | { kind: "restart" }
  /** Rede/5xx: o painel DEGRADA pro estado local em vez de travar a tela de retorno. */
  | { kind: "error" };

/**
 * Retrato do lead pro painel de retorno (`GET /lead/me`). Nunca rejeita. No mock não
 * há backend: devolve `error` e o painel segue com o estado local, como o protótipo.
 */
export async function runLeadMe(): Promise<LeadMeOutcome> {
  if (MOCK) return { kind: "error" };
  try {
    const me: LeadMe = await getLeadMe();
    const co = me.checkout ?? null;
    return {
      kind: "ok",
      paid: me.status === "paid",
      name: me.customer.name ?? null,
      checkout: co
        ? {
            method: parsePaymentMethod(co.payment_method) ?? "pix",
            amount: co.amount,
            url: co.url ?? co.checkout_url ?? null,
          }
        : null,
    };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) return { kind: "restart" };
    return { kind: "error" };
  }
}

/**
 * Vitrine de preços do passo 6 (rota pública, sem auth). Best-effort como o selo do
 * promotor: falhou → null e os cards seguem com os valores-fallback do protótipo —
 * o preço que VALE é sempre o do backend na criação do checkout, então um display
 * defasado é recuperável; um passo 6 travado por causa de preço, não.
 * No mock não há rede: null aqui = "usa o PRICING do protótipo".
 */
export async function runPricing(): Promise<Pricing | null> {
  if (MOCK) return null;
  try {
    return await fetchPricing();
  } catch {
    return null;
  }
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
