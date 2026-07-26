"use client";

import { useEffect, useReducer, useState } from "react";

import type { IdentityOut } from "@/lib/api";
import { isValidCpf } from "@/lib/cpf";
import { maskBrPhone, onlyDigits } from "@/lib/phone";
import { clearSession, getSession, saveLogin, saveSession } from "@/lib/session";

import {
  AULA_MSGS,
  BOT_Q,
  CHECKOUT_MSGS,
  E_STAGES,
  EAD_URL,
  FUNNEL_ORDER,
  MOCK_IDENTITY,
  PRICING,
  SCREEN_ROUTES,
  V7M_URL,
  WHATSAPP_URL,
  ageFromIso,
  parseBotAnswer,
  type BotLevel,
  type BotQKey,
  type CamPhase,
  type EnrollStage,
  type ModalKind,
  type PhotoCtx,
  type Screen,
  type SentDoc,
} from "./flow-data";
import type { Pricing } from "@/lib/payment";

import {
  LEAD_MOCK,
  OTP_COOLDOWN_S,
  resolveReferralName,
  runCheckout,
  runCheckoutStatus,
  runEmail,
  runIdentity,
  runLeadMe,
  runOtpLogin,
  runPhoneCheck,
  runPricing,
  type CheckMode,
  type CheckOutcome,
  type LoginOutcome,
  type PainelCheckout,
} from "./lead-api";
import { isEmailFormatValid, isTempEmail, suggestEmail } from "./email-domains";
import { resolveEntryRef } from "./lead-ref";
import { setLeadSession } from "./lead-session";

export type CheckoutPhase = "run" | "ready" | "done" | "error";
export type PaymentMethod = "pix" | "card";

export interface InfoSheet {
  emoji: string;
  title: string;
  body: string;
  iconBg?: string;
  actionLabel?: string;
  actionBg?: string;
  action?: () => void;
}

export interface Conf {
  left: string;
  color: string;
  delay: string;
}

export interface FlowState {
  screen: Screen;
  dir: "right" | "left";
  /** `?ref=` cru da landing — external_id do promotor; vai no check e amarra a captação. */
  promoterRef: string;
  /** Nome resolvido do promotor (selo "Indicado por …"). Vazio = ref não vale, selo não aparece. */
  promoterName: string;
  switcherOpen: boolean;

  loggedIn: boolean;
  phone: string;
  /** external_id do usuário, devolvido pelo check — é o que o `/auth/login` espera. */
  externalId: string;
  /** Roles vigentes (do check): decidem o destino DEPOIS do OTP — funil, matrícula ou aluno. */
  roles: string[];
  /** Entrada por `/login?relogin=1` (volta de /matricula ou /provas): OTP automático. */
  relogin: boolean;
  name: string;
  stage: "lead" | "student";

  phoneInput: string;
  blockedNumbers: string[];
  cardError: boolean;
  modalKind: ModalKind | null;
  checking: boolean;

  cpf: string;
  cpfChecking: boolean;
  cpfPhase: "input" | "discovery" | "discoveryClose";
  discName: string;
  /** Foto do WhatsApp (`IdentityOut.photo`). null → o pergaminho desenha o monograma. */
  discPhoto: string | null;
  /** Idade calculada do `birth_date`. null quando o backend não sabe — a linha some. */
  discAge: number | null;

  email: string;
  /**
   * `input` → `processing` → `success` (check + copy) → `flying` (envelope) → planos.
   * `taken` = e-mail de outra conta: estado-escudo INLINE (§216), nunca modal.
   */
  emailPhase: "input" | "processing" | "success" | "flying" | "taken";
  /** Bolinha viva (§210): `idle` cinza · `checking` amarela · `valid` verde — sem clicar. */
  emailDot: "idle" | "checking" | "valid";
  /** Sugestão de domínio (§211): e-mail completo corrigido, ou null. */
  emailSuggest: string | null;
  /** Valor exato pro qual o usuário disse "Manter mesmo assim" — não re-sugerir. */
  emailKept: string;
  /** Domínio temporário (§212): aviso gentil, não bloqueia. */
  emailTemp: boolean;
  /** Copy do sucesso: false = "Excelente!" (novo) · true = "Perfeito, já é o seu e-mail". */
  emailAlreadyYours: boolean;
  /** Formato inválido no submit (§217): shake + hint inline — nunca a palavra "erro". */
  emailHint: boolean;
  emailError: boolean;
  emailShake: boolean;

  otp: string;
  otpSeconds: number;
  otpBusy: boolean;

  checkoutMethod: PaymentMethod;
  checkoutPhase: CheckoutPhase;
  checkoutMsg: number;
  checkoutUrl: string;
  planExpanded: PaymentMethod | null;
  /** Vitrine de preços (GET /pricing). Nasce com o fallback do protótipo; a API substitui. */
  pricing: Pricing;
  /** `true` quando `pricing` veio da API — enquanto não vier, cada troca de tela re-tenta. */
  pricingLive: boolean;
  /** `true` quando o GET /lead/me do painel respondeu — antes disso a tela não esconde nada. */
  painelLoaded: boolean;
  /** Checkout VIGENTE do retorno (forma, valor cobrado, URL viva). null = nunca escolheu. */
  painelCheckout: PainelCheckout | null;

  /* matrícula do aluno (pós-pagamento) */
  camPhase: CamPhase | null;
  photoCtx: PhotoCtx | null;
  flashShow: boolean;
  docStep: "front" | "back";
  enrollShake: boolean;
  eSendLabel: string;
  /** Motivo do modal "docerror" (upload reprovado: tipo, tamanho, CNH, ilegível…). */
  docError: { title: string; body: string } | null;
  /** Incrementa a cada reprovação pra remontar o <input type=file> (permite reescolher o mesmo arquivo). */
  docFileKey: number;

  /* robô da escolaridade */
  botQ: BotQKey | null;
  botPhase: "enter" | "typing" | "listen" | "think" | "celebrate";
  botTyped: number;
  botInput: string;
  botLevel: BotLevel | null;
  botDone: boolean | null;
  botModal: boolean;
  botConfetti: boolean;
  botConfs: Conf[];

  /* reenvio unitário de doc reprovado a partir da home */
  resubmitFrom: EnrollStage | null;

  /* app do aluno (home) */
  info: InfoSheet | null;
  studentPolo: string;
  sex: "F" | "M";
  platformReady: boolean;
}

function initialState(): FlowState {
  return {
    screen: "check",
    dir: "right",
    // O ref chega DEPOIS do mount (URL/cookie são só-cliente) via setEntryRef.
    promoterRef: "",
    promoterName: "",
    switcherOpen: false,
    loggedIn: false,
    phone: "",
    externalId: "",
    roles: [],
    relogin: false,
    name: MOCK_IDENTITY.name,
    stage: "lead",
    phoneInput: "",
    blockedNumbers: [],
    cardError: false,
    modalKind: null,
    checking: false,
    cpf: "",
    cpfChecking: false,
    cpfPhase: "input",
    discName: "",
    discPhoto: null,
    discAge: null,
    email: "",
    emailPhase: "input",
    emailDot: "idle",
    emailSuggest: null,
    emailKept: "",
    emailTemp: false,
    emailAlreadyYours: false,
    emailHint: false,
    emailError: false,
    emailShake: false,
    otp: "",
    otpSeconds: 0,
    otpBusy: false,
    checkoutMethod: "pix",
    checkoutPhase: "run",
    checkoutMsg: 0,
    checkoutUrl: "",
    planExpanded: null,
    pricing: PRICING,
    pricingLive: false,
    painelLoaded: false,
    painelCheckout: null,
    camPhase: null,
    photoCtx: null,
    flashShow: false,
    docStep: "front",
    enrollShake: false,
    eSendLabel: "Enviando…",
    docError: null,
    docFileKey: 0,
    botQ: null,
    botPhase: "enter",
    botTyped: 0,
    botInput: "",
    botLevel: null,
    botDone: null,
    botModal: false,
    botConfetti: false,
    botConfs: [],
    resubmitFrom: null,
    info: null,
    studentPolo: "Polo Recife · Boa Viagem",
    sex: MOCK_IDENTITY.sex,
    platformReady: false,
  };
}

