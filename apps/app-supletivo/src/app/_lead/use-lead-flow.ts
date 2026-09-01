"use client";

import { useEffect, useReducer, useState } from "react";

import type { IdentityOut } from "@/lib/api";
import { isValidCpf } from "@/lib/cpf";
import { maskBrPhone, onlyDigits } from "@/lib/phone";
import { clearSession, getAccessToken, getSession, saveLogin, saveSession } from "@/lib/session";

import {
  CHECKOUT_MSGS,
  FUNNEL_ORDER,
  PRICING,
  SCREEN_ROUTES,
  V7M_URL,
  WHATSAPP_URL,
  ageFromIso,
  type ModalKind,
  type Screen,
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
  type CheckOutcome,
  type LoginOutcome,
  type PainelCheckout,
} from "./lead-api";
import { isEmailFormatValid, isTempEmail, suggestEmail } from "./email-domains";
import { resolveEntryRef } from "./lead-ref";
import { setLeadSession } from "./lead-session";

export type CheckoutPhase = "run" | "ready" | "done" | "error" | "resume";
export type PaymentMethod = "pix" | "card";

export interface FlowState {
  screen: Screen;
  dir: "right" | "left";
  promoterRef: string;
  promoterName: string;
  switcherOpen: boolean;
  loggedIn: boolean;
  phone: string;
  externalId: string;
  roles: string[];
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
  discPhoto: string | null;
  discAge: number | null;
  email: string;
  emailPhase: "input" | "processing" | "success" | "flying" | "taken";
  emailDot: "idle" | "checking" | "valid";
  emailSuggest: string | null;
  emailKept: string;
  emailTemp: boolean;
  emailAlreadyYours: boolean;
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
  pricing: Pricing;
  pricingLive: boolean;
  painelLoaded: boolean;
  painelCheckout: PainelCheckout | null;
  sex: "F" | "M" | null;
}

function initialState(): FlowState {
  return {
    screen: "check",
    dir: "right",
    promoterRef: "",
    promoterName: "",
    switcherOpen: false,
    loggedIn: false,
    phone: "",
    externalId: "",
    roles: [],
    relogin: false,
    name: "",
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
    sex: null,
  };
}

type Patch = Partial<FlowState>;

function reduce(prev: FlowState, patch: Patch): FlowState {
  return { ...prev, ...patch };
}

interface Timers {
  otp?: ReturnType<typeof setInterval>;
  coMsg?: ReturnType<typeof setInterval>;
  co?: ReturnType<typeof setTimeout>;
  co2?: ReturnType<typeof setTimeout>;
  coPoll?: ReturnType<typeof setInterval>;
  dec?: ReturnType<typeof setTimeout>;
  decI?: ReturnType<typeof setTimeout>;
  close?: ReturnType<typeof setTimeout>;
  emailNext?: ReturnType<typeof setTimeout>;
  em?: ReturnType<typeof setTimeout>;
  em2?: ReturnType<typeof setTimeout>;
  emDot?: ReturnType<typeof setTimeout>;
  auto?: ReturnType<typeof setTimeout>;
  shake?: ReturnType<typeof setTimeout>;
  redir?: ReturnType<typeof setTimeout>;
}

export interface FlowActions {
  nav: (screen: Screen, dir?: "right" | "left") => void;
  syncFromRoute: (screen: Screen) => void;
  boot: (session: { phone: string; externalId: string }) => void;
  setEntryRef: (ref: string) => void;
  toggleSwitcher: () => void;
  showModalDemo: (kind: ModalKind) => void;
  onPhoneInput: (raw: string) => void;
  onCheckSubmit: (e: React.FormEvent) => void;
  closeModal: () => void;
  retryTransient: () => void;
  supportWhats: () => void;
  setOtp: (code: string) => void;
  onResend: () => void;
  startRelogin: (phone: string) => void;
  restartFunnel: () => void;
  setCpf: (digits: string) => void;
  openSupport: () => void;
  goV7m: () => void;
  onExistsUseNumber: () => void;
  onSuccessContinue: () => void;
  continueEmail: () => void;
  onEmailInput: (value: string) => void;
  submitEmail: () => void;
  emailUseSuggestion: () => void;
  emailKeepTyped: () => void;
  emailSwap: () => void;
  expandPlan: (m: PaymentMethod) => void;
  collapsePlan: () => void;
  confirmPlan: () => void;
  planosBack: () => void;
  goPlanos: () => void;
  retryCheckout: () => void;
  checkoutReopen: () => void;
  openCheckoutUrl: () => void;
  resumeCheckout: () => void;
  logout: () => void;
}

