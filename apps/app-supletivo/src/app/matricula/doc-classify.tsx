"use client";

import { type DocClassify } from "@/lib/api";
import {
  DocumentClassificationFeedback,
  type ClassificationKind,
} from "@v7m/ui";

export type ClassifyAudience = "student" | "promoter";

export type ClassifyVerdict =
  | {
      kind: "accept";
      docType: "rg" | "cnh" | "address_proof";
      completeness: "front" | "back" | "full" | null;
    }
  | { kind: "reject_cnh" }
  | { kind: "not_document" }
  | { kind: "wrong_kind" }
  | { kind: "confirm" };

/** A regra de negócio pura (testável): resultado da IA + público → veredito de UI. */
export function classifyVerdict(
  c: DocClassify,
  audience: ClassifyAudience,
): ClassifyVerdict {
  if (c.is_document === null) return { kind: "confirm" };
  if (c.is_document === false) return { kind: "not_document" };
  if (!c.doc_type) return { kind: "confirm" };
  if (c.doc_type === "address_proof") return { kind: "wrong_kind" };
  if (c.doc_type === "cnh" && audience === "student") return { kind: "reject_cnh" };
  return { kind: "accept", docType: c.doc_type, completeness: c.completeness };
}

/**
 * Veredito do passo do COMPROVANTE: a classificação rápida só confere se é
 * MESMO um comprovante de residência antes do envio.
 */
export function proofVerdict(c: DocClassify): ClassifyVerdict {
  if (c.is_document === null) return { kind: "confirm" };
  if (c.is_document === false) return { kind: "not_document" };
  if (c.doc_type === "rg" || c.doc_type === "cnh") return { kind: "wrong_kind" };
  if (c.doc_type === "address_proof")
    return { kind: "accept", docType: "address_proof", completeness: null };
  return { kind: "confirm" };
}

const DOC_LABEL: Record<string, string> = {
  rg: "RG",
  cnh: "CNH",
  address_proof: "comprovante de residência",
};

const COMPLETE_LABEL: Record<string, string> = {
  front: "frente",
  back: "verso",
  full: "documento inteiro",
};

/** Painel do resultado da classificação padronizado no design system @v7m/ui */
export function ClassifyResult({
  verdict,
  onAccept,
  onRetry,
  busy,
}: {
  verdict: ClassifyVerdict;
  onAccept: () => void;
  onRetry: () => void;
  busy?: boolean;
}) {
  const docTypeName =
    verdict.kind === "accept"
      ? (DOC_LABEL[verdict.docType] ?? verdict.docType)
      : undefined;

  const completenessName =
    verdict.kind === "accept" && verdict.completeness
      ? (COMPLETE_LABEL[verdict.completeness] ?? verdict.completeness)
      : null;

  return (
    <DocumentClassificationFeedback
      kind={verdict.kind as ClassificationKind}
      docTypeName={docTypeName}
      completenessName={completenessName}
      onAccept={onAccept}
      onRetry={onRetry}
      busy={busy}
    />
  );
}