// Patch SEMPRE objeto puro: o reducer precisa ser idempotente (o React re-invoca reducers no
// dev/StrictMode). Funções de atualização são aplicadas NOS CLOSURES via o espelho `state()` —
// aplicar função aqui dentro fazia toggles/contadores dobrarem de vez em quando no dev.
type Patch = Partial<FlowState>;

function reduce(prev: FlowState, patch: Patch): FlowState {
  return { ...prev, ...patch };
}

/** Todos os timers do funil — limpos no unmount. */
interface Timers {
  otp?: ReturnType<typeof setInterval>;
  v7m?: ReturnType<typeof setTimeout>;
  coMsg?: ReturnType<typeof setInterval>;
  co?: ReturnType<typeof setTimeout>;
  co2?: ReturnType<typeof setTimeout>;
  /** Poll da URL do gateway (GET /lead/me) quando a criação volta sem ela. */
  coPoll?: ReturnType<typeof setInterval>;
  dec?: ReturnType<typeof setTimeout>;
  decI?: ReturnType<typeof setInterval>;
  close?: ReturnType<typeof setTimeout>;
  emailNext?: ReturnType<typeof setTimeout>;
  em?: ReturnType<typeof setTimeout>;
  em2?: ReturnType<typeof setTimeout>;
  /** Debounce da bolinha viva: amarela enquanto digita → verde/param quando assenta. */
  emDot?: ReturnType<typeof setTimeout>;
  send?: ReturnType<typeof setTimeout>;
  redir?: ReturnType<typeof setTimeout>;
  bot?: ReturnType<typeof setTimeout>;
  tw?: ReturnType<typeof setInterval>;
  mic?: ReturnType<typeof setInterval>;
  bye?: ReturnType<typeof setTimeout>;
  auto?: ReturnType<typeof setTimeout>;
  flash?: ReturnType<typeof setTimeout>;
  shake?: ReturnType<typeof setTimeout>;
}

export interface FlowActions {
  nav: (screen: Screen, dir?: "right" | "left") => void;
  /** URL mudou por fora (voltar do navegador, link direto): alinha a máquina sem re-push. */
  syncFromRoute: (screen: Screen) => void;
  /** Recarga no meio do funil: repõe phone/externalId guardados pela tela 1. */
  boot: (session: { phone: string; externalId: string }) => void;
  /** Ref resolvido na entrada (URL → cookie) — só grava se ainda não há um. */
  setEntryRef: (ref: string) => void;
  toggleSwitcher: () => void;
  showModalDemo: (kind: ModalKind) => void;

  onPhoneInput: (raw: string) => void;
  onCheckSubmit: (e: React.FormEvent) => void;
  closeModal: () => void;
  /** Fecha o modal transitório (servidor/lento/offline/não-verificado) E re-executa a verificação. */
  retryTransient: () => void;
  /** CTA do modal de suporte: abre o WhatsApp e fecha. */
  supportWhats: () => void;

  setOtp: (code: string) => void;
  onResend: () => void;
  /** Volta de `/matricula` ou `/provas` com o JWT morto: dispara o OTP sozinho, sem gate de role. */
  startRelogin: (phone: string) => void;
  /** Sessão morta (external_id que não existe mais): apaga tudo e recomeça do passo 1. */
  restartFunnel: () => void;

  setCpf: (digits: string) => void;
  openSupport: () => void;
  goV7m: () => void;
  onExistsUseNumber: () => void;
  onSuccessContinue: () => void;
  continueEmail: () => void;

  onEmailInput: (value: string) => void;
  submitEmail: () => void;
  /** "Usar" da sugestão de domínio: aplica o e-mail corrigido e apaga a sugestão. */
  emailUseSuggestion: () => void;
  /** "Manter mesmo assim": descarta a sugestão e não re-oferece pro mesmo valor. */
  emailKeepTyped: () => void;
  /** "Trocar e-mail" do estado-escudo: volta ao input com o campo limpo. */
  emailSwap: () => void;

  expandPlan: (m: PaymentMethod) => void;
  collapsePlan: () => void;
  confirmPlan: () => void;
  planosBack: () => void;
  goPlanos: () => void;

  retryCheckout: () => void;
  checkoutReopen: () => void;
  /** Fallback do `done`: reabre a URL do gateway se o redirect automático não levou. */
  openCheckoutUrl: () => void;
  enterEnrollment: () => void;
  resumeCheckout: () => void;
  logout: () => void;

  startDocCam: () => void;
  takePhoto: () => void;
  retakePhoto: () => void;
  sendPhoto: () => void;
  chooseAddrFoto: () => void;
  /** Upload real (RG frente/verso e comprovante): valida tipo/tamanho e roda a "IA" mockada. */
  onDocFilePicked: (f: { name: string; size: number; type: string }) => void;
  startSelfieCam: () => void;
  goBackE: () => void;

  onBotInput: (value: string) => void;
  onBotKey: (e: React.KeyboardEvent) => void;
  botMic: () => void;
  botSend: () => void;
  answerDone: (v: boolean) => void;
  botFixLevel: () => void;
  botFixDone: () => void;
  botCloseModal: () => void;
  botConfirmAll: () => void;

  enterHome: () => void;
  onAula: () => void;
  onDocTap: (d: SentDoc) => void;
  onPending: () => void;
  onProva: () => void;
  onDiploma: () => void;
  onSuporte: () => void;
  closeInfo: () => void;
}

function openExternal(url: string) {
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
}

type SetFlow = (patch: Patch) => void;

interface FlowController extends FlowActions {
  /** Espelha o estado pós-commit (chamado num efeito a cada render). */
  sync: (s: FlowState) => void;
  /** Limpa todos os timers pendentes (chamado no unmount do funil). */
  dispose: () => void;
}

/**
 * Constrói a máquina de estados do funil — porte 1:1 da classe DCLogic do
 * protótipo. `state()` faz o papel do `this.state` (leituras dentro de timers
 * enxergam o estado corrente); `set` aceita patch parcial ou updater, como o
 * setState de lá. Vive fora do hook: os closures só rodam em eventos/timers.
 *
 * Rotas (2026-07-25): telas com rota empurram a URL via `push` (router.push do
 * provider); a URL é a fonte de verdade de ONDE o usuário está, a máquina segue
 * dona de TODO o resto (inputs, fases, modais, timers). Telas sem rota (matrícula
 * e home, próxima leva) continuam só-estado.
 */