function openExternal(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener");
}

function goExternal(url: string) {
  if (typeof window !== "undefined") window.location.assign(url);
}

type SetFlow = (patch: Patch) => void;

interface FlowController extends FlowActions {
  sync: (s: FlowState) => void;
  dispose: () => void;
}

function createController(initial: FlowState, dispatch: SetFlow, push: (route: string) => void): FlowController {
  const t: Timers = {};
  let committed = initial;
  const state = () => committed;
  const set: SetFlow = (patch) => {
    committed = reduce(committed, patch);
    dispatch(patch);
  };
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
  const leaveScreen = (next: Screen) => {
    if (t.dec) clearTimeout(t.dec);
    if (t.decI) clearTimeout(t.decI);
    if (t.close) clearTimeout(t.close);
    if (t.emailNext) clearTimeout(t.emailNext);
    if (t.redir) clearTimeout(t.redir);
    if (next !== "checkout") clearCheckout();
  };
  const fetchPainel = () => {
    void runLeadMe().then((out) => {
      if (state().screen !== "painel") return;
      if (out.kind === "restart") {
        set({ modalKind: "sessionexpired" });
        return;
      }
      if (out.kind !== "ok") return;
      if (out.paid) {
        push("/matricula");
        return;
      }
      const patch: Patch = { painelLoaded: true, painelCheckout: out.checkout };
      if (out.name) patch.name = out.name;
      if (out.checkout) patch.checkoutMethod = out.checkout.method;
      set(patch);
    });
  };
  const enterScreen = (screen: Screen) => {
    if (screen === "painel") fetchPainel();
    if (screen === "checkout" && !coInflight && !state().checkoutUrl && state().checkoutPhase === "run") {
      coInflight = true;
      void runLeadMe().then((out) => {
        coInflight = false;
        if (state().screen !== "checkout") return;
        if (out.kind === "restart") {
          set({ checkoutPhase: "error", modalKind: "sessionexpired" });
          return;
        }
        if (out.kind === "error") {
          nav("painel", "left");
          return;
        }
        if (out.paid) {
          push("/matricula");
          return;
        }
        if (out.checkout?.url) {
          set({
            checkoutUrl: out.checkout.url,
            checkoutMethod: out.checkout.method,
            checkoutPhase: "resume",
            painelCheckout: out.checkout,
            painelLoaded: true,
          });
          return;
        }
        nav("planos", "left");
      });
    }
    document.querySelector(".app-scroll")?.scrollTo({ top: 0 });
  };
  const goTo = (screen: Screen, dir: "right" | "left" = "right") => {
    const prev = state().screen;
    leaveScreen(screen);
    set({ screen, dir, switcherOpen: false });
    const route = SCREEN_ROUTES[screen];
    if (route && prev !== screen) push(route);
    enterScreen(screen);
  };
  const syncFromRoute = (screen: Screen) => {
    if (state().screen === screen) return;
    const from = FUNNEL_ORDER.indexOf(state().screen);
    const to = FUNNEL_ORDER.indexOf(screen);
    const dir = from >= 0 && to >= 0 && to < from ? "left" : "right";
    leaveScreen(screen);
    set({ screen, dir, switcherOpen: false });
    enterScreen(screen);
  };
  const nav = (screen: Screen, dir: "right" | "left" = "right") => {
    if (screen === "checkout" && !state().checkoutUrl) {
      startCheckout(state().checkoutMethod);
      return;
    }
    goTo(screen, dir);
  };
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
  const resend = (phone: string, announce: boolean) => {
    if (!phone) {
      set({ modalKind: "sessionexpired" });
      return;
    }
    set({ otpSeconds: OTP_COOLDOWN_S });
    tickOtp();
    void runPhoneCheck(phone, state().promoterRef).then((out) => {
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
  function decodeJwtRoles(token?: string | null): string[] {
    if (!token) return [];
    try {
      const parts = token.split(".");
      if (parts.length < 2) return [];
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      return Array.isArray(payload.roles) ? payload.roles : [];
    } catch {
      return [];
    }
  }

  const goAfterLogin = (explicitRoles?: string[]) => {
    const roles =
      explicitRoles && explicitRoles.length > 0
        ? explicitRoles
        : state().roles.length > 0
          ? state().roles
          : decodeJwtRoles(getAccessToken());
    if (roles.includes("student") || roles.includes("veteran")) {
      push("/aluno");
      return;
    }
    if (roles.includes("enrollment")) {
      push("/matricula");
      return;
    }
    set({ cpf: "", cpfChecking: false, cpfPhase: "input", discName: "", discPhoto: null, discAge: null });
    nav("cpf");
  };
  const applyLogin = (out: LoginOutcome) => {
    set({ otpBusy: false });
    if (out.kind === "ok") {
      saveLogin({ ...out.tokens });
      const tokenRoles = decodeJwtRoles(out.tokens.access_token);
      if (tokenRoles.length > 0) {
        set({ roles: tokenRoles });
      }
      goAfterLogin(tokenRoles);
      return;
    }
    if (out.kind === "wrong") {
      set({ modalKind: "otp", otp: "" });
      return;
    }
    if (out.kind === "expired") {
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
      set({ modalKind: "sessionexpired", otp: "" });
      return;
    }
    set({ otpBusy: true });
    void runOtpLogin(id, code).then(applyLogin);
  };
  const applyCheck = (digits: string, out: CheckOutcome) => {
    if (state().phone !== digits) return;
    if (out.kind === "otp") {
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
    if (out.modal === "invalid" || out.modal === "staff") patch.cardError = true;
    if (out.block) patch.blockedNumbers = state().blockedNumbers.concat(digits);
    set(patch);
  };
  const runCheck = () => {
    if (state().checking) return;
    const d = onlyDigits(state().phoneInput);
    if (d.length !== 10 && d.length !== 11) {
      set({ cardError: true, modalKind: "invalid" });
      return;
    }
    if (state().blockedNumbers.includes(d)) {
      set({ cardError: true, modalKind: "invalid" });
      return;
    }
    set({ phone: d, checking: true, cardError: false });
    void runPhoneCheck(d, state().promoterRef).then((out) => applyCheck(d, out));
  };
  const startDiscovery = (identity: IdentityOut) => {
    if (t.dec) clearTimeout(t.dec);
    if (t.decI) clearTimeout(t.decI);
    if (t.close) clearTimeout(t.close);
    if (t.emailNext) clearTimeout(t.emailNext);
    set({
      cpfPhase: "discovery",
      discName: identity.name ?? "",
      discPhoto: identity.photo,
      discAge: ageFromIso(identity.birth_date),
      ...(identity.name ? { name: identity.name } : {}),
      ...(identity.sex === "M" || identity.sex === "F" ? { sex: identity.sex } : {}),
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
    void runIdentity(d).then((out) => {
      set({ cpfChecking: false });
      if (out.kind === "ok") {
        startDiscovery(out.identity);
        return;
      }
      if (out.kind === "conflict") {
        clearSession();
        set({ loggedIn: false, externalId: "", modalKind: "exists", cpf: "" });
        return;
      }
      if (out.kind === "restart") {
        set({ modalKind: "sessionexpired", cpf: "" });
        return;
      }
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
    goExternal(`${V7M_URL}/login`);
    set({ modalKind: null });
  };
  const emailGentleNudge = () => {
    set({ emailPhase: "input", emailError: true, emailHint: true, emailShake: true });
    if (t.shake) clearTimeout(t.shake);
    t.shake = setTimeout(() => set({ emailShake: false }), 520);
  };
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
    if (cur.emailSuggest && cur.emailKept !== v) {
      set({ emailShake: true });
      return;
    }
    if (t.emDot) clearTimeout(t.emDot);
    set({ emailPhase: "processing", emailError: false, emailHint: false, emailSuggest: null });
    void runEmail(v).then((out) => {
      if (state().screen !== "email") return;
      if (out.kind === "ok") {
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
  const finishCheckout = (url: string) => {
    clearCheckout();
    set({ checkoutUrl: url, checkoutPhase: "ready" });
    t.co2 = setTimeout(() => {
      set({ checkoutPhase: "done" });
      if (!LEAD_MOCK) {
        t.redir = setTimeout(() => window.location.assign(url), 750);
      }
    }, 1700);
  };
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
        if (Date.now() - startedAt > 45_000) {
          clearCheckout();
          set({ checkoutPhase: "error" });
        }
      });
    }, 1500);
  };
  let coInflight = false;
  const startCheckout = (method: PaymentMethod) => {
    clearCheckout();
    coInflight = true;
    set({ checkoutMethod: method, checkoutPhase: "run", checkoutMsg: 0, checkoutUrl: "" });
    goTo("checkout");
    t.coMsg = setInterval(
      () => set({ checkoutMsg: Math.min(state().checkoutMsg + 1, CHECKOUT_MSGS.length - 1) }),
      850,
    );
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
        set({ loggedIn: true, stage: "lead" });
        nav("painel");
        return;
      }
      if (out.kind === "incomplete") {
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
  return {
    sync: (s) => {
      committed = s;
    },
    dispose,
    nav,
    syncFromRoute,
    boot: ({ phone, externalId }) => {
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
      if (d.length === 11 && !state().checking && !state().modalKind) {
        if (t.auto) clearTimeout(t.auto);
        t.auto = setTimeout(() => runCheck(), 240);
      } else if (d.length === 10 && !state().checking && !state().modalKind) {
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
      set(patch);
    },
    setOtp: (code) => {
      set({ otp: code });
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
      if (state().relogin && state().phone === phone) return;
      if (typeof window !== "undefined") {
        const key = "supletivo.relogin-otp";
        const now = Date.now();
        try {
          const previous = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as { phone?: string; at?: number } | null;
          if (previous?.phone === phone && now - (previous.at ?? 0) < 2_000) {
            set({ relogin: true, phone, otp: "", otpBusy: false });
            return;
          }
          window.sessionStorage.setItem(key, JSON.stringify({ phone, at: now }));
        } catch {}
      }
      set({ relogin: true, phone, otp: "", otpBusy: false });
      resend(phone, false);
    },
    restartFunnel: () => {
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
        cpf: "",
        email: "",
        emailPhase: "input",
        checkoutUrl: "",
        painelCheckout: null,
      });
      nav("check");
    },
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
    setCpf: (digits) => {
      set({ cpf: digits, cardError: false });
      if (digits.length === 11 && !state().cpfChecking && !state().modalKind) {
        runCpf(digits);
      }
    },
    openSupport: () => {
      openExternal(WHATSAPP_URL);
      set({ modalKind: null });
    },
    goV7m,
    onExistsUseNumber: () => {
      clearSession();
      set({ modalKind: null, phoneInput: "", cardError: false, cpf: "" });
      nav("check");
    },
    onSuccessContinue: () => {
      set({ modalKind: null });
      nav("email");
    },
    continueEmail: () => nav("email"),
    onEmailInput: (value) => {
      const trimmed = value.trim();
      const patch: Partial<FlowState> = {
        email: value,
        emailShake: false,
        emailError: false,
        emailHint: false,
        emailSuggest: trimmed && value !== state().emailKept ? suggestEmail(value) : null,
        emailTemp: isEmailFormatValid(value) && isTempEmail(value),
      };
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
      const s = state().emailSuggest;
      if (!s) return;
      set({ email: s, emailSuggest: null, emailDot: "valid", emailTemp: isTempEmail(s) });
    },
    emailKeepTyped: () => {
      set({ emailKept: state().email.trim(), emailSuggest: null });
    },
    emailSwap: () => {
      set({
        email: "",
        emailPhase: "input",
        emailDot: "idle",
        emailSuggest: null,
        emailKept: "",
        emailTemp: false,
        emailHint: false,
        emailError: false,
        emailShake: false,
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
    resumeCheckout: () => {
      if (LEAD_MOCK) {
        startCheckout(state().checkoutMethod);
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
      clearSession();
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
  };
}

export function useLeadFlow(push: (route: string) => void): { s: FlowState; act: FlowActions } {
  const [s, set] = useReducer(reduce, undefined, initialState);
  const [ctl] = useState(() => createController(initialState(), set, push));
  useEffect(() => {
    ctl.sync(s);
  });
  useEffect(() => () => ctl.dispose(), [ctl]);
  useEffect(() => {
    ctl.setEntryRef(resolveEntryRef());
    const sess = getSession();
    if (sess?.phone) ctl.boot({ phone: sess.phone, externalId: sess.externalId ?? "" });
  }, [ctl]);
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
