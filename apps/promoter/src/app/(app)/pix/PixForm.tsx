"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import { validateCpf } from "@/lib/auth/masks";

/**
 * Sem seletor de tipo: detectamos pelo formato do que foi digitado/colado.
 * 11 dígitos é ambíguo (CPF ou celular) → perguntamos ao usuário qual tipo
 * validar antes de gastar a chamada no DICT (cada chamada move R$0,01 e
 * valida errado = PIX na chave de outra pessoa). Submit explícito ÚNICO,
 * nunca validar por tecla.
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
  // 11 dígitos podem ser CPF ou celular — não é seguro decidir sozinho, é
  // dinheiro de PIX em jogo. Pede confirmação antes de gastar a chamada no DICT.
  const [awaitingChoice, setAwaitingChoice] = useState(false);

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

  function handleKeyChange(value: string) {
    setKey(value);
    // Editou a chave depois de pedir a escolha? Volta pro estado normal pra
    // não validar dígitos diferentes dos que estão na tela agora.
    if (awaitingChoice) setAwaitingChoice(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detected || pending) return;
    setError(null);
    if (detected === "AMBIGUOUS") {
      // 11 dígitos → pergunta antes de gastar a chamada no DICT. Se validar
      // errado, o PIX cai na chave de outra pessoa.
      setAwaitingChoice(true);
      return;
    }
    startTransition(async () => {
      try {
        let result;
        if (detected === "CPF") {
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
          const redir = wrongStatusHref(result.data.code, result.data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(pixErrorMessage(result.data.code, result.data.detail));
          return;
        }
        setSuccess(true);
        // Wizard auto-avançante: chave validada → direto pra selfie.
        window.location.replace(NEXT_STAGE.pix);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      } finally {
        setCheckingLabel(null);
      }
    });
  }

  function onChooseType(keyType: "CPF" | "PHONE") {
    if (pending) return;
    setAwaitingChoice(false);
    setError(null);
    startTransition(async () => {
      try {
        setCheckingLabel(`Conferindo como ${TYPE_LABELS[keyType]}…`);
        const result = await validate(keyType);
        if (!result.ok) {
          const redir = wrongStatusHref(result.data.code, result.data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(pixErrorMessage(result.data.code, result.data.detail));
          return;
        }
        setSuccess(true);
        // Wizard auto-avançante: chave validada → direto pra selfie.
        window.location.replace(NEXT_STAGE.pix);
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
        onChange={handleKeyChange}
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
      {awaitingChoice ? (
        <div
          className="auth-card space-y-3"
          role="group"
          aria-labelledby="pix-ambiguous-title"
        >
          <p id="pix-ambiguous-title" className="font-display text-base">
            CPF ou celular?
          </p>
          <p className="text-sm text-[var(--surface-text-muted)]">
            Você digitou 11 dígitos. Pra ter certeza de validar a chave certa, me
            diz: você quer conferir como CPF ou como celular?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="xl"
              onClick={() => onChooseType("CPF")}
              className="w-full"
            >
              Como CPF
            </Button>
            <Button
              type="button"
              size="xl"
              variant="ghost"
              onClick={() => onChooseType("PHONE")}
              className="w-full"
            >
              Como celular
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="submit"
          size="xl"
          loading={pending}
          disabled={!detected}
          className="w-full"
        >
          {pending ? "Validando…" : "Validar chave"}
        </Button>
      )}
      <p className="field-hint">
        A conferência é oficial e feita uma única vez, com toda a segurança — por
        isso vale revisar a chave antes de enviar.
      </p>
    </form>
  );
}
