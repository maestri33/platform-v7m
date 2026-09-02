"use client";

import { useEffect, useState } from "react";

import {
  Button,
  ErrorBox,
  SelectField,
  TextField,
  IdentityDocumentCapture,
  type IdentityUploadMode,
  FeedbackModal,
  InlineSpinner,
} from "@v7m/ui";
import {
  type RgBrief,
  type RgPatchIn,
  type RgSection,
  getEnrollmentRg,
  patchEnrollmentRg,
  postEnrollmentRgPhoto,
  rgAnalysisReason,
  rgAnalysisStatus,
  classifyDocument,
} from "@/lib/api";
import { compressImage } from "@/lib/image-compression";
import { ackPoll, isSettled, pollUntil } from "@/lib/poll";

import { StepProps, handleStepError, MARITAL_OPTIONS } from "./step-types";
/* ============================ Seção 1 — RG ========================== */

const RG_FIELD_LABEL: Record<string, string> = {
  number: "Número do RG",
  issuing_agency: "Órgão emissor",
  issue_date: "Data de emissão",
  mother_name: "Nome da mãe",
  father_name: "Nome do pai",
  birthplace: "Naturalidade",
  marital_status: "Estado civil",
  nationality: "Nacionalidade",
};

/** Read-only row for a field the AI already extracted. */
function ExtractedRow({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-brand-border py-2 last:border-b-0">
      <span className="text-[13px] font-semibold text-brand-muted">{label}</span>
      <span className="text-right text-[15px] font-bold text-brand-ink">
        {value}
        {locked ? (
          <svg
            className="ml-1.5 inline-block size-3 align-[-0.12em] text-brand-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : null}
      </span>
    </div>
  );
}

type RgPhase =
  | "loading"
  | "capture"
  | "analyzing"
  | "approved"
  | "rejected"
  | "review"
  | "timeout";

function rgPhaseFrom(status?: string | null, nextSlot?: string | null): RgPhase {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  // Regra de Ouro UX V7M: NUNCA travar o aluno em telas mortas de "review" ou "timeout" com botões manuais.
  // Se estiver em review (ex: conferência da coordenação), o aluno avança o fluxo normalmente para as próximas etapas
  // e o backend faz a verificação assíncrona em background.
  if (status === "review") return "approved";
  if (nextSlot) return "capture";
  if (status === "pending") return "analyzing";
  return "capture";
}

/**
 * Passo 1 — Documento. Foto primeiro: a IA extrai e valida o RG. POST da foto
 * responde na hora; aqui fazemos polling no GET até a IA decidir.
 */
export function StepRg({
  brief,
  onDone,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
}: StepProps & { brief?: RgBrief | null }) {
  const [phase, setPhase] = useState<RgPhase>("loading");
  const [rg, setRg] = useState<RgSection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  // `error` (rede/status) abre MODAL; `fieldError` (campo obrigatório) fica inline no formulário.
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Reprovação da IA vira MODAL (mostrado uma vez por decisão; fechar = componente pronto de novo).
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);
  // Como o RG vem: "sides" = uma foto por vez (frente valida → pede o verso) · "full" = os dois
  // lados no MESMO arquivo (RG novo em folha A4, PDF do cartório, print dos dois lados juntos).
  const [mode, setMode] = useState<IdentityUploadMode>("sides");
  const [hasFrontSent, setHasFrontSent] = useState(false);
  const [hasBackSent, setHasBackSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const data = await getEnrollmentRg();
        if (cancelled) return;
        setRg(data);
        if (data.photos?.rg_front?.status === "approved" || data.next_slot === "rg_back") {
          setHasFrontSent(true);
        }
        if (data.photos?.rg_back?.status === "approved") {
          setHasBackSent(true);
        }
        const next = rgPhaseFrom(rgAnalysisStatus(data), data.next_slot);
        setPhase(next);
        if (next === "rejected") {
          setRejectedNotice(
            rgAnalysisReason(data) ??
              "A foto não passou na validação. Envie uma nova, nítida e sem reflexo.",
          );
        } else if (next === "analyzing") {
          // Auto poll if mounted while analyzing
          const settled = await pollUntil(
            getEnrollmentRg,
            (d) => isSettled(rgAnalysisStatus(d)) || Boolean(d.next_slot),
            { intervalMs: 1500, deadlineMs: Date.now() + 30_000 },
          );
          if (cancelled) return;
          applySettled(settled);
          if (settled.next_slot) {
            setPhase("capture");
            if (settled.next_slot === "rg_back") {
              setHasFrontSent(true);
            }
          } else if (rgAnalysisStatus(settled) === "approved" || rgAnalysisStatus(settled) === "review") {
            onDone("address");
          }
        }
      } catch {
        if (!cancelled) setPhase(rgPhaseFrom(brief ? rgAnalysisStatus(brief) : null, brief?.next_slot));
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [brief, onDone]);

  function applySettled(data: RgSection) {
    setRg(data);
    if (data.photos?.rg_front?.status === "approved" || data.next_slot === "rg_back") {
      setHasFrontSent(true);
    }
    if (data.photos?.rg_back?.status === "approved") {
      setHasBackSent(true);
    }
    const next = rgPhaseFrom(rgAnalysisStatus(data), data.next_slot);
    setPhase(next);
    if (next === "rejected") {
      setRejectedNotice(
        rgAnalysisReason(data) ??
          "A foto não passou na validação. Envie uma nova, nítida e sem reflexo.",
      );
    }
    if (next === "approved") {
      const seed: Record<string, string> = {};
      for (const f of data.missing_fields ?? []) {
        const cur = (data as Record<string, unknown>)[f];
        seed[f] = typeof cur === "string" ? cur : "";
      }
      if (seed.nationality === "") seed.nationality = "Brasileira";
      setVals(seed);
    }
  }

  function onPickFile(f: File | null) {
    setFile(f);
    setError(null);
  }

  async function uploadAndAnalyze(
    fileToUpload?: File | null,
    uploadMode?: IdentityUploadMode,
    uploadSlot?: string,
  ) {
    const targetFile = fileToUpload || file;
    if (!targetFile) return;
    const activeMode = uploadMode || mode;
    const currentSlot =
      uploadSlot ||
      rg?.next_slot ||
      brief?.next_slot ||
      (activeMode === "full" ? "rg_full" : "rg_front");

    setError(null);
    setBusy(true, "Enviando seu documento…");
    try {
      const apiSlot =
        activeMode === "full"
          ? "full"
          : currentSlot === "rg_back" || currentSlot === "back"
            ? "back"
            : "front";
      const compressed = await compressImage(targetFile);
      const ack = await postEnrollmentRgPhoto(apiSlot, compressed);

      setPhase("analyzing");
      setBusy(false);

      const { intervalMs, deadlineMs } = ackPoll(ack);
      const settled = await pollUntil(
        getEnrollmentRg,
        (d) => isSettled(rgAnalysisStatus(d)) || Boolean(d.next_slot),
        { intervalMs: intervalMs || 1500, deadlineMs },
      );

      applySettled(settled);
      if (settled.next_slot) {
        setPhase("capture");
      } else if (rgAnalysisStatus(settled) === "approved" || rgAnalysisStatus(settled) === "review") {
        onDone("address");
      }
    } catch (e: unknown) {
      setPhase("capture");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmExtracted() {
    setFieldError(null);
    const missing = rg?.missing_fields ?? [];
    if (missing.includes("number") && !vals.number?.trim()) {
      setFieldError("Informe o número do RG para continuar.");
      return;
    }
    setBusy(true, "Salvando seus dados…");
    try {
      if (missing.length) {
        const patch: RgPatchIn = {};
        for (const f of missing) {
          const v = vals[f]?.trim();
          if (v) (patch as Record<string, string>)[f] = v;
        }
        if (Object.keys(patch).length) await patchEnrollmentRg(patch);
      }
      onDone("address");
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true, "Atualizando a situação…");
    try {
      const data = await getEnrollmentRg();
      if (isSettled(rgAnalysisStatus(data))) applySettled(data);
      else {
        setRg(data);
        setPhase("timeout");
      }
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <InlineSpinner className="size-9" />
        <p className="text-base font-semibold text-brand-ink">
          {phase === "loading" ? "Carregando…" : "Lendo seu documento…"}
        </p>
        {phase === "analyzing" ? (
          <p className="text-sm leading-relaxed text-brand-muted">
            Nossa verificação está extraindo os dados do RG. Leva alguns segundos.
          </p>
        ) : null}
      </div>
    );
  }

  if (phase === "approved") {
    const missing = rg?.missing_fields ?? [];
    const shown: Array<[string, string, boolean]> = [];
    if (rg?.name) shown.push(["Nome", rg.name, true]);
    if (rg?.birth_date) shown.push(["Nascimento", rg.birth_date, true]);
    for (const key of Object.keys(RG_FIELD_LABEL)) {
      const v = (rg as Record<string, unknown> | null)?.[key];
      if (typeof v === "string" && v && !missing.includes(key)) {
        shown.push([RG_FIELD_LABEL[key], key === "marital_status" ? maritalLabel(v) : v, false]);
      }
    }
    return (
      <div className="flex flex-col gap-[18px]">
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
          Documento validado
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-bg px-4 py-1">
          {shown.map(([label, value, locked]) => (
            <ExtractedRow key={label} label={label} value={value} locked={locked} />
          ))}
        </div>
        {missing.length ? (
          <>
            <p className="text-[14px] font-semibold leading-relaxed text-brand-muted">
              O RG não traz estes dados. Complete para seguir:
            </p>
            {missing.map((f) =>
              f === "marital_status" ? (
                <SelectField
                  key={f}
                  label={RG_FIELD_LABEL[f] ?? f}
                  options={MARITAL_OPTIONS}
                  value={vals[f] ?? ""}
                  onChange={(e) => setVals((s) => ({ ...s, [f]: e.target.value }))}
                />
              ) : (
                <TextField
                  key={f}
                  label={RG_FIELD_LABEL[f] ?? f}
                  type={f === "issue_date" ? "date" : "text"}
                  inputMode={f === "number" ? "numeric" : undefined}
                  value={vals[f] ?? ""}
                  onChange={(e) => setVals((s) => ({ ...s, [f]: e.target.value }))}
                />
              ),
            )}
          </>
        ) : null}
        <ErrorBox message={fieldError} />
        {error ? (
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
        <Button onClick={confirmExtracted} loading={busy} disabled={busy} className="mt-2 w-full">
          Salvar e continuar
        </Button>
      </div>
    );
  }

  // capture | rejected
  const currentSlot = rg?.next_slot ?? brief?.next_slot ?? null;
  const onBack = mode === "sides" && currentSlot === "rg_back";
  const canPickMode = phase === "capture" && !onBack;

  return (
    <div className="flex flex-col gap-[18px]">
      <IdentityDocumentCapture
        variant="embedded"
        allowedTypes={["rg"]}
        docType="rg"
        mode={mode}
        onModeChange={(m: IdentityUploadMode) => {
          setMode(m);
          onPickFile(null);
        }}
        canChangeMode={canPickMode}
        slot={currentSlot ?? (mode === "full" ? "rg_full" : hasFrontSent ? "rg_back" : "rg_front")}
        hasFrontSent={hasFrontSent || onBack}
        hasBackSent={hasBackSent}
        file={file}
        onFileChange={onPickFile}
        onClassify={async (f) => {
          const c = await classifyDocument(f);
          return c;
        }}
        onSubmit={uploadAndAnalyze}
        isSubmitting={busy}
        showSubmitButton={false}
        error={error}
        onClearError={() => setError(null)}
      />

      {/* Erros em MODAL (fechar = componente resetado pra nova tentativa): */}
      {rejectedNotice ? (
        <FeedbackModal
          title="A foto não passou 😕"
          description={rejectedNotice}
          variant="warning"
          primaryAction={{
            label: "Enviar nova foto",
            onClick: () => setRejectedNotice(null),
          }}
          onClose={() => setRejectedNotice(null)}
        />
      ) : null}
    </div>
  );
}

function maritalLabel(value: string): string {
  return MARITAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
