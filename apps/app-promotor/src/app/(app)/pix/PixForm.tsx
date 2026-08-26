"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import { validateCpf } from "@/lib/auth/masks";

/**
 * Sem seletor de tipo: detectamos pelo formato do que foi digitado/colado.
 * 11 dígitos é ambíguo (CPF ou celular) → no submit tenta CPF e, se o DICT
 * reprovar (422 PIX_INVALID), tenta PHONE (+55…). ⚠️ Cada chamada move R$0,01
 * no DICT — submit explícito ÚNICO, nunca validar por tecla; no caso ambíguo
 * são no máximo 2 chamadas.
 */
type DetectedType = "EMAIL" | "EVP" | "CNPJ" | "PHONE" | "CPF" | "AMBIGUOUS";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function detectKeyType(raw: string): DetectedType | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("@")) return "EMAIL";
  if (UUID_RE.test(v)) return "EVP";
  const digits = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) {
    // +55 + DDD + número (10 ou 11 dígitos locais)
    return digits.length >= 12 && digits.length <= 13 ? "PHONE" : null;
  }
  if (/[a-z]/i.test(v)) return null; // letras sem @ não são chave conhecida
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 10) return "PHONE";
  if (digits.length === 11) return "AMBIGUOUS"; // CPF ou celular
  return null;
}

const TYPE_LABELS: Record<DetectedType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular",
  EVP: "Chave aleatória",
  AMBIGUOUS: "CPF ou celular",
};

/** Normaliza pro shape que o DICT espera por tipo. */
function normalizeKey(key: string, type: Exclude<DetectedType, "AMBIGUOUS">): string {
  const v = key.trim();
  if (type === "PHONE") {
    const digits = v.replace(/\D/g, "");
    return v.startsWith("+") ? `+${digits}` : `+55${digits}`;
  }
  if (type === "CPF" || type === "CNPJ") return v.replace(/\D/g, "");
  return v;
}

// Erros roteados por `code` (envelope {detail, code}) — nunca parseando detail.
function pixErrorMessage(code: string | undefined, detail: string | undefined) {
  switch (code) {
    case "PIX_INVALID":
      return "Essa chave não apareceu no seu CPF. Sem estresse: confira se digitou certo — ela precisa ser sua, do mesmo CPF do cadastro.";
    default:
      return detail ?? "Não deu pra validar agora. Tente de novo em instantes.";
  }
}

export function PixForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingLabel, setCheckingLabel] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const detected = detectKeyType(key);

  async function validate(keyType: Exclude<DetectedType, "AMBIGUOUS">) {
    const res = await fetch("/api/me/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: normalizeKey(key, keyType),
        key_type: keyType,
      }),
    });
    const data: { detail?: string; code?: string; expected_status?: string } =
      await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detected || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        let result;
        if (detected === "AMBIGUOUS") {
          // 11 dígitos: se não passam nos DVs do CPF, é celular — pula direto o
          // DICT do CPF (economiza a chamada paga). DV ok → tenta CPF; 422
          // PIX_INVALID → tenta celular. Aprovou = ficou. NÃO bloqueia: celular
          // legítimo nunca passa em validateCpf, então bloquear quebraria PHONE.
          if (validateCpf(key)) {
            setCheckingLabel("Conferindo como celular…");
            result = await validate("PHONE");
          } else {
            setCheckingLabel("Conferindo como CPF e celular…");
            result = await validate("CPF");
            if (!result.ok && result.status === 422 && result.data.code === "PIX_INVALID") {
              result = await validate("PHONE");
            }
          }
        } else if (detected === "CPF") {
          // CPF puro: valida DVs no cliente antes de gastar R$0,01 no DICT.
          const cpfError = validateCpf(key);
          if (cpfError) {
            setError(cpfError);
            return;
          }
          setCheckingLabel(`Conferindo como ${TYPE_LABELS[detected]}…`);
          result = await validate(detected);
        } else {
          setCheckingLabel(`Conferindo como ${TYPE_LABELS[detected]}…`);
          result = await validate(detected);
        }
        if (!result.ok) {
          const redir = wrongStatusHref(result.data.code, result.data.expected_status, "/pix");
          if (redir) {
            router.push(redir);
            return;
          }
          setError(pixErrorMessage(result.data.code, result.data.detail));
          return;
        }
        setSuccess(true);
        // Wizard auto-avançante: chave validada → direto pra selfie.
        router.push(NEXT_STAGE.pix);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      } finally {
        setCheckingLabel(null);
      }
    });
  }

  if (success) {
    return (
      <div className="banner banner-ok" role="status">
        <p className="font-display">Chave validada ✓</p>
        <p className="text-sm mt-1 opacity-90">
          Tudo certo: ela é sua e já está pronta pra receber. Vamos pra próxima etapa.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {pending && <LoadingOverlay label="Validando chave…" logo />}
      <Field
        label="Chave"
        value={key}
        onChange={setKey}
        placeholder="CPF, e-mail, celular ou chave aleatória"
        hint={
          detected
            ? `Detectamos: ${TYPE_LABELS[detected]}`
            : key.trim()
              ? "Não reconhecemos esse formato ainda — confira se digitou certo."
              : "Precisa ser uma chave SUA, do mesmo CPF do cadastro — identificamos o tipo automaticamente."
        }
        required
      />
      {pending && checkingLabel && (
        <p className="flex items-center gap-2 text-sm font-medium text-brand-gold-ink" role="status">
          <span className="spinner" aria-hidden /> {checkingLabel}
        </p>
      )}
      <FieldError>{error}</FieldError>
      <Button

        type="submit"
        size="xl"
        loading={pending}
        disabled={!detected}
        className="w-full"
      >
        {pending ? "Validando…" : "Validar chave"}
      </Button>

      <div className="pt-2 text-center">
        <Link
          href="/painel"
          className="text-xs text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] underline"
        >
          Cadastrar depois e voltar ao painel
        </Link>
      </div>
      <p className="field-hint">
        A conferência é oficial e feita uma única vez, com toda a segurança — por
        isso vale revisar a chave antes de enviar.
      </p>
    </form>
  );
}

