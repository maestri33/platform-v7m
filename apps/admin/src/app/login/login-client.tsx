"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandDots } from "@/components/ui/brand-dots";
import { ErrorBox } from "@/components/ui/error-box";
import { OtpInput } from "@/components/ui/otp-input";
import { TextField } from "@/components/ui/text-field";
import { ApiError, checkPhone, getBootstrapStatus, getErrorMessage, loginOtp, loginStaffPassword, registerCandidate, NOT_STAFF_CODE } from "@/lib/api";
import { isValidBrPhone, maskBrPhone, onlyDigits } from "@/lib/phone";
import { isValidCpf, maskCpf } from "@/lib/cpf";
import { clearSession, getSession, saveLogin, saveSession } from "@/lib/session";

/** Cooldown assumido após um dispatch de OTP (backend usa ~30s). */
const DEFAULT_RESEND_COOLDOWN = 30;

const STAFF_DENIED =
  "Esse acesso é restrito ao staff. Sua conta não tem permissão de administrador.";

type AuthMode = "otp" | "password";
type Step = "credentials" | "otp";

/**
 * Portal de Trabalho Único (app.maestri.group):
 * Identificação: CPF + WhatsApp (ou Senha Master para contingência de Staff).
 * Se o usuário não existir -> Cadastra instantaneamente e inicia o onboarding.
 * Se já existir -> Autentica e carrega o painel.
 */
export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<AuthMode>("otp");
  const [step, setStep] = useState<Step>("credentials");
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

  const phoneDigits = onlyDigits(phone);
  const cpfDigits = onlyDigits(cpf);
  const phoneValid = isValidBrPhone(phoneDigits);
  const cpfValid = isValidCpf(cpfDigits);

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

  // Pré-preenche se já houver sessão
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
    if (!cpfValid) {
      setError("Digite um CPF válido.");
      return;
    }
    if (!phoneValid) {
      setError("Digite um telefone WhatsApp válido com DDD.");
      return;
    }
    setBusy(true);
    try {
      // 1. Checa se o usuário já existe na plataforma
      const res = await checkPhone(phoneDigits, cpfDigits);
      if (res.found && res.external_id) {
        saveSession({ phone: phoneDigits, externalId: res.external_id });
        if (res.otp_sent) {
          setSeconds(DEFAULT_RESEND_COOLDOWN);
        } else if (res.otp_wait && res.otp_wait > 0) {
          setSeconds(res.otp_wait);
        }
        setCode("");
        setStep("otp");
      } else {
        // 2. Novo usuário: Cadastra na hora e inicia o processo de promotor
        const created = await registerCandidate({
          cpf: cpfDigits,
          phone: phoneDigits,
        });
        saveSession({ phone: phoneDigits, externalId: created.user_external_id });
        setSeconds(DEFAULT_RESEND_COOLDOWN);
        setCode("");
        setStep("otp");
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onLogin() {
    setError(null);
    const externalId = getSession()?.externalId;
    if (!externalId) {
      setError("Sessão perdida. Volte e informe seus dados novamente.");
      setStep("credentials");
      return;
    }
    setBusy(true);
    try {
      const tokens = await loginOtp(externalId, code);
      saveLogin({ ...tokens });
      router.replace("/vendas");
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
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    const savedPhone = getSession()?.phone || phoneDigits;
    if (!savedPhone) {
      setStep("credentials");
      return;
    }
    setBusy(true);
    try {
      const res = await checkPhone(savedPhone, cpfDigits || undefined);
      if (res.external_id) {
        saveSession({ phone: savedPhone, externalId: res.external_id });
      }
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
      router.replace("/vendas");
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

  return (
    <Card className="flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-brand-green" />
          <span className="size-2.5 rounded-full bg-brand-yellow" />
          <span className="size-2.5 rounded-full bg-brand-blue-bright" />
        </span>
        <h1 className="text-center text-2xl font-extrabold text-brand-ink">
          {mode === "password"
            ? "Acesso com Senha Master"
            : step === "credentials"
              ? "Portal de Trabalho V7M"
              : "Confirme o código"}
        </h1>
        <BrandDots size="sm" center />
        <p className="text-center text-[15px] leading-relaxed text-brand-muted">
          {mode === "password"
            ? "Acesso de contingência do administrador. Entre com seu e-mail/telefone e a senha master configurada no setup."
            : step === "credentials"
              ? "Acesso unificado para Promotores, Coordenadores de Polo e Administradores."
              : "Mandei um código pro WhatsApp da sua conta. Digite ele aqui."}
        </p>
      </div>

      {mode === "password" ? (
        <>
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
              📱 Voltar para Acesso via WhatsApp OTP
            </button>
          </div>
        </>
      ) : step === "credentials" ? (
        <>
          <TextField
            label="CPF"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            invalid={cpf.length > 0 && !cpfValid}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cpfValid && phoneValid && !busy) onSendOtp();
            }}
          />
          <TextField
            label="Telefone / WhatsApp"
            inputMode="numeric"
            autoComplete="off"
            placeholder="(00) 00000-0000"
            value={phone}
            invalid={phone.length > 0 && !phoneValid}
            onChange={(e) => setPhone(maskBrPhone(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cpfValid && phoneValid && !busy) onSendOtp();
            }}
          />
          <ErrorBox message={error} />
          <Button onClick={onSendOtp} loading={busy} disabled={!cpfValid || !phoneValid}>
            Entrar ou Criar Cadastro
          </Button>

          <div className="pt-2 text-center border-t border-brand-border/60">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError(null);
                setPasswordIdentifier(phone || cpf);
              }}
              className="text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
            >
              🔒 WhatsApp sem sinal ou offline? <span className="font-bold text-brand-blue underline">Entrar com Senha Master</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-center text-[15px] font-bold text-brand-ink">Seu código</span>
            <OtpInput length={6} value={code} onChange={setCode} invalid={!!error} disabled={busy} />
          </div>
          <ErrorBox message={error} />
          <Button onClick={onLogin} loading={busy} disabled={code.length < 6}>
            Entrar
          </Button>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setError(null);
                setCode("");
              }}
              className="inline-flex min-h-11 items-center text-sm font-bold text-brand-blue"
            >
              ← Alterar dados
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={seconds > 0 || busy}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-muted underline underline-offset-4 transition hover:text-brand-blue disabled:opacity-50"
            >
              {seconds > 0 ? `Reenviar em ${seconds}s` : "Reenviar código"}
            </button>
          </div>

          <div className="pt-2 text-center border-t border-brand-border/60">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError(null);
                setPasswordIdentifier(phone || cpf);
              }}
              className="text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
            >
              🔒 Não recebeu o código? <span className="font-bold text-brand-blue underline">Entrar com Senha Master</span>
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
