"use client";

import { useEffect, useReducer, useState } from "react";

import { isValidCpf } from "@/lib/cpf";
import { maskBrPhone, onlyDigits } from "@/lib/phone";

import {
  AULA_MSGS,
  BOT_Q,
  CHECKOUT_MSGS,
  E_STAGES,
  EAD_URL,
  MOCK_IDENTITY,
  V7M_URL,
  WHATSAPP_URL,
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
  promoterRef: string;
  switcherOpen: boolean;

  loggedIn: boolean;
  phone: string;
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

  email: string;
  emailPhase: "input" | "processing" | "flying";
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

function initialState(referral: string): FlowState {
  return {
    screen: "check",
    dir: "right",
    promoterRef: referral.trim(),
    switcherOpen: false,
    loggedIn: false,
    phone: "",
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
    email: "",
    emailPhase: "input",
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
  dec?: ReturnType<typeof setTimeout>;
  decI?: ReturnType<typeof setInterval>;
  close?: ReturnType<typeof setTimeout>;
  emailNext?: ReturnType<typeof setTimeout>;
  em?: ReturnType<typeof setTimeout>;
  em2?: ReturnType<typeof setTimeout>;
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

  setCpf: (digits: string) => void;
  openSupport: () => void;
  goV7m: () => void;
  onExistsUseNumber: () => void;
  onSuccessContinue: () => void;
  continueEmail: () => void;

  onEmailInput: (value: string) => void;
  submitEmail: () => void;

  expandPlan: (m: PaymentMethod) => void;
  collapsePlan: () => void;
  confirmPlan: () => void;
  planosBack: () => void;
  goPlanos: () => void;

  retryCheckout: () => void;
  checkoutReopen: () => void;
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
 */
function createController(initial: FlowState, set: SetFlow): FlowController {
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
    };

    const goTo = (screen: Screen, dir: "right" | "left" = "right") => {
      // Timers presos à tela anterior morrem na troca (auditoria: descoberta do CPF
      // empurrava pro e-mail ~7s depois de sair; checkout seguia mudando de fase fora
      // da tela; redirect do e_done disparava de onde não devia). Câmera idem.
      if (t.dec) clearTimeout(t.dec);
      if (t.decI) clearInterval(t.decI);
      if (t.close) clearTimeout(t.close);
      if (t.emailNext) clearTimeout(t.emailNext);
      if (t.redir) clearTimeout(t.redir);
      if (screen !== "checkout") clearCheckout();
      set({ screen, dir, switcherOpen: false, camPhase: null, photoCtx: null, flashShow: false });
      if (screen === "e_edu") startBot();
      if (screen === "e_done") {
        t.redir = setTimeout(() => enterHome(), 2600);
      }
      document.querySelector(".app-scroll")?.scrollTo({ top: 0 });
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

    const submitOtp = (code: string) => {
      if (code.length < 6) return;
      // Protótipo: 000000 = incorreto · 111111 = expirado (dispara OTP novo). Resto = ok.
      if (code === "000000") {
        set({ modalKind: "otp", otp: "" });
        return;
      }
      if (code === "111111") {
        set({ modalKind: "expired", otp: "", otpSeconds: 30 });
        tickOtp();
        return;
      }
      set({ otpBusy: true });
      t.auto = setTimeout(() => {
        set({
          otpBusy: false,
          cpf: "",
          cpfChecking: false,
          cpfPhase: "input",
          discName: "",
        });
        nav("cpf");
      }, 900);
    };

    /* ---- check (telefone) ---- */
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
      // "chamada ao servidor" (mock): decide pelo fim do número
      set({ phone: d, checking: true, cardError: false });
      t.auto = setTimeout(() => {
        const tail = d.slice(-2);
        if (tail === "00") {
          set({ checking: false, modalKind: "server" });
          return;
        }
        if (tail === "99") {
          set({
            checking: false,
            cardError: true,
            modalKind: "invalid",
            blockedNumbers: state().blockedNumbers.concat(d),
          });
          return;
        }
        if (tail === "77") {
          set({ checking: false, cardError: true, modalKind: "staff" });
          return;
        }
        if (tail === "33") {
          // já é aluno → modal + auto-redirect pro app.v7m.org
          set({ checking: false, modalKind: "client" });
          t.v7m = setTimeout(() => {
            if (state().modalKind === "client") goV7m();
          }, 2200);
          return;
        }
        if (tail === "88") {
          set({ checking: false, modalKind: "unverified" });
          return;
        }
        if (tail === "11") {
          set({ checking: false, modalKind: "slow" });
          return;
        }
        if (tail === "22") {
          set({ checking: false, modalKind: "offline" });
          return;
        }
        // válido: salva número, cria usuário e cai direto no OTP
        set({ checking: false, otp: "", otpSeconds: 30 });
        tickOtp();
        nav("login");
      }, 1100);
    };

    /* ---- CPF ---- */
    const startDiscovery = () => {
      set({ cpfPhase: "discovery", discName: "" });
      const full = MOCK_IDENTITY.nameUpper;
      const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#@%&*";
      if (t.dec) clearTimeout(t.dec);
      if (t.decI) clearInterval(t.decI);
      if (t.close) clearTimeout(t.close);
      if (t.emailNext) clearTimeout(t.emailNext);
      t.dec = setTimeout(() => {
        let frame = 0;
        t.decI = setInterval(() => {
          frame++;
          const locked = frame;
          let out = "";
          for (let i = 0; i < full.length; i++) {
            if (full[i] === " ") {
              out += " ";
              continue;
            }
            out += i < locked ? full[i] : pool[Math.floor(Math.random() * pool.length)];
          }
          set({ discName: out });
          if (locked >= full.length) {
            if (t.decI) clearInterval(t.decI);
            set({ discName: full });
          }
        }, 55);
      }, 1500);
      t.close = setTimeout(() => set({ cpfPhase: "discoveryClose" }), 6200);
      t.emailNext = setTimeout(() => continueEmail(), 7050);
    };

    const runCpf = (d: string) => {
      if (!isValidCpf(d)) {
        set({ modalKind: "cpfinvalid", cardError: true });
        return;
      }
      set({ cpfChecking: true });
      t.auto = setTimeout(() => {
        // Protótipo: CPF válido term. 0 = já existe · term. 9 = erro servidor. Resto = novo.
        if (d.slice(-1) === "0") {
          set({ cpfChecking: false, modalKind: "exists", cpf: "" });
          return;
        }
        if (d.slice(-1) === "9") {
          set({ cpfChecking: false, modalKind: "server" });
          return;
        }
        set({ cpfChecking: false });
        startDiscovery();
      }, 1100);
    };

    const continueEmail = () => {
      if (t.decI) clearInterval(t.decI);
      if (t.close) clearTimeout(t.close);
      if (t.emailNext) clearTimeout(t.emailNext);
      set({
        cpfPhase: "input",
        email: "",
        emailPhase: "input",
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
    const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

    const finishEmail = () => {
      set({ loggedIn: true, stage: "lead", emailPhase: "input" });
      nav("painel");
    };

    const submitEmail = () => {
      const v = state().email.trim();
      if (!emailValid(v)) {
        set({ emailError: true, modalKind: "emailinvalid", emailShake: true });
        if (t.shake) clearTimeout(t.shake);
        t.shake = setTimeout(() => set({ emailShake: false }), 520);
        return;
      }
      set({ emailPhase: "processing", emailError: false });
      if (t.em) clearTimeout(t.em);
      t.em = setTimeout(() => {
        const at = v.toLowerCase().indexOf("@");
        const local = at < 0 ? v.toLowerCase() : v.toLowerCase().slice(0, at);
        // Gatilho: local "usado"/"outro" = e-mail de outra conta
        if (local === "usado" || local === "outro") {
          set({ emailPhase: "input", emailError: true, modalKind: "emailtaken", emailShake: true });
          if (t.shake) clearTimeout(t.shake);
          t.shake = setTimeout(() => set({ emailShake: false }), 520);
          return;
        }
        set({ emailPhase: "flying" });
        if (t.em2) clearTimeout(t.em2);
        t.em2 = setTimeout(() => finishEmail(), 1900);
      }, 1200);
    };

    /* ---- planos / checkout ---- */
    const startCheckout = (method: PaymentMethod) => {
      clearCheckout();
      // mock: em produção o backend cria o checkout e responde { url } — o app só redireciona.
      const token = Math.random().toString(36).slice(2, 8).toUpperCase();
      set({
        checkoutMethod: method,
        checkoutPhase: "run",
        checkoutMsg: 0,
        checkoutUrl: `https://pagamento.parceiro.com.br/c/${token}`,
      });
      goTo("checkout");
      t.coMsg = setInterval(
        () =>
          set({ checkoutMsg: Math.min(state().checkoutMsg + 1, CHECKOUT_MSGS.length - 1) }),
        850,
      );
      // mock: PIX conclui; Cartão simula falha na criação (testa o estado de erro)
      t.co = setTimeout(() => {
        if (t.coMsg) clearInterval(t.coMsg);
        if (method === "card") {
          set({ checkoutPhase: "error" });
          return;
        }
        set({ checkoutPhase: "ready" });
        t.co2 = setTimeout(() => set({ checkoutPhase: "done" }), 1700);
      }, 3400);
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
        if (k === "emailinvalid" || k === "emailtaken") {
          patch.email = "";
          patch.emailError = false;
        }
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
        if (state().otpSeconds > 0) return;
        set({ otp: "", otpSeconds: 30, modalKind: "resent" });
        tickOtp();
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

      onEmailInput: (value) => set({ email: value, emailShake: false, emailError: false }),
      submitEmail,

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
      resumeCheckout: () => startCheckout(state().checkoutMethod),
      logout: () => {
        set({ loggedIn: false, otp: "", phoneInput: "" });
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
 */
export function useLeadFlow(referral: string): { s: FlowState; act: FlowActions } {
  const [s, set] = useReducer(reduce, referral, initialState);

  const [ctl] = useState(() => createController(initialState(referral), set));
  useEffect(() => {
    ctl.sync(s);
  });
  useEffect(() => () => ctl.dispose(), [ctl]);

  // "Olá, {nome}" no header global acompanha o estado mockado do funil.
  useEffect(() => {
    setLeadSession({ loggedIn: s.loggedIn, name: s.loggedIn ? s.name : null });
    return () => setLeadSession({ loggedIn: false, name: null });
  }, [s.loggedIn, s.name]);

  return { s, act: ctl };
}
