"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiCollaborators } from "@/lib/api-collaborators";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate-funnel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

type DetectedType = "EMAIL" | "EVP" | "CNPJ" | "PHONE" | "CPF" | "AMBIGUOUS";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function detectKeyType(raw: string): DetectedType | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("@")) return "EMAIL";
  if (UUID_RE.test(v)) return "EVP";
  const digits = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) {
    return digits.length >= 12 && digits.length <= 13 ? "PHONE" : null;
  }
  if (/[a-z]/i.test(v)) return null;
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 10) return "PHONE";
  if (digits.length === 11) return "AMBIGUOUS";
  return null;
}

const TYPE_LABELS: Record<DetectedType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular (+55)",
  EVP: "Chave Aleatória",
  AMBIGUOUS: "CPF ou Celular",
};

function normalizeKey(key: string, type: Exclude<DetectedType, "AMBIGUOUS">): string {
  const v = key.trim();
  if (type === "PHONE") {
    const digits = v.replace(/\D/g, "");
    return v.startsWith("+") ? `+${digits}` : `+55${digits}`;
  }
  if (type === "CPF" || type === "CNPJ") return v.replace(/\D/g, "");
  return v;
}

export function PixForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [key, setKey] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const detected = detectKeyType(key);

  async function validate(keyType: Exclude<DetectedType, "AMBIGUOUS">) {
    return apiCollaborators.setCandidatePix(normalizeKey(key, keyType), keyType);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detected || pending) return;
    setError(null);

    startTransition(async () => {
      try {
        if (detected === "AMBIGUOUS") {
          try {
            await validate("CPF");
          } catch {
            await validate("PHONE");
          }
        } else {
          await validate(detected);
        }

        setSuccess(true);
        setTimeout(() => {
          router.push(NEXT_STAGE.pix);
        }, 1200);
      } catch (err: unknown) {
        const errObj = err as { code?: string; extra?: { expected_status?: string }; message?: string };
        const redirectTo = wrongStatusHref(errObj.code, errObj.extra?.expected_status, "/onboarding/pix");
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }
        setError(errObj.message || "Não foi possível validar a chave Pix. Verifique a titularidade do CPF e tente novamente.");
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center space-y-3">
        <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <h3 className="font-bold text-base text-emerald-800">Chave PIX Validada com Sucesso!</h3>
          <p className="text-xs text-emerald-700 mt-1">
            Sua chave está vinculada para receber suas comissões todas as sextas-feiras. Redirecionando…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Chave PIX de Titularidade Própria
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError(null);
            }}
            placeholder="Digite CPF, e-mail, celular ou chave aleatória"
            className="w-full rounded-xl border border-brand-border bg-white pl-10 pr-3.5 py-3 text-sm font-medium text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
          <KeyRound className="size-4 text-brand-muted absolute left-3.5 top-3.5" />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-brand-muted">
            {detected ? `Tipo detectado: ${TYPE_LABELS[detected]}` : "Identificamos o tipo automaticamente"}
          </span>
          {detected && (
            <span className="font-semibold text-emerald-600">Formato Válido ✓</span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!detected || pending}
        className="w-full"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <Spinner />
            <span>Validando chave no Banco Central…</span>
          </span>
        ) : (
          <span>Vincular e Validar Chave PIX</span>
        )}
      </Button>

      <div className="pt-2 flex justify-between items-center text-xs">
        <Link
          href="/onboarding"
          className="text-brand-muted hover:text-brand-ink transition underline"
        >
          Voltar ao resumo
        </Link>
        <Link
          href="/vendas"
          className="text-brand-blue font-semibold hover:underline inline-flex items-center gap-1"
        >
          Ir ao Painel de Vendas <ArrowRight className="size-3" />
        </Link>
      </div>
    </form>
  );
}
