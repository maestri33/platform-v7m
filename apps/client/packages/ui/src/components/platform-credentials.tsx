"use client";

import { useState } from "react";

import { Button } from "./button";
import { ErrorBox } from "./error-box";

interface PlatformCredentialsProps {
  url?: string | null;
  login?: string | null;
  password?: string | null;
  notes?: string | null;
}

/** Copia um valor pro clipboard com feedback "Copiado!" transitório. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível (sem https/permissão) — falha silenciosa */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${label}`}
      className="flex min-h-9 shrink-0 cursor-pointer items-center rounded-lg px-2.5 text-[12px] font-bold text-brand-blue transition hover:bg-brand-blue/10"
    >
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

/**
 * Credenciais da plataforma parceira entregues ao aluno após a liberação.
 * Login/senha com copiar + mostrar/ocultar; o link abre em nova aba.
 * Mesmos dados que o aluno recebe por WhatsApp e e-mail.
 */
export function PlatformCredentials({ url, login, password, notes }: PlatformCredentialsProps) {
  const [show, setShow] = useState(false);
  const hasCreds = !!(login || password);

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        <Button as="a" href={url} target="_blank" rel="noopener noreferrer">
          Abrir plataforma de estudos
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
          </svg>
        </Button>
      ) : null}

      {hasCreds ? (
        <div className="rounded-2xl border border-brand-border bg-brand-bg px-4 py-1">
          {login ? (
            <div className="flex items-center justify-between gap-2 border-b border-brand-border py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-brand-muted">Login</p>
                <p className="truncate text-[15px] font-bold text-brand-ink">{login}</p>
              </div>
              <CopyButton value={login} label="login" />
            </div>
          ) : null}
          {password ? (
            <div className="flex items-center justify-between gap-2 border-b border-brand-border py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-brand-muted">Senha</p>
                <p className="truncate text-[15px] font-bold tracking-wide text-brand-ink">
                  {show ? password : "•".repeat(Math.min(password.length, 10))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-[12px] font-bold text-brand-muted transition hover:bg-brand-muted/10"
                >
                  {show ? "Ocultar" : "Mostrar"}
                </button>
                <CopyButton value={password} label="senha" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {notes ? <ErrorBox tone="neutral" message={notes} /> : null}

      <p className="text-center text-[12px] leading-relaxed text-brand-muted">
        Você também recebeu esses dados por WhatsApp e e-mail.
      </p>
    </div>
  );
}
