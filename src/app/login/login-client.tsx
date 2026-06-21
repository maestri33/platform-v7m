"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { OtpInput } from "@/components/ui/otp-input";
import { checkPhone, getErrorMessage, loginOtp } from "@/lib/api";
import { maskBrPhone } from "@/lib/phone";
import { getSession, saveLogin, saveSession } from "@/lib/session";

/** Cooldown to assume right after a successful OTP dispatch (backend uses ~30s). */
const DEFAULT_RESEND_COOLDOWN = 30;

const NO_SESSION =
  "Não encontramos sua sessão. Toque em “Reenviar código” para receber um novo.";

interface LoginClientProps {
  /** OTP cooldown seconds carried over from the check step. */
  initialWait: number;
}

/**
 * OTP verification. "Entrar" -> POST /auth/login {external_id, otp}.
 * "Reenviar código" re-runs /auth/check with the saved phone: a fresh OTP may be
 * sent (otp_sent) or the remaining cooldown comes back (otp_wait) — shown in a modal.
 * NOTE: a resend invalidates the previous code (backend rotates OTPs).
 */
export function LoginClient({ initialWait }: LoginClientProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(initialWait);
  const [phone, setPhone] = useState("");
  const [modal, setModal] = useState<string | null>(
    initialWait > 0 ? "Calma, já te mandei um faz pouquinho." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  // Telefone vem da sessão (não da URL — evita PII na query string).
  useEffect(() => {
    setPhone(getSession()?.phone ?? "");
  }, []);

  async function onLogin() {
    setError(null);
    const externalId = getSession()?.externalId;
    if (!externalId) {
      setError(NO_SESSION);
      return;
    }
    setBusy(true);
    try {
      const res = await loginOtp(externalId, code);
      saveLogin({ ...res });
      router.push("/painel");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    const savedPhone = phone || getSession()?.phone || "";
    if (!savedPhone) {
      setError(NO_SESSION);
      return;
    }
    setBusy(true);
    try {
      const res = await checkPhone(savedPhone);
      // Refresh the session — external_id may have changed (e.g. re-registration).
      saveSession({ phone: savedPhone, externalId: res.external_id });

      if (res.otp_sent) {
        setSeconds(DEFAULT_RESEND_COOLDOWN);
        setModal("Pronto, mandei um código novo! O anterior não vale mais.");
        setCode("");
      } else if (res.otp_wait && res.otp_wait > 0) {
        setSeconds(res.otp_wait);
        setModal("Calma, já te mandei um faz pouquinho.");
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit ao completar o 6º dígito (trava p/ não disparar 2x; o botão
  // "Entrar" segue como fallback). Erro limpa o código e rearma a trava.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (code.length === 6 && !busy && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onLogin();
    } else if (code.length < 6) {
      autoSubmitted.current = false;
    }
    // onLogin é estável o suficiente para este efeito; só reagimos a code/busy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, busy]);

  return (
    <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_8px_30px_rgba(11,27,59,0.10)] backdrop-blur-xl">
        <Link href="/" className="self-start text-sm font-bold text-brand-blue">
          ← Voltar
        </Link>

        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue-bright text-white shadow-[0_10px_28px_rgba(0,156,59,0.4)]">
          <svg
            className="size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
            <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
          </svg>
        </div>

        <h1 className="text-center text-[26px] font-extrabold text-brand-ink">
          Confirma que é você?
        </h1>
        <p className="text-center text-base leading-relaxed text-brand-muted">
          {phone
            ? `Mandei um código pro WhatsApp ${maskBrPhone(phone)}. É só digitar ele aqui embaixo.`
            : "Mandei um código pro seu WhatsApp. É só digitar ele aqui embaixo."}
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-center text-[15px] font-bold text-brand-ink">Seu código</span>
          <OtpInput length={6} value={code} onChange={setCode} invalid={!!error} />
          <p className="text-center text-[13px] leading-relaxed text-brand-muted">
            Pode digitar, tô te esperando aqui.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-brand-danger bg-brand-danger-bg p-3.5 text-[15px] font-semibold leading-relaxed text-brand-danger"
          >
            {error}
          </div>
        ) : null}

        <Button disabled={code.length < 6 || busy} onClick={onLogin}>
          Entrar
        </Button>
        <Button variant="secondary" disabled={seconds > 0 || busy} onClick={onResend}>
          {seconds > 0 ? `Reenviar em ${seconds}s` : "Reenviar código"}
        </Button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-6 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-ink">
              {seconds > 0 ? "Só um tiquinho" : "Código novo a caminho!"}
            </h2>
            <p className="text-base leading-relaxed text-brand-muted">
              {modal}
              {seconds > 0 ? (
                <>
                  {" "}
                  Dá pra pedir outro em{" "}
                  <span className="font-extrabold text-brand-blue">{seconds}s</span>.
                </>
              ) : null}
            </p>
            <Button onClick={() => setModal(null)}>Entendi</Button>
          </div>
        </div>
      )}

      <LoadingOverlay show={busy} />
    </main>
  );
}
