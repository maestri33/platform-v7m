"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DiplomaFlag } from "@/components/ui/diploma-flag";
import { WisprText } from "@/components/ui/wispr-text";
import { TextField } from "@/components/ui/text-field";
import { checkPhone, getErrorMessage, isClient } from "@/lib/api";
import { withParams } from "@/lib/nav";
import type { PaymentMethod } from "@/lib/payment";
import { isValidBrPhone, maskBrPhone, onlyDigits } from "@/lib/phone";
import { saveSession } from "@/lib/session";

const STAFF_BLOCKED =
  "Este acesso é exclusivo para alunos. Coordenadores e promotores usam o portal da equipe.";
const NO_WHATSAPP =
  "Não encontramos WhatsApp neste número. Informe um número com WhatsApp ativo para continuar.";
const WHATSAPP_UNVERIFIED =
  "Não foi possível verificar o WhatsApp agora. Tente novamente em instantes.";
const INVALID_PHONE = "Informe o DDD + número (10 ou 11 dígitos).";

interface CheckClientProps {
  /** Affiliate ref from the URL. Kept for new users (register), discarded if found. */
  referral: string;
  /** Pre-selected payment method from the URL, if any. */
  method: PaymentMethod | null;
}

export function CheckClient({ referral, method }: CheckClientProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const digits = onlyDigits(phone);
  const canSubmit = isValidBrPhone(digits) && !loading;

  async function onContinue() {
    setError(null);
    if (!isValidBrPhone(digits)) {
      setError(INVALID_PHONE);
      return;
    }
    setLoading(true);
    try {
      const res = await checkPhone(digits);

      if (res.found) {
        if (!isClient(res.roles)) {
          setError(STAFF_BLOCKED);
          return;
        }
        // Existing user -> login. Affiliate ref is discarded (no re-attribution).
        saveSession({ phone: digits, externalId: res.external_id });
        router.push(withParams("/login", { phone: digits, wait: res.otp_wait ?? 0 }));
        return;
      }

      if (res.whatsapp) {
        // New user -> keep the affiliate ref through the register funnel.
        saveSession({ phone: digits, externalId: null, ref: referral || null });
        if (method) {
          router.push(withParams("/register", { phone: digits, pm: method, ref: referral }));
        } else {
          router.push(withParams("/planos", { phone: digits, ref: referral }));
        }
        return;
      }

      // whatsapp:false = número sem WhatsApp; whatsapp:null = serviço fora do ar (não dá pra afirmar).
      setError(res.whatsapp === false ? NO_WHATSAPP : WHATSAPP_UNVERIFIED);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) onContinue();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-7">
        <div className="pointer-events-none mx-auto w-40 max-w-[52%] sm:w-48">
          <DiplomaFlag />
        </div>
        <header className="flex flex-col gap-3">
          <p className="text-xs font-extrabold tracking-[0.15em] text-brand-green-light">
            SUA SEGUNDA CHANCE COMEÇA AQUI
          </p>
          <h1 className="text-[40px] font-extrabold leading-tight text-white">
            <WisprText text="Supletivo" />{" "}
            <WisprText text="Brasil" className="text-brand-green-light" delay={0.12} />
          </h1>
          <div className="flex gap-1.5">
            <span className="h-1.5 w-7 rounded-full bg-brand-green" />
            <span className="h-1.5 w-7 rounded-full bg-brand-yellow" />
            <span className="h-1.5 w-7 rounded-full bg-brand-blue" />
          </div>
        </header>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-[18px] rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_8px_30px_rgba(11,27,59,0.10)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-extrabold text-brand-ink">Entrar ou criar cadastro</h2>
            <p className="text-base leading-relaxed text-brand-muted">
              Informe seu celular com WhatsApp. A gente identifica seu cadastro e segue do ponto
              certo.
            </p>
          </div>

          <TextField
            label="Celular com WhatsApp"
            placeholder="(00) 00000-0000"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={16}
            value={phone}
            invalid={!!error}
            onChange={(e) => {
              setPhone(maskBrPhone(e.target.value));
              if (error) setError(null);
            }}
          />

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-brand-danger bg-brand-danger-bg p-3.5 text-[15px] font-semibold leading-relaxed text-brand-danger"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" loading={loading} disabled={!canSubmit}>
            Continuar
          </Button>
        </form>

        <p className="text-center text-[13px] leading-relaxed text-white/70">
          Enviaremos um código por WhatsApp ou e-mail para confirmar que é você.
        </p>

        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold text-white/70">
          <li className="flex items-center gap-1.5">
            <svg
              className="size-4 text-brand-green-light"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6l7-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Validade nacional (MEC)
          </li>
          <li className="flex items-center gap-1.5">
            <svg
              className="size-4 text-brand-green-light"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Pagamento seguro
          </li>
          <li className="flex items-center gap-1.5">
            <svg
              className="size-4 text-brand-green-light"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M8 20h8M12 16v4" />
            </svg>
            100% online
          </li>
        </ul>
      </div>
    </main>
  );
}
