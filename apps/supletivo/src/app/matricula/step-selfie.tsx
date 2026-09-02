"use client";

import { useEffect, useRef, useState } from "react";

import {
  Button,
  CameraCapture,
  ErrorBox,
  FeedbackModal,
  InlineSpinner,
} from "@v7m/ui";
import {
  ApiError,
  getEnrollmentSelfie,
  getErrorMessage,
  postEnrollmentSelfie,
  selfieAnalysisReason,
  selfieAnalysisStatus,
} from "@/lib/api";
import { compressImage } from "@/lib/image-compression";
import { ackPoll, isSettled, pollUntil } from "@/lib/poll";

import { ContractReveal } from "./contract-reveal";
import { StepProps, handleStepError } from "./step-types";
/* ========================== Seção 4 — Selfie ======================= */

type SelfiePhase = "loading" | "idle" | "analyzing" | "rejected" | "review" | "timeout";

function selfiePhaseFrom(status?: string | null): SelfiePhase {
  if (status === "rejected") return "rejected";
  if (status === "review") return "review";
  if (status === "pending") return "analyzing";
  return "idle";
}

/**
 * Passo 4 — Selfie. É a assinatura da matrícula. IA confere selfie real +
 * biometria contra o rosto do RG. POST responde na hora; polling no GET.
 */
/**
 * Copy da recusa por TENTATIVA (Victor 2026-07-28). A biometria acumula: cada foto nova entra
 * na galeria e a nota do passo vira a melhor já obtida — então a partir da segunda o tom deixa
 * de ser "não passou" e vira "cada foto ajuda", que é o que de fato está acontecendo.
 */
function selfieRetryCopy(attempts: number): string {
  if (attempts <= 1) {
    return "A foto não passou. Tire outra com o rosto bem visível, sem foto de tela ou papel.";
  }
  if (attempts <= 3) {
    return "Ainda não deu — mas cada foto que você manda ajuda a te reconhecer. Tenta de novo num lugar bem iluminado, olhando pra câmera.";
  }
  return "Continuamos tentando com você. Se não der desta vez, o polo confere na mão — sua matrícula não se perde.";
}

export function StepSelfie({
  onDone,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
  previewNoContract = false,
}: StepProps & { previewNoContract?: boolean }) {
  const [phase, setPhase] = useState<SelfiePhase>("loading");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  // `error` (rede/status) abre MODAL; reprovação da IA também (uma vez por decisão).
  const [error, setError] = useState<string | null>(null);
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(!previewNoContract);
  const [accepted, setAccepted] = useState(false);
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);

  function acceptContract() {
    setShowContract(false);
    setAccepted(true);
    setShowAcceptPopup(true);
  }

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // Mount-only: read current selfie state; `onDone` via ref to avoid re-firing.
  useEffect(() => {
    let cancelled = false;
    getEnrollmentSelfie()
      .then((s) => {
        if (cancelled) return;
        if (selfieAnalysisStatus(s) === "approved") {
          onDoneRef.current();
          return;
        }
        setDescription(selfieAnalysisReason(s));
        const st = selfieAnalysisStatus(s);
        setPhase(selfiePhaseFrom(st));
        if (st === "rejected") {
          setRejectedNotice(
            selfieAnalysisReason(s) ??
              selfieRetryCopy((s.attempts ?? 0) + 1),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("idle");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!file) return;
    setError(null);
    setBusy(true, "Analisando sua selfie…");
    setPhase("analyzing");
    try {
      const compressed = await compressImage(file);
      const ack = await postEnrollmentSelfie(compressed);
      const settled = await pollUntil(
        getEnrollmentSelfie,
        (s) => isSettled(selfieAnalysisStatus(s)),
        ackPoll(ack),
      );
      const status = selfieAnalysisStatus(settled);
      if (status === "approved") {
        onDoneRef.current();
        return;
      }
      setDescription(selfieAnalysisReason(settled));
      setPhase(isSettled(status) ? selfiePhaseFrom(status) : "timeout");
      if (status === "rejected") {
        setRejectedNotice(
          selfieAnalysisReason(settled) ?? selfieRetryCopy((settled.attempts ?? 0) + 1),
        );
      }
      setFile(null);
    } catch (e: unknown) {
      setPhase("idle");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true, "Atualizando a situação…");
    try {
      const s = await getEnrollmentSelfie();
      const status = selfieAnalysisStatus(s);
      if (status === "approved" || status === "review") {
        onDoneRef.current();
        return;
      }
      setDescription(selfieAnalysisReason(s));
      setPhase(status === "rejected" ? "rejected" : "idle");
      if (status === "rejected") {
        setRejectedNotice(
          selfieAnalysisReason(s) ??
            selfieRetryCopy((s.attempts ?? 0) + 1),
        );
      }
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  // Sem footer botões manuais — fluxo 100% in-card

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <InlineSpinner className="size-9" />
        <p className="text-base font-semibold text-brand-ink">
          {phase === "loading" ? "Carregando…" : "Conferindo sua foto…"}
        </p>
        {phase === "analyzing" ? (
          <p className="text-sm leading-relaxed text-brand-muted">
            Comparando seu rosto com o documento. Leva alguns segundos.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-extrabold text-brand-ink">Por último, sua selfie</h2>
        <p className="text-[14px] leading-snug text-brand-muted">
          Sua assinatura: olhe pra câmera e capriche no sorriso 🙂
        </p>
      </div>

      {phase === "rejected" ? (
        <p className="text-[14px] font-semibold leading-snug text-brand-danger">
          A última foto não passou — tire outra com o rosto bem visível.
        </p>
      ) : null}

      <CameraCapture file={file} onCapture={setFile} />

      {file ? (
        <Button
          onClick={submit}
          loading={busy}
          disabled={busy || !accepted}
          className="mt-2 w-full"
        >
          Assinar e finalizar matrícula
        </Button>
      ) : null}

      {/* Erros em MODAL (fechar = câmera pronta pra nova tentativa): */}
      {rejectedNotice ? (
        <FeedbackModal
          title="A selfie não passou 😕"
          description={rejectedNotice}
          variant="warning"
          primaryAction={{
            label: "Tirar outra",
            onClick: () => setRejectedNotice(null),
          }}
          onClose={() => setRejectedNotice(null)}
        />
      ) : error ? (
        <FeedbackModal
          title="Ops, não deu certo"
          description={error}
          variant="danger"
          primaryAction={{
            label: "Entendi",
            onClick: () => setError(null),
          }}
          onClose={() => setError(null)}
        />
      ) : null}

      {showContract ? <ContractReveal onAccept={acceptContract} /> : null}

      {showAcceptPopup ? (
        <FeedbackModal
          title="Termos aceitos"
          description="Ao fechar o contrato você declarou estar de acordo com os termos da matrícula. Agora é só registrar sua assinatura digital."
          variant="success"
          primaryAction={{
            label: "Entendi",
            onClick: () => setShowAcceptPopup(false),
          }}
          onClose={() => setShowAcceptPopup(false)}
        />
      ) : null}
    </div>
  );
}