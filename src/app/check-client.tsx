"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiplomaFlag } from "@/components/ui/diploma-flag";
import { WisprText } from "@/components/ui/wispr-text";
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
        router.push(withParams("/login", { wait: res.otp_wait ?? 0 }));
        return;
      }

      if (res.whatsapp) {
        // New user -> keep the affiliate ref through the register funnel.
        saveSession({ phone: digits, externalId: null, ref: referral || null });
        if (method) {
          router.push(withParams("/register", { pm: method, ref: referral }));
        } else {
          router.push(withParams("/planos", { ref: referral }));
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
    <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-3 sm:py-10">
      <div className="flex w-full max-w-lg flex-col gap-3 sm:gap-7">
        <div className="pointer-events-none mx-auto w-32 max-w-[52%] sm:w-52">
          <DiplomaFlag />
        </div>
        <header className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <p className="text-xs font-extrabold tracking-[0.15em] text-brand-green-light [text-shadow:0_1px_10px_rgba(2,8,23,0.65)]">
            SUA SEGUNDA CHANCE COMEÇA AQUI
          </p>
          <h1 className="text-[32px] sm:text-[40px] font-extrabold leading-tight text-white [text-shadow:0_2px_14px_rgba(2,8,23,0.7)]">
            <WisprText text="Supletivo" />{" "}
            <WisprText text="Brasil" className="text-brand-green-light" delay={0.12} />
          </h1>
          <div className="flex justify-center gap-1.5">
            <span className="h-1.5 w-7 rounded-full bg-brand-green" />
            <span className="h-1.5 w-7 rounded-full bg-brand-yellow" />
            <span className="h-1.5 w-7 rounded-full bg-brand-blue" />
          </div>
        </header>

        <Card
          as="form"
          pad="sm"
          onSubmit={onSubmit}
          className="flex w-full flex-col items-center gap-4 text-center"
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
              Entrar ou criar cadastro
            </p>
            <h2 className="text-2xl font-extrabold text-brand-ink">Passa seu WhatsApp pra mim?</h2>
            <p className="text-[14px] leading-relaxed text-brand-muted">
              Pode ficar sossegado, ninguém vai te encher de mensagem. É só pra gente te achar —
              afinal, não é todo dia que a gente se encontra, né?
            </p>
          </div>

          <div className="w-full max-w-[270px]">
            <label htmlFor="phone-check" className="sr-only">
              Celular com WhatsApp
            </label>
            <input
              id="phone-check"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={16}
              placeholder="(00) 00000-0000"
              value={phone}
              aria-invalid={!!error}
              onChange={(e) => {
                setPhone(maskBrPhone(e.target.value));
                if (error) setError(null);
              }}
              className={`min-h-[52px] w-full rounded-xl border bg-white/55 px-4 text-center text-xl font-semibold tracking-wide text-brand-ink outline-none backdrop-blur-md transition placeholder:font-normal placeholder:text-brand-muted/70 focus:ring-2 focus:ring-brand-blue-bright/40 ${
                error ? "border-brand-danger" : "border-brand-border focus:border-brand-blue-bright"
              }`}
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="w-full rounded-xl border border-brand-danger bg-brand-danger-bg p-3 text-[14px] font-semibold leading-relaxed text-brand-danger"
            >
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            className="w-full max-w-[270px]"
          >
            Continuar
          </Button>
        </Card>

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
