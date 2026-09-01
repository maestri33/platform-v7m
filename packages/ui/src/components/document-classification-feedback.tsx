"use client";

import { Button } from "./button";

export type ClassificationKind =
  | "accept"
  | "reject_cnh"
  | "not_document"
  | "wrong_kind"
  | "confirm";

export interface DocumentClassificationFeedbackProps {
  kind: ClassificationKind;
  docTypeName?: string;
  completenessName?: string | null;
  onAccept: () => void;
  onRetry: () => void;
  busy?: boolean;
  className?: string;
}

export function DocumentClassificationFeedback({
  kind,
  docTypeName,
  completenessName,
  onAccept,
  onRetry,
  busy = false,
  className = "",
}: DocumentClassificationFeedbackProps) {
  if (kind === "accept") {
    const title = docTypeName
      ? `${docTypeName} reconhecido${completenessName ? ` (${completenessName})` : ""}`
      : "Documento reconhecido";

    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="flex items-center gap-2 rounded-xl bg-brand-green-bg px-3.5 py-2.5 text-[14px] font-bold text-brand-green-dark">
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span>{title}</span>
        </div>

        <Button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="w-full"
        >
          {busy ? "Enviando…" : "Continuar com este documento"}
        </Button>

        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="text-center text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
        >
          Trocar foto
        </button>
      </div>
    );
  }

  if (kind === "reject_cnh") {
    return (
      <div className={`flex flex-col gap-3 rounded-2xl border border-brand-red/30 bg-brand-red-bg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-[14px] font-extrabold text-brand-red">
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>CNH não é aceita para matrícula de aluno</span>
        </div>
        <p className="text-[13px] leading-relaxed text-brand-muted">
          A regulamentação do MEC exige obrigatoriamente a apresentação de <strong>RG ou Certidão</strong> para emissão do diploma.
        </p>
        <Button
          type="button"
          onClick={onRetry}
          disabled={busy}
          variant="secondary"
          className="w-full"
        >
          Tirar foto do RG
        </Button>
      </div>
    );
  }

  if (kind === "not_document") {
    return (
      <div className={`flex flex-col gap-3 rounded-2xl border border-brand-amber/30 bg-brand-amber-bg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-[14px] font-extrabold text-brand-amber-dark">
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Não conseguimos ler como documento</span>
        </div>
        <p className="text-[13px] leading-relaxed text-brand-muted">
          A foto parece estar cortada, escura ou sem nitidez nos dados.
        </p>
        <Button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="w-full"
        >
          Tirar outra foto
        </Button>
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="text-center text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
        >
          Enviar mesmo assim (análise da secretaria)
        </button>
      </div>
    );
  }

  if (kind === "wrong_kind") {
    return (
      <div className={`flex flex-col gap-3 rounded-2xl border border-brand-amber/30 bg-brand-amber-bg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-[14px] font-extrabold text-brand-amber-dark">
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Tipo de documento incorreto para este passo</span>
        </div>
        <p className="text-[13px] leading-relaxed text-brand-muted">
          Identificamos um documento diferente do solicitado nesta etapa.
        </p>
        <Button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="w-full"
        >
          Enviar documento correto
        </Button>
      </div>
    );
  }

  // confirm (IA em dúvida)
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm ${className}`}>
      <div className="text-[14px] font-extrabold text-brand-ink">
        Confirme o documento
      </div>
      <p className="text-[13px] leading-relaxed text-brand-muted">
        Nossa IA não teve certeza absoluta da leitura. Se a foto estiver legível, você pode confirmar e continuar.
      </p>
      <Button
        type="button"
        onClick={onAccept}
        disabled={busy}
        className="w-full"
      >
        {busy ? "Enviando…" : "Confirmar e Enviar"}
      </Button>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="text-center text-xs font-semibold text-brand-muted hover:text-brand-ink transition"
      >
        Tirar outra foto
      </button>
    </div>
  );
}
