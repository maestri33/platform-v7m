"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate } from "motion";

import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { AuthOverlay } from "@/components/auth/AuthShell";
import {
  maskPhone,
  maskCpf,
  validatePhone,
  validateCpf,
  validateEmail,
} from "@/lib/auth/masks";

type CheckOut = {
  found: boolean;
  external_id?: string;
  otp_sent: boolean;
  otp_wait?: number;
  whatsapp?: boolean;
  roles?: string[];
};

const COLLABORATOR_ROLES = new Set(["candidate", "training", "promoter", "coordinator"]);

// Erros do cadastro/entrada roteados por `code` (envelope {detail, code, …}) —
// nunca parseando detail. Copy pt-BR acolhedora, com o caminho de saída.
function authErrorMessage(
  code: string | undefined,
  detail: string | undefined,
  extra?: { retry_after_s?: number },
): string {
  switch (code) {
    case "RATE_LIMITED":
      return `Muitas tentativas seguidas. Respira ${
        extra?.retry_after_s ? `${extra.retry_after_s} segundos` : "um instante"
      } e tente de novo.`;
    case "CPF_EXISTS":
      return "Esse CPF já tem cadastro por aqui — entre com o telefone dele.";
    case "PHONE_EXISTS":
      return "Esse telefone já tem cadastro — volte e entre com ele.";
    case "EMAIL_EXISTS":
      return "Esse e-mail já está em uso — se a conta é sua, entre com o telefone dela.";
    case "CPF_INVALID":
      return "Esse CPF não fechou — confira os números e tente de novo.";
    case "CPF_NOT_FOUND":
      return "Não achamos esse CPF na Receita. Confira os números — precisa ser o seu.";
    case "NO_HUB":
      return "Seu link de convite expirou ou veio incompleto — peça um novo pro coordenador do seu polo.";
    case "OTP_NOT_SENT":
      return "Não conseguimos enviar o código. Confira se esse número tem WhatsApp ativo e tente de novo.";
    case "NOT_IN_FUNNEL":
      return "Seu número existe, mas ainda não está no programa de promotores. Entre pelo link de indicação ou fale com o suporte.";
    case "JOIN_PROFILE_INCOMPLETE":
      return "Seu cadastro anterior está incompleto. Fale com o suporte para confirmar seus dados e liberar o acesso de promotor.";
    default:
      return detail ?? "Não deu pra completar agora. Tente de novo em instantes.";
  }
}

// check → (login | cadastro inline) → otp. Um fluxo só, a partir do telefone.
type Stage = "check" | "register" | "otp";

