"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
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
  const [phone, setPhone] = useState("");

  // Telefone vem da sessão (não da URL — evita PII na query string).
  useEffect(() => {
    setPhone(getSession()?.phone ?? "");
  }, []);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const cpfDigits = onlyDigits(cpf);
  const canSubmit = emailOk && cpfDigits.length === 11 && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone) {
      setError("Sua sessão expirou. Volte ao início e informe seu número novamente.");
      return;
    }
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
    <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-6 py-4 sm:py-8">
      <Card as="form" pad="sm" onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-4">
        <Link href="/" className="self-start text-sm font-bold text-brand-blue">
          ← Voltar
        </Link>

        <IconBadge>
          <svg
            className="size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="M7 16c0-1.1 1-2 2-2s2 .9 2 2" />
            <path d="M14 10h4M14 13h4" />
          </svg>
        </IconBadge>

        <h1 className="text-center text-[26px] font-extrabold text-brand-ink">
          Agora me conta quem é você
        </h1>
        <div className="mx-auto flex gap-1.5">
          <span className="h-1 w-5 rounded-full bg-brand-green" />
          <span className="h-1 w-5 rounded-full bg-brand-yellow" />
          <span className="h-1 w-5 rounded-full bg-brand-blue-bright" />
        </div>
        <p className="text-center text-base leading-relaxed text-brand-muted">
          É rapidinho — só o e-mail e o CPF. Depois mando um código pra confirmar.
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
              href={withParams("/planos", { ref: referral })}
              className="text-sm font-bold text-brand-blue"
            >
              Trocar
            </Link>
          </div>
        ) : null}

        {phone ? (
          <p className="text-center text-[13px] text-brand-muted">
            WhatsApp confirmado:{" "}
            <span className="font-bold text-brand-ink">{maskBrPhone(phone)}</span>
          </p>
        ) : null}
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
      </Card>
    </main>
  );
}
