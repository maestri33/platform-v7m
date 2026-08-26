"use client";

import { useEffect, useRef, useState } from "react";

import type { FooterButton } from "@/components/ui/wizard-footer";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/ui/camera-capture";
import { ErrorBox } from "@/components/ui/error-box";
import { FileUpload } from "@/components/ui/file-upload";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  ApiError,
  type AnalysisAck,
  type RgBrief,
  type RgPatchIn,
  type RgSection,
  getEnrollmentRg,
  getErrorMessage,
  patchEnrollmentRg,
  postEnrollmentRgPhoto,
  rgAnalysisReason,
  rgAnalysisStatus,
  classifyDocument,
} from "@/lib/api";
import { compressImage } from "@/lib/image-compression";
import { ackPoll, isSettled, pollUntil } from "@/lib/poll";

import { StepErrorModal } from "./step-modal";
import {
  ClassifyResult,
  classifyVerdict,
  type ClassifyVerdict,
} from "./doc-classify";
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
  if (status === "review") return "review";
  // `next_slot` mandado pelo servidor vence o "pending" da SEÇÃO. Com a frente aprovada e o
  // verso faltando, a seção segue `pending` (só fecha quando os dois lados passam) — ler isso
  // como "analisando" prendia a pessoa no spinner e depois no "ainda processando", sem nunca
  // pedir o verso. O servidor só devolve `next_slot` quando não há foto em análise.
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
  // Classificação RÁPIDA (IA→OmniRoute) da foto ANTES de enviar: reconhece o tipo e escolhe o
  // aviso certo (é CNH? não é doc? confirma?). `verdict` null = ainda não classificou esta foto.
  const [verdict, setVerdict] = useState<ClassifyVerdict | null>(null);
  const [classifying, setClassifying] = useState(false);
  // Como o RG vem: "sides" = uma foto por vez (frente valida → pede o verso) · "full" = os dois
  // lados no MESMO arquivo (RG novo em folha A4, PDF do cartório, print dos dois lados juntos).
  // O backend já aceitava o slot `full`; só o front não oferecia (Victor 2026-07-28).
  const [mode, setMode] = useState<"sides" | "full">("sides");

  useEffect(() => {
    let cancelled = false;
    getEnrollmentRg()
      .then((data) => {
        if (cancelled) return;
        setRg(data);
        const next = rgPhaseFrom(rgAnalysisStatus(data), data.next_slot);
        setPhase(next);
        if (next === "rejected") {
          setRejectedNotice(
            rgAnalysisReason(data) ??
              "A foto não passou na validação. Envie uma nova, nítida e sem reflexo.",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPhase(rgPhaseFrom(brief ? rgAnalysisStatus(brief) : null, brief?.next_slot));
      });
    return () => {
      cancelled = true;
    };
  }, [brief]);

  function applySettled(data: RgSection) {
    setRg(data);
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

  // Ao escolher a foto: classifica RÁPIDO (IA) e guarda o veredito. Fail-open: se a IA/rede falhar,
  // trata como "confirmar" (a pessoa segue; a validação minuciosa roda no upload de qualquer jeito).
  async function onPickFile(f: File | null) {
    setFile(f);
    setVerdict(null);
    setError(null);
    if (!f) return;
    setClassifying(true);
    try {
      const c = await classifyDocument(f);
      setVerdict(classifyVerdict(c, "student"));
    } catch {
      setVerdict({ kind: "confirm" });
    } finally {
      setClassifying(false);
    }
  }

  // Só pode enviar se o veredito não for bloqueante (CNH/não-doc pedem nova foto).
  const canSubmit = verdict != null && verdict.kind !== "reject_cnh" && verdict.kind !== "not_document";

  async function uploadAndAnalyze() {
    if (!file || !canSubmit) return;
    const slot = rg?.next_slot ?? brief?.next_slot;
    if (!slot) return;

    setError(null);
    setBusy(true, "Lendo seu documento…");
    setPhase("analyzing");
    try {
      const apiSlot = mode === "full" ? "full" : slot === "rg_front" ? "front" : "back";
      const compressed = await compressImage(file);
      const ack = await postEnrollmentRgPhoto(apiSlot, compressed);
      const settled = await pollUntil(
        getEnrollmentRg,
        (d) => isSettled(rgAnalysisStatus(d)),
        ackPoll(ack),
      );
      if (!isSettled(rgAnalysisStatus(settled))) {
        setRg(settled);
        setPhase("timeout");
        return;
      }
      applySettled(settled);
      setFile(null);
      setVerdict(null);
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
      onDone();
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

  // ---- wizard footer buttons ----
  const ready = !!file;
  useEffect(() => {
    const buttons: FooterButton[] = [];
    if (phase === "review" || phase === "timeout") {
      buttons.push({ label: "Atualizar situação", onClick: refresh, loading: busy, variant: "secondary" });
    } else if (phase === "approved") {
      buttons.push({ label: "Continuar", onClick: confirmExtracted, loading: busy, disabled: busy });
    } else if (phase === "capture" || phase === "rejected") {
      buttons.push({
        label: phase === "rejected" ? "Enviar nova foto" : "Enviar e validar",
        onClick: uploadAndAnalyze,
        loading: busy || classifying,
        // só habilita quando classificou e o veredito não é bloqueante (CNH/não-doc pedem nova foto)
        disabled: !ready || busy || classifying || !canSubmit,
      });
    }
    setFooter(buttons);
    return () => setFooter([]);
  }, [phase, busy, ready, vals, file, classifying, verdict]);

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue" />
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

  if (phase === "review") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-brand-ink">Documento em análise</h2>
        <p className="text-base leading-relaxed text-brand-muted">
          {(rg && rgAnalysisReason(rg)) ??
            "Seu documento está em análise pelo polo. Avisaremos assim que for liberado — não é preciso fazer nada agora."}
        </p>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-brand-ink">Ainda processando</h2>
        <p className="text-base leading-relaxed text-brand-muted">
          A leitura do documento está levando mais tempo que o normal. Você pode atualizar
          agora ou aguardar — avisaremos assim que terminar, não precisa ficar nesta tela.
        </p>
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
          <StepErrorModal message={error} onClose={() => setError(null)} />
        ) : null}
      </div>
    );
  }

  // capture | rejected
  const currentSlot = rg?.next_slot ?? brief?.next_slot ?? null;
  const onBack = mode === "sides" && currentSlot === "rg_back";
  // O seletor só faz sentido antes de começar: com a frente já aprovada, trocar de modo
  // jogaria fora o que passou.
  const canPickMode = phase === "capture" && !onBack;
  const slotLabel =
    phase === "rejected"
      ? "Essa não deu — manda outra, nítida e sem reflexo."
      : mode === "full"
        ? "Envie o arquivo com os DOIS lados do seu RG."
        : onBack
          ? "Frente aprovada! Envie o VERSO do seu RG."
          : "Envie a FRENTE do seu RG.";
  // CNH/não-documento bloqueiam o envio → viram MODAL; accept/confirm seguem inline.
  const blockingVerdict =
    verdict && (verdict.kind === "reject_cnh" || verdict.kind === "not_document") ? verdict : null;

  return (
    <div className="flex flex-col gap-[18px]">
      {canPickMode ? (
        <div
          className="flex gap-2 rounded-xl bg-brand-bg p-1"
          role="radiogroup"
          aria-label="Como você vai enviar o RG"
        >
          {(
            [
              ["sides", "Um lado por vez"],
              ["full", "Os dois num arquivo"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value);
                onPickFile(null); // troca de modo = a foto escolhida não serve mais
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-[14px] font-bold transition ${
                mode === value
                  ? "bg-white text-brand-ink shadow-sm"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-base leading-relaxed text-brand-muted">{slotLabel}</p>

      <FileUpload
        label={
          mode === "full"
            ? "RG — frente e verso (foto, imagem ou PDF)"
            : onBack
              ? "Foto do RG — VERSO"
              : "Foto do RG — FRENTE"
        }
        hint="JPG, PNG ou PDF. Dá pra tirar na hora ou escolher do aparelho."
        capture="environment"
        file={file}
        onChange={onPickFile}
      />

      {classifying ? (
        <p className="text-[14px] font-semibold text-brand-muted">Reconhecendo o documento…</p>
      ) : verdict && !blockingVerdict ? (
        <ClassifyResult
          verdict={verdict}
          onAccept={uploadAndAnalyze}
          onRetry={() => onPickFile(null)}
          busy={busy}
        />
      ) : null}

      {/* Erros em MODAL (fechar = componente resetado pra nova tentativa): */}
      {rejectedNotice ? (
        <StepErrorModal
          title="A foto não passou 😕"
          message={rejectedNotice}
          actionLabel="Enviar nova foto"
          onClose={() => setRejectedNotice(null)}
        />
      ) : blockingVerdict ? (
        <StepErrorModal
          title={blockingVerdict.kind === "reject_cnh" ? "Isso parece uma CNH" : "Não achei um documento aí"}
          message={
            blockingVerdict.kind === "reject_cnh"
              ? "Para a matrícula precisamos do seu RG (carteira de identidade) — a CNH não vale aqui. Envie uma foto do RG, por favor."
              : "Não reconhecemos um documento nessa foto. Tire outra nítida, com o RG preenchendo a tela e sem reflexo."
          }
          actionLabel="Enviar outra foto"
          onClose={() => onPickFile(null)}
        />
      ) : error ? (
        <StepErrorModal message={error} onClose={() => setError(null)} />
      ) : null}
    </div>
  );
}

function maritalLabel(value: string): string {
  return MARITAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
