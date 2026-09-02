"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Feather,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Phone,
  ArrowLeft,
  Loader2,
  SunMedium,
  Cloud,
} from "lucide-react";

import { OtpInput } from "@/components/ui/otp-input";
import {
  ApiError,
  checkPhone,
  getBootstrapStatus,
  getErrorMessage,
  loginOtp,
  loginStaffPassword,
  NOT_STAFF_CODE,
} from "@/lib/api";
import { isValidBrPhone, maskBrPhone, onlyDigits } from "@/lib/phone";
import { clearSession, getSession, saveLogin, saveSession } from "@/lib/session";
import { decodeJwtPayload } from "@/lib/auth-context";

const DEFAULT_RESEND_COOLDOWN = 30;

const STAFF_DENIED =
  "Esse acesso é restrito ao staff. Sua conta não tem permissão de administrador.";

type AuthMode = "password" | "otp";
type Step = "phone" | "otp";

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  // Mode: password (default per Plume design) | otp (WhatsApp OTP)
  const [mode, setMode] = useState<AuthMode>("password");
  const [step, setStep] = useState<Step>("phone");

  // Form states
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP states
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);

  // Status & feedback
  const [error, setError] = useState<string | null>(
    params.get("denied") === "1" ? STAFF_DENIED : null,
  );
  const [busy, setBusy] = useState(false);

  const digits = onlyDigits(phone);
  const phoneValid = isValidBrPhone(digits);

  // Se a plataforma nunca foi inicializada, encaminha para o Setup Wizard inicial
  useEffect(() => {
    let active = true;
    getBootstrapStatus()
      .then((status) => {
        if (active && status && !status.bootstrapped) {
          router.replace("/setup");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  // Pré-preenche se houver sessão salva
  useEffect(() => {
    const saved = getSession()?.phone;
    if (saved) {
      setPhone(maskBrPhone(saved));
    }
  }, []);

  // Timer de reenviar código
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const handleRouteRedirect = (accessToken: string) => {
    const payload = decodeJwtPayload(accessToken) as (Record<string, unknown> & { roles?: string[] }) | null;
    const roles = payload?.roles || [];
    const isSuperuser = !!payload?.is_superuser || roles.includes("superuser") || roles.includes("staff");

    if (isSuperuser) {
      router.replace("/admin");
    } else if (roles.includes("coordinator")) {
      router.replace("/hub");
    } else if (roles.includes("promoter")) {
      router.replace("/promoter");
    } else if (roles.includes("candidate")) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  };

  // Login via Email & Senha (Password mode)
  async function onLoginPassword(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    const identifier = workEmail.trim();
    const pass = password.trim();

    if (!identifier || !pass) {
      setError("Informe seu e-mail de trabalho e senha.");
      return;
    }

    setBusy(true);
    try {
      const tokens = await loginStaffPassword(identifier, pass);
      saveLogin({ ...tokens });
      handleRouteRedirect(tokens.access_token);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        (err.code === NOT_STAFF_CODE || err.status === 403)
      ) {
        clearSession();
        setError(STAFF_DENIED);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  // Enviar código OTP via WhatsApp
  async function onSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    if (!phoneValid) {
      setError("Digite um telefone válido com DDD.");
      return;
    }
    setBusy(true);
    try {
      const ref = params.get("ref") || params.get("hub");
      const res = await checkPhone(digits, ref);
      if (!res.external_id) {
        if (res.whatsapp === false) {
          setError("Esse número não possui WhatsApp ativo. Confira e tente de novo.");
        } else {
          setError("Não conseguimos validar seu telefone. Tente novamente.");
        }
        return;
      }
      saveSession({ phone: digits, externalId: res.external_id });
      if (res.otp_sent) {
        setSeconds(DEFAULT_RESEND_COOLDOWN);
      } else if (res.otp_wait && res.otp_wait > 0) {
        setSeconds(res.otp_wait);
      }
      setCode("");
      setStep("otp");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Confirmar OTP
  async function onLoginOtp() {
    if (busy) return;
    setError(null);
    const externalId = getSession()?.externalId;
    if (!externalId) {
      setError("Sessão expirada. Informe o telefone novamente.");
      setStep("phone");
      return;
    }
    setBusy(true);
    try {
      const tokens = await loginOtp(externalId, code);
      saveLogin({ ...tokens });
      handleRouteRedirect(tokens.access_token);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  // Reenviar OTP
  async function onResend() {
    setError(null);
    const savedPhone = getSession()?.phone || digits;
    if (!savedPhone) {
      setStep("phone");
      return;
    }
    setBusy(true);
    try {
      const res = await checkPhone(savedPhone);
      saveSession({ phone: savedPhone, externalId: res.external_id });
      if (res.otp_sent) {
        setSeconds(DEFAULT_RESEND_COOLDOWN);
        setCode("");
      } else if (res.otp_wait && res.otp_wait > 0) {
        setSeconds(res.otp_wait);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit no 6º dígito
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (step !== "otp" || mode !== "otp") return;
    if (code.length === 6 && !busy && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onLoginOtp();
    } else if (code.length < 6) {
      autoSubmitted.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, busy, step, mode]);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* Soft blurred gradient halo (-inset-3, sky-200 to coral-200, blur) */}
      <div
        className="ghost-blob absolute -inset-3 rounded-5xl bg-gradient-to-tr from-sky-200 via-sky-100 to-coral-200 opacity-80"
        aria-hidden="true"
      />

      {/* Main Two-Panel Card */}
      <div className="relative overflow-hidden rounded-5xl bg-white shadow-card ring-1 ring-sky-100">
        <div className="flex flex-col sm:flex-row">
          {/* Left Illustration Aside (200px wide on >=sm) */}
          <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-sky-700 via-sky-700 to-coral-600 p-6 text-white sm:w-[200px] sm:shrink-0 sm:p-7">
            {/* Decorative layered shapes */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-white/15"
              aria-hidden="true"
            />
            <div
              className="dotgrid-white pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-28 right-3 flex items-center gap-1 opacity-15"
              aria-hidden="true"
            >
              <SunMedium className="size-6" />
              <Cloud className="size-5" />
            </div>

            {/* Top Row: Feather logo tile + Beta pill */}
            <div className="relative z-10 flex items-center justify-between sm:flex-col sm:items-start sm:gap-4">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Feather className="size-5 text-sky-600" strokeWidth={2.5} />
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 backdrop-blur-sm">
                <Zap className="size-3 text-white" strokeWidth={2.5} />
                <span className="font-nunito text-[10px] font-black uppercase tracking-wider text-white">
                  beta
                </span>
              </div>
            </div>

            {/* Bottom Marketing Copy */}
            <div className="relative z-10 mt-8 sm:mt-24">
              <p className="font-nunito text-sm font-black leading-snug text-white sm:text-base">
                Build the front-end you&apos;ve been imagining.
              </p>
              <p className="font-nunito mt-1.5 text-xs font-semibold text-white/80">
                Idea to shippable UI, fast.
              </p>
            </div>
          </aside>

          {/* Right Form Panel */}
          <section className="flex flex-1 flex-col justify-between bg-white p-7 sm:p-9">
            <div>
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-nunito text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
                    Sign in
                  </h2>
                  <span className="font-nunito text-sm font-bold text-ink-500">
                    welcome back
                  </span>
                  <span className="text-base" role="img" aria-label="happy face">
                    😊
                  </span>
                </div>
              </div>

              {/* Sub-row */}
              <div className="mt-1 flex items-center gap-1.5 font-nunito text-xs text-ink-500 sm:text-sm">
                <span>New here?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setError(null);
                  }}
                  className="font-bold text-sky-700 transition hover:underline"
                >
                  Create an account
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mt-4 rounded-2xl border border-coral-200 bg-coral-50/90 p-3 font-nunito text-xs font-bold text-coral-600">
                  {error}
                </div>
              )}

              {/* AUTH FORM: PASSWORD MODE (DEFAULT) */}
              {mode === "password" ? (
                <form onSubmit={onLoginPassword} className="mt-6 flex flex-col gap-4">
                  {/* Work Email Field */}
                  <div>
                    <label
                      htmlFor="work-email"
                      className="font-nunito block text-xs font-black uppercase tracking-wider text-ink-700"
                    >
                      Work email
                    </label>
                    <div className="relative mt-1.5 flex items-center rounded-2xl border-2 border-sky-100 bg-sky-50/60 px-4 py-3 transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
                      <Mail className="size-5 shrink-0 text-sky-500 mr-3" strokeWidth={2.2} />
                      <input
                        id="work-email"
                        type="text"
                        autoComplete="email"
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        placeholder="you@studio.com"
                        className="w-full bg-transparent font-nunito text-sm font-bold text-ink-900 outline-none placeholder:text-ink-500/40"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="work-password"
                        className="font-nunito block text-xs font-black uppercase tracking-wider text-ink-700"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError("Para redefinir sua senha, entre em contato com o administrador do sistema.");
                        }}
                        className="font-nunito text-xs font-bold text-sky-700 transition hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative mt-1.5 flex items-center rounded-2xl border-2 border-sky-100 bg-sky-50/60 px-4 py-3 transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
                      <Lock className="size-5 shrink-0 text-sky-500 mr-3" strokeWidth={2.2} />
                      <input
                        id="work-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent font-nunito text-sm font-bold text-ink-900 outline-none placeholder:text-ink-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                        className="ml-2 text-ink-500 transition hover:text-ink-900"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" strokeWidth={2.2} />
                        ) : (
                          <Eye className="size-4" strokeWidth={2.2} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={busy || !workEmail.trim() || !password.trim()}
                    className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-700 to-coral-600 px-6 py-3.5 font-nunito text-base font-black text-white shadow-soft transition-all duration-200 hover:from-sky-800 hover:to-coral-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="size-5 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* AUTH FORM: WHATSAPP OTP MODE */
                <div className="mt-6 flex flex-col gap-4">
                  {step === "phone" ? (
                    <form onSubmit={onSendOtp} className="flex flex-col gap-4">
                      {/* Optional CPF */}
                      <div>
                        <label
                          htmlFor="otp-cpf"
                          className="font-nunito block text-xs font-black uppercase tracking-wider text-ink-700"
                        >
                          CPF (opcional)
                        </label>
                        <div className="relative mt-1.5 flex items-center rounded-2xl border-2 border-sky-100 bg-sky-50/60 px-4 py-3 transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
                          <input
                            id="otp-cpf"
                            type="text"
                            inputMode="numeric"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            className="w-full bg-transparent font-nunito text-sm font-bold text-ink-900 outline-none placeholder:text-ink-500/40"
                          />
                        </div>
                      </div>

                      {/* Phone / WhatsApp */}
                      <div>
                        <label
                          htmlFor="otp-phone"
                          className="font-nunito block text-xs font-black uppercase tracking-wider text-ink-700"
                        >
                          Telefone / WhatsApp
                        </label>
                        <div className="relative mt-1.5 flex items-center rounded-2xl border-2 border-sky-100 bg-sky-50/60 px-4 py-3 transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
                          <Phone className="size-5 shrink-0 text-sky-500 mr-3" strokeWidth={2.2} />
                          <input
                            id="otp-phone"
                            type="tel"
                            inputMode="numeric"
                            value={phone}
                            onChange={(e) => setPhone(maskBrPhone(e.target.value))}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-transparent font-nunito text-sm font-bold text-ink-900 outline-none placeholder:text-ink-500/40"
                          />
                        </div>
                      </div>

                      {/* Submit WhatsApp */}
                      <button
                        type="submit"
                        disabled={busy || !phoneValid}
                        className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-700 to-coral-600 px-6 py-3.5 font-nunito text-base font-black text-white shadow-soft transition-all duration-200 hover:from-sky-800 hover:to-coral-700 active:scale-[0.98] disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="size-5 animate-spin text-white" />
                        ) : (
                          <>
                            <span>Receber código via WhatsApp</span>
                            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step: OTP Code */
                    <div className="flex flex-col gap-4 text-center">
                      <p className="font-nunito text-sm font-bold text-ink-700">
                        Mandei um código pro seu WhatsApp. Digite ele aqui.
                      </p>
                      <div className="flex justify-center py-2">
                        <OtpInput length={6} value={code} onChange={setCode} invalid={!!error} disabled={busy} />
                      </div>

                      <button
                        type="button"
                        onClick={onLoginOtp}
                        disabled={busy || code.length < 6}
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-700 to-coral-600 px-6 py-3.5 font-nunito text-base font-black text-white shadow-soft transition-all duration-200 hover:from-sky-800 hover:to-coral-700 active:scale-[0.98] disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="size-5 animate-spin text-white" />
                        ) : (
                          <>
                            <span>Entrar</span>
                            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
                          </>
                        )}
                      </button>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setStep("phone");
                            setError(null);
                            setCode("");
                          }}
                          className="inline-flex items-center gap-1 font-nunito font-bold text-sky-700 hover:underline"
                        >
                          <ArrowLeft className="size-3.5" />
                          <span>Trocar telefone</span>
                        </button>
                        <button
                          type="button"
                          onClick={onResend}
                          disabled={seconds > 0 || busy}
                          className="font-nunito font-bold text-ink-500 underline transition hover:text-sky-700 disabled:opacity-50"
                        >
                          {seconds > 0 ? `Reenviar em ${seconds}s` : "Reenviar código"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* "or" Divider */}
              <div className="my-5 flex items-center gap-4">
                <div className="h-px flex-1 bg-sky-100" />
                <span className="font-nunito text-[11px] font-black uppercase tracking-widest text-ink-500/70">
                  or
                </span>
                <div className="h-px flex-1 bg-sky-100" />
              </div>

              {/* Two-Column Social Auth Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Google Button */}
                <button
                  type="button"
                  onClick={() => {
                    setError("Login social Google em integração para o seu workspace.");
                  }}
                  className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-sky-100 bg-white py-2.5 px-4 font-nunito text-xs font-black text-ink-900 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/50 active:scale-95"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* GitHub Button */}
                <button
                  type="button"
                  onClick={() => {
                    setError("Login social GitHub em integração para o seu workspace.");
                  }}
                  className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-sky-100 bg-white py-2.5 px-4 font-nunito text-xs font-black text-ink-900 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/50 active:scale-95"
                >
                  <svg className="size-4 fill-ink-900" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>
            </div>

            {/* Bottom Mode Switcher */}
            <div className="mt-6 border-t border-sky-100/80 pt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(mode === "password" ? "otp" : "password");
                }}
                className="font-nunito text-xs font-bold text-sky-700 transition hover:text-sky-900 hover:underline"
              >
                {mode === "password"
                  ? "📱 Preferir entrar via WhatsApp (OTP)?"
                  : "🔒 Voltar para Login com E-mail e Senha"}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Floating SOC 2 Chip overlapping the card at bottom-left */}
      <div className="relative z-20 -mt-4 ml-4 sm:-ml-4 inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 shadow-soft">
        <ShieldCheck className="size-4 text-sky-500" strokeWidth={2.5} />
        <span className="font-nunito text-xs font-black text-ink-900">
          SOC 2 secure
        </span>
        <span className="font-nunito text-xs font-semibold text-ink-500">
          / Your work stays yours
        </span>
      </div>
    </div>
  );
}
