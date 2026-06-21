"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { getErrorMessage, registerLead } from "@/lib/api";
import { isValidCpf, maskCpf } from "@/lib/cpf";
import { withParams } from "@/lib/nav";
import type { PaymentMethod } from "@/lib/payment";
import { maskBrPhone, onlyDigits } from "@/lib/phone";
import { getSession, saveCheckout, saveSession } from "@/lib/session";

const INVALID_EMAIL = "Informe um e-mail válido.";
const INVALID_CPF = "CPF inválido. Confira os números digitados.";

interface RegisterClientProps {
  phone: string;
  referral: string;
  method: PaymentMethod | null;
  methodLabel: string | null;
  priceText: string | null;
}

/**
 * Register form. POST /auth/register (flat: phone, email, cpf, ref?, payment_method?).
 * Every client enters the pipeline as a lead. On success the backend emits the OTP,
 * so we route straight to /login for verification.
 */
export function RegisterClient({
  phone,
  referral,
  method,
  methodLabel,
  priceText,
}: RegisterClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const cpfDigits = onlyDigits(cpf);
  const canSubmit = emailOk && cpfDigits.length === 11 && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailOk) {
      setError(INVALID_EMAIL);
      return;
    }
    if (!isValidCpf(cpfDigits)) {
      setError(INVALID_CPF);
      return;
    }
    setLoading(true);
    try {
      const ref = referral || getSession()?.ref || null;
      const res = await registerLead({
        phone,
        email: email.trim(),
        cpf: cpfDigits,
        ref,
        paymentMethod: method,
      });

      // Login is by USER external_id — register's top-level external_id is the LEAD's (≠ user).
      saveSession({ phone, externalId: res.user_external_id ?? null });
      if (res.checkout) saveCheckout({ ...res.checkout });
      router.push(withParams("/login", { phone }));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-[18px] rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_8px_30px_rgba(11,27,59,0.10)] backdrop-blur-xl">
        <Link href="/" className="text-sm font-bold text-brand-blue">
          ← Voltar
        </Link>

        <h1 className="text-[26px] font-extrabold text-brand-ink">Vamos criar seu cadastro</h1>
        <p className="text-base leading-relaxed text-brand-muted">
          É rápido. Depois enviamos um código para confirmar.
        </p>

        {method && methodLabel ? (
          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">
                Forma de pagamento
              </p>
              <p className="text-base font-extrabold text-brand-ink">
                {methodLabel}
                {priceText ? <span className="text-brand-green"> · {priceText}</span> : null}
              </p>
            </div>
            <Link
              href={withParams("/planos", { phone, ref: referral })}
              className="text-sm font-bold text-brand-blue"
            >
              Trocar
            </Link>
          </div>
        ) : null}

        <TextField label="Celular com WhatsApp" value={maskBrPhone(phone)} disabled readOnly />
        <TextField
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          value={email}
          invalid={!!error && !emailOk}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
        />
        <TextField
          label="CPF"
          inputMode="numeric"
          placeholder="000.000.000-00"
          maxLength={14}
          value={cpf}
          invalid={!!error && emailOk}
          onChange={(e) => {
            setCpf(maskCpf(e.target.value));
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
          Criar cadastro
        </Button>
      </form>
    </main>
  );
}