function createController(initial: FlowState, set: SetFlow, push: (route: string) => void): FlowController {
  const t: Timers = {};
  // `this.state` da classe original: espelho do último estado commitado,
  // atualizado via sync(); os closures só leem em eventos/timers.
  let committed = initial;
  const state = () => committed;

  const dispose = () => {
    for (const key of Object.keys(t) as Array<keyof Timers>) {
      const id = t[key];
      if (id !== undefined) {
        clearTimeout(id as ReturnType<typeof setTimeout>);
        clearInterval(id as ReturnType<typeof setInterval>);
      }
    }
  };

  const clearCheckout = () => {
      if (t.coMsg) clearInterval(t.coMsg);
      if (t.co) clearTimeout(t.co);
      if (t.co2) clearTimeout(t.co2);
      if (t.coPoll) clearInterval(t.coPoll);
    };

    // Timers presos à tela anterior morrem na troca (auditoria: descoberta do CPF
    // empurrava pro e-mail ~7s depois de sair; checkout seguia mudando de fase fora
    // da tela; redirect do e_done disparava de onde não devia). Câmera idem.
    const leaveScreen = (next: Screen) => {
      if (t.dec) clearTimeout(t.dec);
      if (t.decI) clearInterval(t.decI);
      if (t.close) clearTimeout(t.close);
      if (t.emailNext) clearTimeout(t.emailNext);
      if (t.redir) clearTimeout(t.redir);
      if (next !== "checkout") clearCheckout();
    };

    // Retrato do retorno (GET /lead/me): nome real, forma/valor VIGENTES e a URL viva.
    // Best-effort — falhou, o painel degrada pro estado local em vez de travar.
    const fetchPainel = () => {
      void runLeadMe().then((out) => {
        if (state().screen !== "painel") return;
        if (out.kind === "restart") {
          set({ modalKind: "sessionexpired" });
          return;
        }
        if (out.kind !== "ok") return;
        if (out.paid) {
          // Pagou: o lugar da pessoa é a matrícula — painel é tela de quem AINDA deve.
          push("/matricula");
          return;
        }
        const patch: Patch = { painelLoaded: true, painelCheckout: out.checkout };
        if (out.name) patch.name = out.name;
        // Forma vigente alinha as outras telas (planos pré-seleciona, checkout roda com ela).
        if (out.checkout) patch.checkoutMethod = out.checkout.method;
        set(patch);
      });
    };

    const enterScreen = (screen: Screen) => {
      if (screen === "e_edu") startBot();
      if (screen === "e_done") {
        t.redir = setTimeout(() => enterHome(), 2600);
      }
      if (screen === "painel") fetchPainel();
      // Entrada FRIA no /checkout (reload, voltar do gateway): sem criação em voo e sem
      // URL, a timeline ficaria parada pra sempre — recria a sessão (contrato: criável e
      // TROCÁVEL). Retomar a URL viva sem recriar é papel do painel, a tela de retorno.
      if (
        screen === "checkout" &&
        !coInflight &&
        !state().checkoutUrl &&
        state().checkoutPhase === "run"
      ) {
        startCheckout(state().checkoutMethod);
      }
      document.querySelector(".app-scroll")?.scrollTo({ top: 0 });
    };

    const goTo = (screen: Screen, dir: "right" | "left" = "right") => {
      const prev = state().screen;
      leaveScreen(screen);
      set({ screen, dir, switcherOpen: false, camPhase: null, photoCtx: null, flashShow: false });
      // Tela roteada muda a URL junto (retry na MESMA tela não empilha histórico).
      const route = SCREEN_ROUTES[screen];
      if (route && prev !== screen) push(route);
      enterScreen(screen);
    };

    /**
     * URL mudou por fora (voltar/avançar do navegador, link direto): mesma
     * limpeza do goTo, sem re-push. Direção da transição sai da ordem canônica
     * (índice menor = voltando, desliza da esquerda).
     */
    const syncFromRoute = (screen: Screen) => {
      if (state().screen === screen) return; // eco do nosso próprio push
      const from = FUNNEL_ORDER.indexOf(state().screen);
      const to = FUNNEL_ORDER.indexOf(screen);
      const dir = from >= 0 && to >= 0 && to < from ? "left" : "right";
      leaveScreen(screen);
      set({ screen, dir, switcherOpen: false, camPhase: null, photoCtx: null, flashShow: false });
      enterScreen(screen);
    };

    const nav = (screen: Screen, dir: "right" | "left" = "right") => {
      // Entrada "de fora" (navegador do protótipo) numa tela que depende de setup:
      // semeia o checkout. Só aqui, nunca no goTo — startCheckout navega por dentro
      // e o espelho `committed` não enxerga o set() do mesmo lote síncrono; semear
      // no caminho cru viraria recursão startCheckout → nav → startCheckout.
      if (screen === "checkout" && !state().checkoutUrl) {
        startCheckout(state().checkoutMethod);
        return;
      }
      goTo(screen, dir);
    };

    /* ---- OTP ---- */
    const tickOtp = () => {
      if (t.otp) clearInterval(t.otp);
      t.otp = setInterval(() => {
        const remaining = state().otpSeconds;
        if (remaining <= 1) {
          if (t.otp) clearInterval(t.otp);
          set({ otpSeconds: 0 });
        } else {
          set({ otpSeconds: remaining - 1 });
        }
      }, 1000);
    };

    /**
     * Reenvio do OTP = chamar o check de novo (não há endpoint próprio: quem manda código é
     * ele). `phone` vem por parâmetro porque o re-login dispara isto no MOUNT, antes de o
     * espelho `committed` enxergar o telefone reposto da sessão.
     *
     * `announce` liga o modal 🚀 — e só quando o backend confirma que um código NOVO saiu.
     * Se voltou rate-limitado (`sent:false`), a única coisa honesta a fazer é recolocar o
     * cooldown no botão: dizer "mandei um novinho" ali seria mentira.
     *
     * `mode` também é explícito pelo mesmo motivo do `phone`: o re-login liga a flag e chama
     * isto no MESMO lote, antes de o espelho enxergar — ler `state().relogin` ali daria
     * "funnel" e o gate de role expulsaria o aluno do próprio app.
     */
    const resend = (
      phone: string,
      announce: boolean,
      mode: CheckMode = state().relogin ? "relogin" : "funnel",
    ) => {
      if (!phone) {
        set({ modalKind: "sessionexpired" });
        return;
      }
      // Trava a pílula ANTES da resposta: sem isso o botão fica clicável durante a chamada.
      set({ otpSeconds: OTP_COOLDOWN_S });
      tickOtp();
      void runPhoneCheck(phone, state().promoterRef, mode).then((out) => {
        if (out.kind !== "otp") {
          set({ otpSeconds: 0, modalKind: out.modal });
          return;
        }
        saveSession({ phone, externalId: out.externalId, ref: state().promoterRef || null });
        set({ externalId: out.externalId, roles: out.roles, otpSeconds: out.otpWait });
        tickOtp();
        if (announce && out.sent) set({ modalKind: "resent" });
      });
    };

    /**
     * Destino DEPOIS do OTP. Uma role → entra direto no ambiente dela (DOCUMENTACAO §17-18);
     * o seletor de ambiente pra quem tem 2+ é da próxima leva, então aqui vale a mais
     * avançada. Isto substitui o antigo `/painel` (hub que roteava por `whoami`): a decisão
     * já cabe aqui e economiza um salto.
     */
    const goAfterLogin = () => {
      const roles = state().roles;
      if (roles.includes("student") || roles.includes("veteran")) {
        push("/aluno"); // o /aluno se auto-corrige pra /provas conforme o status
        return;
      }
      if (roles.includes("enrollment")) {
        push("/matricula");
        return;
      }
      // Lead: segue o funil no passo 3, com a tela do CPF limpa.
      set({
        cpf: "",
        cpfChecking: false,
        cpfPhase: "input",
        discName: "",
        discPhoto: null,
        discAge: null,
      });
      nav("cpf");
    };

    const applyLogin = (out: LoginOutcome) => {
      set({ otpBusy: false });
      if (out.kind === "ok") {
        saveLogin({ ...out.tokens }); // espalhado como em api.ts: saveLogin pede Record
        goAfterLogin();
        return;
      }
      if (out.kind === "wrong") {
        set({ modalKind: "otp", otp: "" }); // 👀 o código ainda vale: é só digitar de novo
        return;
      }
      if (out.kind === "expired") {
        // ⏳ o protótipo não deixa a pessoa no vácuo: o código novo sai JUNTO com o aviso
        // (a copy do modal já promete isso), sem o 🚀 por cima.
        set({ modalKind: "expired", otp: "" });
        resend(state().phone, false);
        return;
      }
      if (out.kind === "restart") {
        set({ modalKind: "sessionexpired", otp: "" });
        return;
      }
      set({ modalKind: out.modal, otp: "" });
    };

    const submitOtp = (code: string) => {
      if (code.length < 6) return;
      const id = state().externalId;
      if (!id) {
        // Sem external_id não há o que verificar (sessão perdida entre passos).
        set({ modalKind: "sessionexpired", otp: "" });
        return;
      }
      set({ otpBusy: true });
      void runOtpLogin(id, code).then(applyLogin);
    };

    /* ---- check (telefone) ---- */
    /** Aplica o desfecho do `POST /auth/check` (ver lead-api.ts) na tela. */
    const applyCheck = (digits: string, out: CheckOutcome) => {
      // Resposta atrasada de um número que o usuário já trocou: descarta em silêncio.
      if (state().phone !== digits) return;
      if (out.kind === "otp") {
        // A conta existe (achada ou criada no próprio check) e o código já saiu.
        saveSession({ phone: digits, externalId: out.externalId, ref: state().promoterRef || null });
        set({
          checking: false,
          externalId: out.externalId,
          roles: out.roles,
          relogin: false,
          otp: "",
          otpSeconds: out.otpWait,
        });
        tickOtp();
        nav("login");
        return;
      }
      const patch: Patch = { checking: false, modalKind: out.modal };
      // Card vermelho + tremida só onde o protótipo trata como "o número não serve".
      if (out.modal === "invalid" || out.modal === "staff") patch.cardError = true;
      if (out.block) patch.blockedNumbers = state().blockedNumbers.concat(digits);
      set(patch);
      if (out.modal === "client") {
        // Já passou do lead: aqui não tem área logada (DOCUMENTACAO §19) → app.v7m.org.
        t.v7m = setTimeout(() => {
          if (state().modalKind === "client") goV7m();
        }, 2200);
      }
    };

    const runCheck = () => {
      if (state().checking) return;
      const d = onlyDigits(state().phoneInput);
      if (d.length !== 10 && d.length !== 11) {
        set({ cardError: true, modalKind: "invalid" });
        return;
      }
      // número já marcado como inválido — nem repete a chamada
      if (state().blockedNumbers.includes(d)) {
        set({ cardError: true, modalKind: "invalid" });
        return;
      }
      set({ phone: d, checking: true, cardError: false });
      // `runPhoneCheck` nunca rejeita: erro de rede/servidor também volta como modal.
      void runPhoneCheck(d, state().promoterRef).then((out) => applyCheck(d, out));
    };

    /* ---- CPF ---- */
    // Redesenho 2026-07-25: SEM decodificação letra a letra (lia como sistema com
    // defeito e atrasava justo o instante do reconhecimento) — o nome entra inteiro
    // com subida suave (CSS .pnameIn). Hold ~3s a partir da folha aberta (era ~7s
    // sem saída); "toque para continuar" (continueEmail) pula na hora.
    const startDiscovery = (identity: IdentityOut) => {
      if (t.dec) clearTimeout(t.dec);
      if (t.decI) clearInterval(t.decI);
      if (t.close) clearTimeout(t.close);
      if (t.emailNext) clearTimeout(t.emailNext);
      set({
        cpfPhase: "discovery",
        discName: identity.name ?? "",
        discPhoto: identity.photo,
        discAge: ageFromIso(identity.birth_date),
      });
      t.close = setTimeout(() => set({ cpfPhase: "discoveryClose" }), 4600);
      t.emailNext = setTimeout(() => continueEmail(), 5450);
    };

    const runCpf = (d: string) => {
      if (!isValidCpf(d)) {
        set({ modalKind: "cpfinvalid", cardError: true });
        return;
      }
      set({ cpfChecking: true });
      // `runIdentity` nunca rejeita: rede, 4xx e 5xx já voltam como saída desenhável.
      void runIdentity(d).then((out) => {
        set({ cpfChecking: false });
        if (out.kind === "ok") {
          startDiscovery(out.identity);
          return;
        }
        if (out.kind === "conflict") {
          // O backend já apagou a conta desta tentativa e avisou o titular — a sessão
          // guardada aqui aponta pra um usuário que não existe mais. Ela morre AGORA,
          // não no botão do sheet: se o usuário fechar pelo Esc ou pelo fundo, não pode
          // sobrar um JWT órfão capaz de arrastar o funil pra um 401 sem explicação.
          clearSession();
          set({ loggedIn: false, externalId: "", modalKind: "exists", cpf: "" });
          return;
        }
        if (out.kind === "restart") {
          set({ modalKind: "sessionexpired", cpf: "" });
          return;
        }
        // `cpfinvalid` volta com o campo cheio de propósito: o sheet diz "Revisar CPF",
        // e revisar é ver o que se digitou. Quem limpa é o fechamento do sheet.
        set({ modalKind: out.modal, cardError: out.modal === "cpfinvalid" });
      });
    };

    const continueEmail = () => {
      if (t.decI) clearInterval(t.decI);
      if (t.close) clearTimeout(t.close);
      if (t.emailNext) clearTimeout(t.emailNext);
      set({
        cpfPhase: "input",
        email: "",
        emailPhase: "input",
        emailDot: "idle",
        emailSuggest: null,
        emailKept: "",
        emailTemp: false,
        emailHint: false,
        emailShake: false,
        emailError: false,
      });
      nav("email");
    };

    const goV7m = () => {
      openExternal(V7M_URL);
      set({ modalKind: null });
    };

    /* ---- e-mail ---- */
    // Formato inválido no submit (§217): NUNCA modal, nunca a palavra "erro" —
    // shake leve + hint inline, e o campo fica como está pra pessoa revisar.
    const emailGentleNudge = () => {
      set({ emailPhase: "input", emailError: true, emailHint: true, emailShake: true });
      if (t.shake) clearTimeout(t.shake);
      t.shake = setTimeout(() => set({ emailShake: false }), 520);
    };

    // Contrato canônico (§46-64): passo 5 (e-mail) → passo 6 (planos/checkout).
    // O `nav('painel')` do protótipo era atalho de demo — painel é tela de RETORNO.
    const finishEmail = () => {
      set({ loggedIn: true, stage: "lead", emailPhase: "input", email: "", emailDot: "idle" });
      nav("planos");
    };

    const submitEmail = () => {
      const cur = state();
      if (cur.emailPhase !== "input") return;
      const v = cur.email.trim();
      if (!isEmailFormatValid(v)) {
        emailGentleNudge();
        return;
      }
      if (t.emDot) clearTimeout(t.emDot);
      set({ emailPhase: "processing", emailError: false, emailHint: false, emailSuggest: null });
      // `runEmail` nunca rejeita: rede, 4xx e 5xx já voltam como saída desenhável.
      void runEmail(v).then((out) => {
        if (state().screen !== "email") return; // navegou embora enquanto verificava
        if (out.kind === "ok") {
          // Novo × já era o seu mudam SÓ a copy (§214-215) — o caminho é o mesmo:
          // check desenhando → envelope voa → planos, tudo sozinho, sem botão.
          set({ emailPhase: "success", emailAlreadyYours: out.alreadyYours });
          if (t.em) clearTimeout(t.em);
          t.em = setTimeout(() => {
            set({ emailPhase: "flying" });
            if (t.em2) clearTimeout(t.em2);
            t.em2 = setTimeout(() => finishEmail(), 1900);
          }, 1500);
          return;
        }
        if (out.kind === "taken") {
          set({ emailPhase: "taken" });
          return;
        }
        if (out.kind === "invalid") {
          emailGentleNudge();
          return;
        }
        if (out.kind === "restart") {
          set({ emailPhase: "input", modalKind: "sessionexpired", email: "", emailDot: "idle" });
          return;
        }
        set({ emailPhase: "input", modalKind: out.modal });
      });
    };

    /* ---- planos / checkout ---- */

    // Timeline → "Tudo pronto!" (a barra corre 1,7s) → dissolve → REDIRECT pro gateway.
    // No mock não há gateway: a tela fica no `done` (o protótipo fazia igual).
    const finishCheckout = (url: string) => {
      clearCheckout();
      set({ checkoutUrl: url, checkoutPhase: "ready" });
      t.co2 = setTimeout(() => {
        set({ checkoutPhase: "done" });
        if (!LEAD_MOCK) {
          // 750ms = o dissolve (~0,6s) termina antes de a página trocar (spec §228).
          // `t.redir` morre no leaveScreen — navegar pra fora cancela o redirect.
          t.redir = setTimeout(() => window.location.assign(url), 750);
        }
      }, 1700);
    };

    // URL nasceu async (criação voltou sem ela): acompanha por GET /lead/me até vir,
    // com deadline — o gateway às vezes demora, mas ninguém fica preso pra sempre.
    const pollCheckoutUrl = (startedAt: number) => {
      if (t.coPoll) clearInterval(t.coPoll);
      t.coPoll = setInterval(() => {
        void runCheckoutStatus().then((out) => {
          if (state().screen !== "checkout" || state().checkoutPhase !== "run") return;
          if (out.kind === "url") {
            finishCheckout(out.url);
            return;
          }
          if (out.kind === "paid") {
            clearCheckout();
            set({ loggedIn: true, stage: "lead" });
            nav("painel");
            return;
          }
          if (out.kind === "restart") {
            clearCheckout();
            set({ checkoutPhase: "error", modalKind: "sessionexpired" });
            return;
          }
          // `pending`/`transient` seguem no loop; o deadline decide quando desistir.
          if (Date.now() - startedAt > 45_000) {
            clearCheckout();
            set({ checkoutPhase: "error" });
          }
        });
      }, 1500);
    };

    /** Trava reentrância: o enterScreen do checkout semeia a criação só quando NÃO há uma em voo. */
    let coInflight = false;

    const startCheckout = (method: PaymentMethod) => {
      clearCheckout();
      coInflight = true;
      set({ checkoutMethod: method, checkoutPhase: "run", checkoutMsg: 0, checkoutUrl: "" });
      goTo("checkout");
      t.coMsg = setInterval(
        () =>
          set({ checkoutMsg: Math.min(state().checkoutMsg + 1, CHECKOUT_MSGS.length - 1) }),
        850,
      );
      // `runCheckout` nunca rejeita — e a timeline INTERROMPE assim que a resposta chega
      // (contrato das animações do funil; a espera é teatro, a API é quem manda).
      void runCheckout(method).then((out) => {
        coInflight = false;
        if (state().screen !== "checkout") return;
        if (out.kind === "ok") {
          if (out.url) finishCheckout(out.url);
          else pollCheckoutUrl(Date.now());
          return;
        }
        clearCheckout();
        if (out.kind === "paid") {
          // Já pagou: outro checkout seria cobrar duas vezes — o painel é o lugar dele.
          set({ loggedIn: true, stage: "lead" });
          nav("painel");
          return;
        }
        if (out.kind === "incomplete") {
          // Pulou etapa (URL na mão): volta pro primeiro passo que falta.
          nav(out.missing.includes("cpf") ? "cpf" : "email", "left");
          return;
        }
        if (out.kind === "restart") {
          set({ checkoutPhase: "error", modalKind: "sessionexpired" });
          return;
        }
        set({ checkoutPhase: "error" });
      });
    };

    /* ---- matrícula do aluno (pós-pagamento) ---- */
    const advanceE = (fromKey: EnrollStage) => {
      // Reenvio unitário vindo da home (doc reprovado): concluiu a etapa → volta direto
      // pra home, sem re-percorrer o resto do funil (auditoria, achado 6).
      if (state().resubmitFrom === fromKey) {
        set({ resubmitFrom: null });
        enterHome();
        return;
      }
      const next = E_STAGES.indexOf(fromKey) + 1;
      if (next >= E_STAGES.length) {
        nav("e_done"); // o próprio nav agenda o enterHome (2,6s)
      } else {
        nav(E_STAGES[next]);
      }
    };

    const sendPhoto = () => {
      const ctx = state().photoCtx;
      const lbl =
        ctx === "rgfront"
          ? "Enviando a frente…"
          : ctx === "rgback"
            ? "Enviando o verso…"
            : ctx === "proof"
              ? "Validando o comprovante…"
              : "Analisando sua selfie… leva de 10 a 60 segundos.";
      set({ camPhase: "sending", eSendLabel: lbl });
      if (t.send) clearTimeout(t.send);
      t.send = setTimeout(
        () => {
          if (ctx === "rgfront") {
            set({ docStep: "back", photoCtx: null, camPhase: null });
            return;
          }
          if (ctx === "rgback") {
            set({ photoCtx: null, camPhase: null, docStep: "front" });
            advanceE("e_doc");
            return;
          }
          if (ctx === "proof") {
            set({ photoCtx: null, camPhase: null });
            advanceE("e_addr");
            return;
          }
          set({ photoCtx: null, camPhase: null });
          advanceE("e_selfie");
        },
        ctx === "selfie" ? 2400 : 1400,
      );
    };

    /* ---- upload de arquivo (RG frente/verso + comprovante) ---- */
    // Gatilhos determinísticos pelo NOME do arquivo (mock da IA de leitura):
    // contém "cnh" = documento errado · "ilegivel"/"borrad"/"escur" = leitura reprovada.
    const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const DOC_MAX_BYTES = 10 * 1024 * 1024;

    // Padrão "modal explica → componente reseta": limpa a fase, abre o docerror
    // e remonta o <input type=file> (docFileKey) pra aceitar até o MESMO arquivo de novo.
    const docReject = (title: string, body: string) => {
      set({
        camPhase: null,
        photoCtx: null,
        modalKind: "docerror",
        docError: { title, body },
        docFileKey: state().docFileKey + 1,
      });
    };

    const onDocFilePicked = (f: { name: string; size: number; type: string }) => {
      const ctx: PhotoCtx =
        state().screen === "e_addr" ? "proof" : state().docStep === "front" ? "rgfront" : "rgback";
      if (!DOC_TYPES.includes(f.type)) {
        docReject(
          "Esse tipo de arquivo não rola 📎",
          `"${f.name}" não é imagem nem PDF. Manda JPG, PNG, WebP ou PDF que a leitura vai de primeira.`,
        );
        return;
      }
      if (f.size > DOC_MAX_BYTES) {
        docReject(
          "Arquivo pesado demais ⚖️",
          "O limite é 10 MB. Tira um print da tela ou exporta numa qualidade menor e manda de novo.",
        );
        return;
      }
      set({
        photoCtx: ctx,
        camPhase: "sending",
        eSendLabel:
          ctx === "proof"
            ? "Validando o comprovante…"
            : ctx === "rgfront"
              ? "Lendo a frente do seu RG…"
              : "Lendo o verso do seu RG…",
      });
      if (t.send) clearTimeout(t.send);
      t.send = setTimeout(() => {
        const nome = f.name.toLowerCase();
        if (ctx !== "proof" && nome.includes("cnh")) {
          docReject(
            "Isso parece uma CNH 🚗",
            "Pra matrícula precisa ser o RG (carteira de identidade) — CNH não vale aqui. Manda a foto ou o arquivo do seu RG.",
          );
          return;
        }
        if (nome.includes("ilegivel") || nome.includes("borrad") || nome.includes("escur")) {
          docReject(
            "Não consegui ler direito 🔍",
            "A imagem veio escura, tremida ou cortada. Manda outra mais nítida, sem reflexo e com o documento inteiro na tela.",
          );
          return;
        }
        if (ctx === "rgfront") {
          set({ docStep: "back", photoCtx: null, camPhase: null });
          return;
        }
        if (ctx === "rgback") {
          set({ photoCtx: null, camPhase: null, docStep: "front" });
          advanceE("e_doc");
          return;
        }
        set({ photoCtx: null, camPhase: null });
        advanceE("e_addr");
      }, 1800);
    };

    /* ---- robô da escolaridade ---- */
    const botText = (q: BotQKey) => BOT_Q[q].text;

    const askBot = (q: BotQKey) => {
      if (t.tw) clearInterval(t.tw);
      set({ botQ: q, botPhase: "typing", botTyped: 0, botInput: "", botModal: false });
      const len = botText(q).length;
      t.tw = setInterval(() => {
        if (state().botTyped >= len) {
          if (t.tw) clearInterval(t.tw);
          set({ botPhase: BOT_Q[q].kind === "none" ? "celebrate" : "listen" });
        } else {
          set({ botTyped: state().botTyped + 1 });
        }
      }, 30);
    };

    const startBot = () => {
      if (t.tw) clearInterval(t.tw);
      if (t.bot) clearTimeout(t.bot);
      if (t.mic) clearInterval(t.mic);
      if (t.bye) clearTimeout(t.bye);
      set({
        botQ: null,
        botPhase: "enter",
        botTyped: 0,
        botInput: "",
        botLevel: null,
        botDone: null,
        botModal: false,
        botConfetti: false,
        botConfs: [],
      });
      t.bot = setTimeout(() => askBot("q1"), 550);
    };

    const think = (then: () => void) => {
      set({ botPhase: "think" });
      if (t.bot) clearTimeout(t.bot);
      t.bot = setTimeout(then, 1100);
    };

    const celebrate = (patch: Partial<FlowState>, next: () => void) => {
      set({ ...patch, botPhase: "celebrate" });
      if (t.bot) clearTimeout(t.bot);
      t.bot = setTimeout(next, 650);
    };

    const nextBotStep = () => {
      if (state().botDone === null) {
        askBot("done");
        return;
      }
      set({ botModal: true, botPhase: "listen" });
    };

    const botSend = () => {
      const cur = state();
      const text = cur.botInput.trim();
      if (!text || cur.botPhase !== "listen") return;
      think(() => {
        const { level, done } = parseBotAnswer(text);
        if (!level) {
          askBot("oops");
          return;
        }
        // Trava do aluno: superior/pós ou médio concluído não precisam de supletivo
        if (level === "Superior" || level === "Pós ou além" || (level === "Médio" && done === true)) {
          askBot("blocked");
          return;
        }
        celebrate({ botLevel: level, botDone: done === null ? state().botDone : done }, nextBotStep);
      });
    };

    const botConfirmAll = () => {
      const colors = ["#009c3b", "#ffdf00", "#1e6fe0", "#38d178"];
      const confs = Array.from({ length: 14 }, (_, i) => ({
        left: `${Math.round(4 + Math.random() * 92)}%`,
        color: colors[i % 4],
        delay: `${(Math.random() * 0.5).toFixed(2)}s`,
      }));
      set({ botModal: false, botConfetti: true, botConfs: confs });
      askBot("bye");
      if (t.bye) clearTimeout(t.bye);
      t.bye = setTimeout(() => {
        set({ botConfetti: false });
        advanceE("e_edu");
      }, 1400);
    };

    /* ---- app do aluno (home) ---- */
    const enterHome = () => {
      if (t.redir) clearTimeout(t.redir);
      set({ loggedIn: true, stage: "student", info: null });
      nav("home");
    };

    const closeInfo = () => set({ info: null });

    const openWhats = () => {
      openExternal(WHATSAPP_URL);
      set({ info: null });
    };

    return {
      sync: (s) => {
        committed = s;
      },
      dispose,
      nav,
      syncFromRoute,
      boot: ({ phone, externalId }) => {
        // Só repõe o que a recarga apagou — nunca sobrescreve digitação em curso.
        if (!state().phone && phone) set({ phone, externalId });
      },
      setEntryRef: (ref) => {
        if (ref && !state().promoterRef) set({ promoterRef: ref });
      },
      toggleSwitcher: () => set({ switcherOpen: !state().switcherOpen }),
      showModalDemo: (kind) => set({ modalKind: kind, switcherOpen: false }),

      onPhoneInput: (raw) => {
        const masked = maskBrPhone(raw);
        const d = onlyDigits(masked);
        set({ phoneInput: masked, cardError: false });
        // App anda sozinho: celular BR completo (11 dígitos) dispara o check, sem botão.
        if (d.length === 11 && !state().checking && !state().modalKind) {
          if (t.auto) clearTimeout(t.auto);
          t.auto = setTimeout(() => runCheck(), 240);
        } else if (d.length === 10 && !state().checking && !state().modalKind) {
          // Fixo (10 dígitos) também anda sozinho — espera maior: pode estar vindo o 11º.
          if (t.auto) clearTimeout(t.auto);
          t.auto = setTimeout(() => runCheck(), 900);
        }
      },
      onCheckSubmit: (e) => {
        e.preventDefault();
        runCheck();
      },
      closeModal: () => {
        const k = state().modalKind;
        const patch: Partial<FlowState> = { modalKind: null };
        if (k === "cpfinvalid") {
          patch.cpf = "";
          patch.cardError = false;
        }
        if (k === "otp" || k === "expired") patch.otp = "";
        if (k === "invalid") {
          patch.phoneInput = "";
          patch.cardError = false;
        }
        if (k === "staff") patch.cardError = false;
        if (k === "docerror") patch.docError = null;
        set(patch);
      },

      setOtp: (code) => {
        set({ otp: code });
        // Auto-login no 6º dígito (sem botão "Entrar")
        if (code.length === 6 && !state().otpBusy) {
          if (t.auto) clearTimeout(t.auto);
          t.auto = setTimeout(() => submitOtp(code), 180);
        }
      },
      onResend: () => {
        if (state().otpSeconds > 0 || state().otpBusy) return;
        set({ otp: "" });
        resend(state().phone, true);
      },
      startRelogin: (phone) => {
        // O código sai SOZINHO: quem chega aqui não pediu login, foi devolvido pra cá
        // (JWT morto ou matrícula concluída). Pedir "clique em reenviar" seria burocracia.
        set({ relogin: true, phone, otp: "", otpBusy: false });
        resend(phone, false, "relogin");
      },
      restartFunnel: () => {
        // Sessão morta: o aparelho guarda um external_id que não existe mais. Limpa tudo
        // (inclusive o JWT) e recomeça do passo 1 — insistir no código não tem saída.
        clearSession();
        set({
          modalKind: null,
          loggedIn: false,
          phone: "",
          phoneInput: "",
          externalId: "",
          roles: [],
          relogin: false,
          otp: "",
          otpSeconds: 0,
        });
        nav("check", "left");
      },

      setCpf: (digits) => {
        set({ cpf: digits, cardError: false });
        // Confirma sozinho assim que o 11º dígito entra
        if (digits.length === 11 && !state().cpfChecking) {
          if (t.auto) clearTimeout(t.auto);
          t.auto = setTimeout(() => runCpf(digits), 180);
        }
      },
      // Padrão "modal explica → componente pronto": fechar erro transitório RE-EXECUTA a
      // verificação com o valor já digitado (telefone no check, CPF no cpf) em vez de
      // deixar o campo cheio sem re-disparo (auditoria, achados 1-2).
      retryTransient: () => {
        set({ modalKind: null });
        const cur = state();
        if (cur.screen === "check" && onlyDigits(cur.phoneInput).length >= 10) {
          runCheck();
        } else if (cur.screen === "cpf" && cur.cpf.length === 11) {
          runCpf(cur.cpf);
        } else if (cur.screen === "email" && cur.email.trim()) {
          submitEmail();
        }
      },
      supportWhats: () => {
        openExternal(WHATSAPP_URL);
        set({ modalKind: null });
      },
      openSupport: () => {
        // Vindo do sheet de CPF inválido, o CPF errado não pode ficar preso no campo.
        const patch: Partial<FlowState> = { modalKind: "support" };
        if (state().modalKind === "cpfinvalid") {
          patch.cpf = "";
          patch.cardError = false;
        }
        set(patch);
      },
      goV7m,
      onExistsUseNumber: () => {
        set({ modalKind: null, cpf: "", phoneInput: "", otp: "" });
        nav("check", "left");
      },
      onSuccessContinue: () => {
        set({ modalKind: null, loggedIn: true, stage: "lead" });
        nav("painel");
      },
      continueEmail,

      onEmailInput: (value) => {
        const trimmed = value.trim();
        const patch: Patch = {
          email: value,
          emailShake: false,
          emailError: false,
          emailHint: false,
          // "Manter mesmo assim" vale só pro valor exato — mudou uma letra, volta a sugerir.
          emailSuggest: trimmed && value !== state().emailKept ? suggestEmail(value) : null,
          // Aviso de temporário só com formato completo — antes disso seria prematuro.
          emailTemp: isEmailFormatValid(value) && isTempEmail(value),
        };
        // Bolinha viva (§210): vazio = cinza; a cada tecla = amarela ("verificando
        // formato"); assentou 350ms = verde se válido, amarela se ainda falta algo.
        if (t.emDot) clearTimeout(t.emDot);
        if (!trimmed) {
          patch.emailDot = "idle";
        } else {
          patch.emailDot = "checking";
          t.emDot = setTimeout(() => {
            if (isEmailFormatValid(state().email)) set({ emailDot: "valid" });
          }, 350);
        }
        set(patch);
      },
      submitEmail,
      emailUseSuggestion: () => {
        const suggested = state().emailSuggest;
        if (!suggested) return;
        if (t.emDot) clearTimeout(t.emDot);
        // A sugestão é sempre um e-mail completo de domínio conhecido: bolinha já verde.
        set({
          email: suggested,
          emailSuggest: null,
          emailKept: "",
          emailDot: "valid",
          emailTemp: false,
        });
      },
      emailKeepTyped: () => set({ emailKept: state().email, emailSuggest: null }),
      emailSwap: () => {
        if (t.emDot) clearTimeout(t.emDot);
        // Transversal do funil: saída de "não deu" limpa o campo pra recomeçar.
        set({
          emailPhase: "input",
          email: "",
          emailDot: "idle",
          emailSuggest: null,
          emailKept: "",
          emailTemp: false,
          emailHint: false,
          emailError: false,
        });
      },

      expandPlan: (m) => set({ planExpanded: m }),
      collapsePlan: () => set({ planExpanded: null }),
      confirmPlan: () => {
        const m = state().planExpanded;
        set({ planExpanded: null });
        if (m) startCheckout(m);
      },
      planosBack: () => nav(state().loggedIn ? "painel" : "check", "left"),
      goPlanos: () => nav("planos", "left"),

      retryCheckout: () => startCheckout(state().checkoutMethod),
      openCheckoutUrl: () => {
        const url = state().checkoutUrl;
        if (url && !LEAD_MOCK) window.location.assign(url);
      },
      checkoutReopen: () => {
        clearCheckout();
        set({ loggedIn: true, stage: "lead", checkoutPhase: "run" });
        nav("painel");
      },
      // Em produção o PARCEIRO redireciona de volta já pago; o botão simula esse retorno.
      enterEnrollment: () => {
        clearCheckout();
        set({
          camPhase: null,
          photoCtx: null,
          docStep: "front",
          checkoutPhase: "run",
        });
        nav("e_doc");
      },
      // lead voltou: checkout já existe no backend — retoma direto com a forma escolhida
      // "Quero mudar de vida →": retomar é REUSAR a URL viva (recriar mataria o PIX
      // antigo — o plano é explícito). Sem URL: sessão sem link → recria; sem checkout
      // nenhum → a pessoa nunca escolheu forma, o caminho é o planos.
      resumeCheckout: () => {
        if (LEAD_MOCK) {
          startCheckout(state().checkoutMethod); // protótipo: sem backend, re-roda o teatro
          return;
        }
        const co = state().painelCheckout;
        if (co?.url) {
          window.location.assign(co.url);
          return;
        }
        if (co) {
          startCheckout(co.method);
          return;
        }
        nav("planos");
      },
      logout: () => {
        clearSession(); // o JWT vai junto: continuar logado depois de "sair" é o pior dos bugs
        set({
          loggedIn: false,
          otp: "",
          phone: "",
          phoneInput: "",
          externalId: "",
          roles: [],
          relogin: false,
          otpSeconds: 0,
        });
        nav("check");
      },

      startDocCam: () =>
        set({
          photoCtx: state().docStep === "front" ? "rgfront" : "rgback",
          camPhase: "camera",
        }),
      takePhoto: () => {
        set({ flashShow: true });
        if (t.flash) clearTimeout(t.flash);
        t.flash = setTimeout(() => set({ flashShow: false, camPhase: "preview" }), 200);
      },
      retakePhoto: () => set({ camPhase: "camera" }),
      sendPhoto,
      chooseAddrFoto: () => set({ photoCtx: "proof", camPhase: "camera" }),
      onDocFilePicked,
      startSelfieCam: () => set({ photoCtx: "selfie", camPhase: "camera" }),
      goBackE: () => {
        const i = E_STAGES.indexOf(state().screen as EnrollStage);
        if (i > 0) {
          set({ camPhase: null, photoCtx: null, docStep: "front" });
          nav(E_STAGES[i - 1]);
        }
      },

      onBotInput: (value) => set({ botInput: value }),
      onBotKey: (e) => {
        if (e.key === "Enter") botSend();
      },
      botMic: () => {
        const q = state().botQ;
        const mic = q ? BOT_Q[q].mic : undefined;
        if (!mic) return;
        if (t.mic) clearInterval(t.mic);
        set({ botInput: "" });
        let i = 0;
        t.mic = setInterval(() => {
          i++;
          set({ botInput: mic.slice(0, i) });
          if (i >= mic.length && t.mic) clearInterval(t.mic);
        }, 55);
      },
      botSend,
      answerDone: (v) =>
        think(() => {
          if (v === true && state().botLevel === "Médio") {
            askBot("blocked");
            return;
          }
          celebrate({ botDone: v }, nextBotStep);
        }),
      botFixLevel: () => askBot("q1"),
      botFixDone: () => askBot("done"),
      botCloseModal: () => set({ botModal: false, botPhase: "listen" }),
      botConfirmAll,

      enterHome,
      onAula: () => {
        if (state().platformReady) {
          openExternal(EAD_URL);
          return;
        }
        const m = AULA_MSGS[Math.floor(Math.random() * AULA_MSGS.length)];
        set({
          info: { emoji: m.emoji, title: m.title, body: m.body, iconBg: "var(--color-brand-blue-bg)" },
        });
      },
      onDocTap: (d) => {
        if (d.status === "rejected") {
          set({
            info: {
              emoji: "📄",
              title: `${d.label} reprovado`,
              body: "A imagem não passou na validação (ilegível ou cortada). Toque em reenviar para mandar de novo.",
              iconBg: "var(--color-brand-danger-bg)",
              actionLabel: `Reenviar ${d.label}`,
              actionBg: "var(--color-brand-danger)",
              action: () => {
                set({
                  info: null,
                  camPhase: null,
                  photoCtx: null,
                  docStep: "front",
                  resubmitFrom: d.screen,
                });
                nav(d.screen);
              },
            },
          });
          return;
        }
        const approved = d.status === "approved";
        set({
          info: {
            emoji: approved ? "✅" : "🔎",
            title: d.label,
            body: approved
              ? "Documento aprovado! Não precisa fazer mais nada aqui."
              : "Recebemos e estamos conferindo. Leva pouco tempo — a gente te avisa no WhatsApp.",
            iconBg: approved ? "var(--color-brand-green-bg)" : "var(--color-brand-blue-bg)",
          },
        });
      },
      onPending: () => {
        const male = state().sex === "M";
        set({
          info: {
            emoji: "📋",
            title: "Documentos do aluno",
            body: `Depois que a matrícula for aprovada, você envia: histórico escolar, certidão, título de eleitor, comprovante de residência, foto 3×4${male ? ", reservista" : ""} e informa seu tipo sanguíneo. A gente te avisa quando liberar.`,
            iconBg: "rgba(255,223,0,0.28)",
          },
        });
      },
      onProva: () =>
        set({
          info: {
            emoji: "📝",
            title: "Prova ainda bloqueada",
            body: `Sua prova libera quando todos os documentos forem enviados e aprovados${state().sex === "M" ? " (incluindo a reservista)" : ""}. Falta pouco!`,
            iconBg: "var(--color-brand-blue-bg)",
          },
        }),
      onDiploma: () =>
        set({
          info: {
            emoji: "🎓",
            title: "Seu diploma está vindo",
            body: "Assim que você concluir as provas e o curso, seu diploma reconhecido pelo MEC aparece aqui para baixar.",
            iconBg: "rgba(255,223,0,0.28)",
          },
        }),
      onSuporte: () =>
        set({
          info: {
            emoji: "💬",
            title: "Falar no WhatsApp",
            body: "Nossa equipe responde de segunda a sábado, das 8h às 20h. Chama que a gente resolve!",
            iconBg: "var(--color-brand-green-bg)",
            actionLabel: "Abrir WhatsApp",
            actionBg: "var(--color-brand-green-dark)",
            action: openWhats,
          },
        }),
      closeInfo,
    };
}