export function CheckFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("check");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<{ detail: string; code?: string } | null>(null);
  // Erros de validação client-side por campo (blur / após 1º erro).
  const [fieldErr, setFieldErr] = useState<Record<string, string | null>>({});
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const [otpSent, setOtpSent] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [whatsappWarning, setWhatsappWarning] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  // Anima a troca de estágio (opacity + x). Motion respeita reduced-motion via CSS global.
  useEffect(() => {
    if (panelRef.current) {
      animate(
        panelRef.current,
        { opacity: [0, 1], transform: ["translateX(18px)", "translateX(0px)"] },
        { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      );
    }
  }, [stage]);

  // ?ref= = external_id do POLO (hub); o register repassa p/ o candidato cair no polo certo.
  const [hubRef] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("ref");
  });

  function shake(el: HTMLElement | null) {
    if (!el) return;
    el.classList.remove("field-shake");
    void el.offsetWidth; // reflow p/ reiniciar a animação
    el.classList.add("field-shake");
  }

  function restart() {
    setStage("check");
    setOtp("");
    setPhone("");
    setCpf("");
    setEmail("");
    setExternalId(null);
    setError(null);
    setFieldErr({});
    setOtpSent(true);
    setNeedsJoin(false);
    setWhatsappWarning(false);
    setNotice(null);
  }

  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    const cErr = validateCpf(cpf);
    setFieldErr({ cpf: cErr });
    if (cErr) {
      shake(panelRef.current);
      return;
    }
    setError(null);
    setLoading(true);
    const cpfDigits = cpf.replace(/\D/g, "");
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpfDigits }),
      });
      const data: (CheckOut & { registered?: boolean; name?: string; masked_phone?: string }) | { detail: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        const err = data as { detail: string; code?: string; retry_after_s?: number };
        setError({ detail: authErrorMessage(err.code, err.detail, err), code: err.code });
        return;
      }
      const out = data as (CheckOut & { registered?: boolean; name?: string; masked_phone?: string });
      if (out.found || out.registered) {
        setExternalId(out.external_id ?? null);
        setNeedsJoin(
          Array.isArray(out.roles) && !out.roles.some((role) => COLLABORATOR_ROLES.has(role)),
        );
        setResendIn(out.otp_wait ?? 60);
        setOtpSent(out.otp_sent ?? true);
        if (out.masked_phone) {
          setNotice(`Código enviado para o WhatsApp ${out.masked_phone}`);
        }
        setStage("otp");
        return;
      }
      setWhatsappWarning(out.whatsapp !== true);
      setStage("register");
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    const cErr = validateCpf(cpf);
    const eErr = validateEmail(email);
    setFieldErr({ cpf: cErr, email: eErr });
    if (cErr || eErr) {
      shake(panelRef.current);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
          email: email.trim().toLowerCase(),
          ...(hubRef ? { hub: hubRef } : {}),
        }),
      });
      const data: {
        external_id?: string;
        user_external_id?: string;
        otp_sent?: boolean;
        otp_wait?: number;
        detail?: string;
        code?: string;
        retry_after_s?: number;
      } = await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        return;
      }
      setExternalId(data.user_external_id ?? null);
      const sent = data.otp_sent ?? true;
      setResendIn(data.otp_wait ?? (sent ? 60 : 0));
      setOtpSent(sent);
      setNeedsJoin(false);
      setStage("otp");
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendIn > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      const data: CheckOut & { detail?: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        if (data.code === "RATE_LIMITED" && data.retry_after_s) setResendIn(data.retry_after_s);
        return;
      }
      setResendIn(data.otp_wait ?? 60);
      setOtpSent(data.otp_sent ?? true);
      setNotice("Código reenviado pro seu WhatsApp!");
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setResending(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!externalId) return;
    if (otp.length !== 6) {
      setFieldErr({ otp: "O código tem 6 dígitos." });
      shake(panelRef.current);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(needsJoin ? "/api/auth/join" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_id: externalId,
          otp,
          ...(needsJoin && hubRef ? { hub: hubRef } : {}),
        }),
      });
      const data: { ok?: boolean; detail?: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        setFieldErr({ otp: "erro" });
        return;
      }
      // Sucesso → overlay + navegação direta pro painel (sem tela de sucesso).
      setNavigating(true);
      router.push("/painel");
      router.refresh();
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {navigating && <AuthOverlay />}

      {/* Bloco de marca */}
      <div className="text-center mb-5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#f0d493]">
          Sua renda extra começa aqui
        </p>
        <h1 className="mt-2 font-display text-[clamp(24px,6vw,28px)] font-extrabold tracking-[-0.01em] text-white">
          Promotor V7M
        </h1>
        <p className="mt-1 text-[13.5px] text-[#b4b4bb]">Entrar ou criar cadastro</p>
      </div>

      <div className="auth-card" ref={panelRef}>
        {stage === "check" && (
          <form onSubmit={onCheck} className="space-y-4">
            <div className="text-center">
              <h2 className="text-[21px] font-bold text-white">Qual é o seu CPF?</h2>
              <p className="mt-1 text-[14px] leading-relaxed text-[#b4b4bb]">
                Informe seu CPF para acessar seu painel ou criar sua conta de promotor.
              </p>
            </div>
            <div className="gold-divider" />
            <div className="mx-auto max-w-[17.5rem]">
              <label htmlFor="auth-cpf" className="mb-2 block text-[13.5px] font-semibold text-[#e7e4dd]">
                Seu CPF
              </label>
              <div className="relative">
                <input
                  id="auth-cpf"
                  value={cpf}
                  onChange={(e) => {
                    const masked = maskCpf(e.target.value);
                    setCpf(masked);
                    if (fieldErr.cpf) setFieldErr({ cpf: validateCpf(masked) });
                  }}
                  onBlur={() => setFieldErr({ cpf: validateCpf(cpf) })}
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  aria-invalid={!!fieldErr.cpf}
                  autoFocus
                  className="input input-dark text-center text-[16.5px] tabular-nums tracking-[0.03em]"
                />
              </div>
              {fieldErr.cpf && (
                <p role="alert" className="mt-2 text-[13px] text-[#f0a3a3]">{fieldErr.cpf}</p>
              )}
            </div>
            {error && <p role="alert" className="text-center text-[13px] text-[#f0a3a3]">{error.detail}</p>}
            <Button type="submit" size="xl" loading={loading} className="w-full">
              {loading ? "Verificando…" : "Continuar"}
            </Button>
          </form>
        )}

        {stage === "register" && (
          <form onSubmit={onRegister} className="space-y-4">
            <div className="text-center">
              <h2 className="text-[21px] font-bold text-white">Criar cadastro</h2>
              <p className="mt-1 text-[14px] leading-relaxed text-[#b4b4bb]">
                Confirme seu WhatsApp para receber o código e ativar seu cadastro.
              </p>
            </div>
            <div className="gold-divider" />
            <div>
              <span className="mb-2 block text-[13.5px] font-semibold text-[#e7e4dd]">Seu CPF</span>
              <div className="flex items-center gap-2">
                <div className="input input-dark flex-1 text-white/70">{cpf}</div>
                <button type="button" onClick={restart} className="min-h-[44px] px-3 text-[13px] font-semibold text-[#f0d493]">
                  Alterar
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="auth-phone" className="mb-2 block text-[13.5px] font-semibold text-[#e7e4dd]">Telefone (WhatsApp)</label>
              <div className="relative">
                <span className="phone-prefix">+55</span>
                <input
                  id="auth-phone"
                  value={phone}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setPhone(masked);
                    if (fieldErr.phone) setFieldErr({ phone: validatePhone(masked) });
                  }}
                  onBlur={() => setFieldErr({ phone: validatePhone(phone) })}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 98765-4321"
                  aria-invalid={!!fieldErr.phone}
                  className="input input-dark text-center text-[16.5px] tabular-nums tracking-[0.03em] pl-16"
                />
              </div>
              {fieldErr.phone && (
                <p role="alert" className="mt-2 text-[13px] text-[#f0a3a3]">{fieldErr.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-email" className="mb-2 block text-[13.5px] font-semibold text-[#e7e4dd]">E-mail</label>
              <input
                id="auth-email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErr.email) setFieldErr({ ...fieldErr, email: validateEmail(e.target.value) });
                }}
                onBlur={() => setFieldErr({ ...fieldErr, email: validateEmail(email) })}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="voce@email.com"
                aria-invalid={!!fieldErr.email}
                className="input input-dark"
              />
              {fieldErr.email && <p role="alert" className="mt-2 text-[13px] text-[#f0a3a3]">{fieldErr.email}</p>}
            </div>
            {error && <p role="alert" className="text-center text-[13px] text-[#f0a3a3]">{error.detail}</p>}
            <Button type="submit" size="xl" loading={loading} className="w-full">
              {loading ? "Criando…" : "Criar cadastro"}
            </Button>
          </form>
        )}

        {stage === "otp" && (
          <form onSubmit={onLogin} className="space-y-4">
            <div className="text-center">
              <h2 className="text-[21px] font-bold text-white">
                {needsJoin ? "Confirme para criar seu acesso" : "Confirme o código"}
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-[#b4b4bb]">
                {otpSent ? (
                  <>
                    Enviamos um código de 6 dígitos para o WhatsApp{" "}
                    <strong className="text-white">{phone || "seu número"}</strong>.
                  </>
                ) : (
                  "Não conseguimos enviar um código agora. Se você já tem um válido, digite abaixo."
                )}
              </p>
            </div>
            <div className="gold-divider" />
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (fieldErr.otp) setFieldErr({ otp: null });
              }}
              error={!!fieldErr.otp}
              autoFocus
            />
            {(fieldErr.otp || error) && (
              <p role="alert" className="text-center text-[13px] text-[#f0a3a3]">
                {error?.detail ?? "O código tem 6 dígitos."}
              </p>
            )}
            {notice && <p className="text-center text-[13px] text-[#f0d493]">{notice}</p>}
            <Button type="submit" size="xl" loading={loading} className="w-full">
              {loading
                ? needsJoin
                  ? "Criando acesso…"
                  : "Entrando…"
                : needsJoin
                  ? "Confirmar e criar acesso"
                  : "Entrar"}
            </Button>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendIn > 0 || resending}
                className="min-h-[44px] rounded-full border border-[rgb(217_177_90/0.4)] px-4 text-[13px] font-semibold text-[#f0d493] transition-colors hover:bg-[rgb(217_177_90/0.08)] disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {resending ? "Reenviando…" : resendIn > 0 ? `Reenviar código (${resendIn}s)` : "Reenviar código"}
              </button>
              <button
                type="button"
                onClick={restart}
                className="min-h-[44px] px-3 text-[13px] text-[#b4b4bb] transition-colors hover:text-white"
              >
                Outro número
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Selos de confiança */}
      <p className="mt-4 text-center text-[12.5px] text-[rgb(180_180_187/0.75)]">
        Comissão por matrícula
        <span className="text-[rgb(217_177_90/0.55)]"> · </span>
        Recebimento via Pix
        <span className="text-[rgb(217_177_90/0.55)]"> · </span>
        100% online
      </p>
    </>
  );
}
