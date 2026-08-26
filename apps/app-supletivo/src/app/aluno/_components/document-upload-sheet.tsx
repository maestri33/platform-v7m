"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/ui/error-box";
import { FileUpload } from "@/components/ui/file-upload";
import {
  ApiError,
  DOCUMENT_HINT,
  DOCUMENT_LABEL,
  type DocumentType,
  getStudentMe,
  isDocSettled,
  postStudentDocument,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/api";
import { compressImage } from "@/lib/image-compression";
import { ackPoll, pollUntil } from "@/lib/poll";
import { toast } from "sonner";

type Phase = "idle" | "uploading" | "analyzing" | "settled";

interface DocumentUploadSheetProps {
  open: boolean;
  docType: DocumentType | null;
  onClose: () => void;
  /** Recebe o StudentMe atualizado depois que o doc settled (approved/rejected/review). */
  onSettled: (next: import("@/lib/api").StudentMe) => void;
}

/**
 * Bottom-sheet pra upload de UM documento. Reusa o FileUpload existente pra
 * captura, faz POST multipart, e pollUntil(getStudentMe, isDocSettled(type)) com
 * os bounds do ack. Em settled, fecha e devolve o StudentMe atualizado pro pai.
 */
export function DocumentUploadSheet({
  open,
  docType,
  onClose,
  onSettled,
}: DocumentUploadSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<"approved" | "rejected" | "review" | null>(null);
  const cancelledRef = useRef(false);

  // Marca a sheet como cancelada quando ela fecha ou troca de doc — guards
  // contra setState em promises que resolvem após unmount. O reset de file/
  // error/etc. acontece naturalmente via remount: o pai passa `openDoc` que
  // alterna entre null e o tipo, desmontando e remontando o componente.
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, [open, docType]);

  if (!open || !docType) return null;

  async function submit() {
    if (!file || !docType) return;
    setError(null);
    setAnalysis(null);
    setPhase("uploading");
    try {
      const compressed = await compressImage(file);
      const ack = await postStudentDocument(docType, compressed);
      setPhase("analyzing");
      const next = await pollUntil(
        getStudentMe,
        isDocSettled(docType),
        ackPoll(ack),
      );
      if (cancelledRef.current) return;
      const settled = next.documents?.find((d) => d.type === docType);
      const status = settled?.validation_status ?? null;
      setFinalStatus(
        status === "approved" || status === "rejected" || status === "review" ? status : null,
      );
      setAnalysis(settled?.analysis_reason ?? null);
      setPhase("settled");
      if (status === "approved") {
        toast.success(`${DOCUMENT_LABEL[docType]} validado com sucesso!`);
        onSettled(next);
        onClose();
      } else if (status === "rejected") {
        toast.error(`Atenção: ${DOCUMENT_LABEL[docType]} precisa de ajuste.`);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.expectedStatus) {
        // O pai trata — re-bubble via prop chain.
        onClose();
        return;
      }
      setPhase("idle");
      setError(getErrorMessage(e));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Enviar ${DOCUMENT_LABEL[docType]}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/55 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "uploading" && phase !== "analyzing") onClose();
      }}
    >
      <div className="sheet-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-brand-ink">
            {DOCUMENT_LABEL[docType]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "uploading" || phase === "analyzing"}
            className="text-[15px] font-bold text-brand-muted transition hover:text-brand-ink disabled:opacity-30"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>

        {phase === "uploading" || phase === "analyzing" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="size-10 animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue" />
            <p className="text-base font-semibold text-brand-ink">
              {phase === "uploading" ? "Enviando foto…" : "Conferindo seu documento…"}
            </p>
            <p className="text-[14px] leading-relaxed text-brand-muted">
              {phase === "analyzing"
                ? "Nossa verificação está lendo o documento. Leva alguns segundos."
                : null}
            </p>
          </div>
        ) : phase === "settled" && finalStatus === "rejected" ? (
          <div className="flex flex-col gap-4">
            <ErrorBox message={analysis ?? "A foto não passou. Envie outra, nítida e sem reflexo."} />
            <FileUpload
              label="Tire outra foto"
              capture="environment"
              file={file}
              onChange={setFile}
              hint={DOCUMENT_HINT[docType]}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={!file}>
                Reenviar
              </Button>
            </div>
          </div>
        ) : phase === "settled" && finalStatus === "review" ? (
          <div className="flex flex-col gap-4">
            <p className="text-[15px] leading-relaxed text-brand-muted">
              {analysis ??
                "Seu documento está em análise pelo polo. Avisaremos assim que for liberado."}
            </p>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] leading-relaxed text-brand-muted">
              Tire uma foto nítida, sem cortes nem reflexo. Quanto melhor a foto, mais rápida a
              aprovação.
            </p>
            <FileUpload
              label={`Foto do ${DOCUMENT_LABEL[docType]}`}
              capture="environment"
              file={file}
              onChange={setFile}
              hint={DOCUMENT_HINT[docType]}
            />
            <ErrorBox message={error} />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={!file}>
                Enviar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
