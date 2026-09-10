"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, Card, BrandDots, ErrorBox, PhoneOtpCard, TextField } from "@v7m/ui";
import { ApiError, checkPhone, getBootstrapStatus, getErrorMessage, loginOtp, loginStaffPassword, NOT_STAFF_CODE } from "@/lib/api";
import { isValidBrPhone, maskBrPhone, onlyDigits } from "@/lib/phone";
import { clearSession, getSession, saveLogin, saveSession } from "@/lib/session";
import { decodeJwtPayload } from "@/lib/auth-context";

/** Cooldown assumido após um dispatch de OTP (backend usa ~30s). */
const DEFAULT_RESEND_COOLDOWN = 30;

const STAFF_DENIED =
  "Esse acesso é restrito ao staff. Sua conta não tem permissão de administrador.";

type AuthMode = "otp" | "password";
type Step = "phone" | "otp";

/**
 * Login do staff: TELEFONE → OTP (padrão) OU Senha Master (contingência).
 * O staff é superuser criado no Django.
 */
export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<AuthMode>("otp");
  const [step, setStep] = useState<Step>("phone");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [passwordIdentifier, setPasswordIdentifier] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [seconds, setSeconds] = useState(0);
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

  // Pré-preenche o telefone se já houver sessão (re-login após denied/expirar).
  useEffect(() => {
    const saved = getSession()?.phone;
    if (saved) setPhone(maskBrPhone(saved));
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  async function onSendOtp() {
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
      saveSession({ phone: digits, externalId: res.external_id, ref: ref || undefined });
      if (res.otp_sent) {
        setSeconds(DEFAULT_RESEND_COOLDOWN);
      } else if (res.otp_wait && res.otp_wait > 0) {
        setSeconds(res.otp_wait);
      }
      setCode("");
      setStep("otp");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onLogin() {
    if (busy) return;
    setError(null);
    const externalId = getSession()?.externalId;
    if (!externalId) {
      setError("Sessão perdida. Volte e informe o telefone de novo.");
      setStep("phone");
      return;
    }
    setBusy(true);
    try {
      const tokens = await loginOtp(externalId, code);
      saveLogin({ ...tokens });
      const payload = decodeJwtPayload(tokens.access_token);
      const roles = payload?.roles || [];
      if (roles.includes("staff") || roles.includes("superuser")) {
        router.replace("/dashboard");
      } else if (roles.includes("coordinator")) {
        router.replace("/hub");
      } else if (roles.includes("promoter")) {
        router.replace("/promoter");
      } else if (roles.includes("candidate")) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    const session = getSession();
    const savedPhone = session?.phone || digits;
    const savedRef = session?.ref || params.get("ref") || params.get("hub");
    if (!savedPhone) {
      setStep("phone");
      return;
    }
    setBusy(true);
    try {
      const res = await checkPhone(savedPhone, savedRef);
      saveSession({ phone: savedPhone, externalId: res.external_id, ref: savedRef || undefined });
      if (res.otp_sent) {
        setSeconds(DEFAULT_RESEND_COOLDOWN);
        setCode("");
      } else if (res.otp_wait && res.otp_wait > 0) {
        setSeconds(res.otp_wait);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onLoginPassword() {
    setError(null);
    if (!passwordIdentifier.trim() || !passwordVal.trim()) {
      setError("Informe seu identificador (e-mail, telefone ou CPF) e a senha.");
      return;
    }
    setBusy(true);
    try {
      const tokens = await loginStaffPassword(passwordIdentifier.trim(), passwordVal.trim());
      saveLogin({ ...tokens });
      router.replace("/dashboard");
    } catch (e: unknown) {
      if (
        e instanceof ApiError &&
        (e.code === NOT_STAFF_CODE || e.status === 403)
      ) {
        clearSession();
        setError(STAFF_DENIED);
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit ao completar o 6º dígito.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (step !== "otp" || mode !== "otp") return;
    if (code.length === 6 && !busy && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onLogin();
    } else if (code.length < 6) {
      autoSubmitted.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, busy, step, mode]);

  if (mode === "otp") {
    return (
      <div className="w-full max-w-md">
        <PhoneOtpCard
          step={step}
          phone={phone}
          onPhoneChange={(val) => {
            setPhone(maskBrPhone(val));
            setError(null);
          }}
          onPhoneSubmit={onSendOtp}
          phoneBusy={busy}
          otp={code}
          onOtpChange={setCode}
          otpBusy={busy}
          resendSeconds={seconds}
          onResend={onResend}
          onBack={() => {
            setStep("phone");
            setError(null);
            setCode("");
          }}
          error={error}
          eyebrow="Portal de Gestão V7M"
          title={step === "phone" ? "Qual é o seu WhatsApp?" : "Confirma que é você?"}
          subtitle={
            step === "phone"
              ? "Promotores, Polos e Administração. Digite seu WhatsApp para entrar."
              : `Enviamos um código de 6 dígitos no WhatsApp ${phone}.`
          }
          footerSlot={
            <div className="pt-2 text-center border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setError(null);
                  setPasswordIdentifier(phone);
                }}
                className="text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
              >
                🔒 WhatsApp sem sinal ou offline?{" "}
                <span className="font-bold text-brand-blue underline">
                  Entrar com Senha Master
                </span>
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <Card className="flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-brand-green" />
          <span className="size-2.5 rounded-full bg-brand-yellow" />
          <span className="size-2.5 rounded-full bg-brand-blue-bright" />
        </span>
        <h1 className="text-center text-2xl font-extrabold text-brand-ink">
          Acesso com Senha Master
        </h1>
        <BrandDots size="sm" center />
        <p className="text-center text-[15px] leading-relaxed text-brand-muted">
          Acesso de contingência do administrador. Entre com seu e-mail/telefone e a senha master configurada no setup.
        </p>
      </div>

      <TextField
        label="E-mail, Telefone ou CPF"
        placeholder="admin@v7m.org ou (11) 99999-9999"
        value={passwordIdentifier}
        onChange={(e) => setPasswordIdentifier(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy) onLoginPassword();
        }}
      />
      <TextField
        label="Senha Master"
        type="password"
        placeholder="••••••••"
        value={passwordVal}
        onChange={(e) => setPasswordVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy) onLoginPassword();
        }}
      />
      <ErrorBox message={error} />
      <Button onClick={onLoginPassword} loading={busy} disabled={!passwordIdentifier.trim() || !passwordVal.trim()}>
        Entrar com Senha Master
      </Button>

      <div className="pt-2 text-center border-t border-brand-border/60">
        <button
          type="button"
          onClick={() => {
            setMode("otp");
            setError(null);
          }}
          className="text-xs font-bold text-brand-blue hover:underline"
        >
          📱 Voltar para Login via WhatsApp OTP
        </button>
      </div>
    </Card>
  );
}