/**
 * Hook do funil: estado (useReducer) + controlador estável. O espelho
 * `stateRef` é sincronizado num efeito — os closures do controlador só leem
 * estado em eventos/timers, sempre pós-commit (mesma semântica do protótipo).
 *
 * Vive no PROVIDER do grupo de rotas `(funil)` — monta uma vez e sobrevive à
 * navegação entre os passos; `push` é o router.push injetado de lá.
 */
export function useLeadFlow(push: (route: string) => void): { s: FlowState; act: FlowActions } {
  const [s, set] = useReducer(reduce, undefined, initialState);

  const [ctl] = useState(() => createController(initialState(), set, push));
  useEffect(() => {
    ctl.sync(s);
  });
  useEffect(() => () => ctl.dispose(), [ctl]);

  // Entrada do funil (só-cliente): resolve o ref vigente (URL ganha, cookie é
  // reserva — lead-ref.ts) e repõe a sessão da tela 1 após recarga no meio do
  // caminho (o /login recarregado volta a saber o telefone mascarado).
  useEffect(() => {
    ctl.setEntryRef(resolveEntryRef());
    const sess = getSession();
    if (sess?.phone) ctl.boot({ phone: sess.phone, externalId: sess.externalId ?? "" });
  }, [ctl]);

  // Selo "Indicado por …": o `?ref=` é o external_id do promotor, então o NOME vem do backend
  // (rota pública). Best-effort e assíncrono — sem nome resolvido, o selo simplesmente não
  // aparece; nunca vale segurar a entrada do funil (ou pior, escrever um UUID na tela).
  useEffect(() => {
    const ref = s.promoterRef;
    if (!ref) return;
    let alive = true;
    void resolveReferralName(ref).then((name) => {
      if (alive && name) set({ promoterName: name });
    });
    return () => {
      alive = false;
    };
  }, [s.promoterRef]);

  // Vitrine de preços (rota pública): busca na entrada e, enquanto não vier, re-tenta a
  // cada troca de tela — quem chega no passo 6 tem a melhor chance possível de ver o preço
  // VIVO. Best-effort: sem resposta, os cards ficam no fallback do protótipo (runPricing).
  useEffect(() => {
    if (s.pricingLive) return;
    let alive = true;
    void runPricing().then((pricing) => {
      if (alive && pricing) set({ pricing, pricingLive: true });
    });
    return () => {
      alive = false;
    };
  }, [s.pricingLive, s.screen]);

  // "Olá, {nome}" no header global acompanha o estado mockado do funil.
  useEffect(() => {
    setLeadSession({ loggedIn: s.loggedIn, name: s.loggedIn ? s.name : null });
    return () => setLeadSession({ loggedIn: false, name: null });
  }, [s.loggedIn, s.name]);

  return { s, act: ctl };
}
