"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import {
  DOCUMENT_LABEL,
  type DocumentType,
  type StudentDocument,
  docValidationReason,
  docValidationStatus,
} from "@/lib/api";

import { StatusBadge } from "./status-badge";

interface DocumentCardProps {
  doc: StudentDocument;
  /** Disable the action button while a sibling upload is in-flight. */
  busy?: boolean;
  onUpload: (type: DocumentType) => void;
}

/**
 * Card por documento: label amigável, status, botão de ação. Se `applies=false`
 * (ex.: reservista em mulher), renderiza um card neutro sem botão — o back é a
 * fonte da verdade sobre gênero, e a regra nunca mora no front.
 */
export function DocumentCard({ doc, busy, onUpload }: DocumentCardProps) {
  const status = docValidationStatus(doc);
  const reason = docValidationReason(doc);

  if (!doc.applies) {
    return (
      <Card pad="md" className="flex flex-col gap-2 opacity-70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-brand-ink">{DOCUMENT_LABEL[doc.type]}</p>
            <p className="mt-0.5 text-[13px] text-brand-muted">
              Não se aplica ao seu caso.
            </p>
          </div>
          <StatusBadge status="not_applicable" />
        </div>
      </Card>
    );
  }

  const waiting = status === "pending" || status === "review";
  const cta = status === "rejected" ? "Reenviar foto" : waiting ? "Aguardando análise" : "Enviar foto";

  return (
    <Card pad="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-brand-ink">{DOCUMENT_LABEL[doc.type]}</p>
          {doc.uploaded_at ? (
            <p className="mt-0.5 text-[12px] text-brand-muted">
              Enviado em {formatDate(doc.uploaded_at)}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-brand-muted">Ainda não enviado.</p>
          )}
        </div>
        <StatusBadge status={status ?? "na"} reason={reason} />
      </div>

      {status === "rejected" && reason ? <ErrorBox message={reason} /> : null}

      {status === "approved" ? null : waiting ? (
        <Button variant="secondary" disabled>
          {cta}
        </Button>
      ) : (
        <Button onClick={() => onUpload(doc.type)} disabled={busy}>
          {cta}
        </Button>
      )}
    </Card>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
