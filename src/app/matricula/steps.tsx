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
  type AddressOut,
  type AddressProofSection,
  type AnalysisAck,
  type EducationLevel,
  type EducationOut,
  type EnrollmentMe,
  type RgBrief,
  type RgPatchIn,
  type RgSection,
  getEnrollmentAddress,
  getEnrollmentMe,
  getEnrollmentRg,
  getEnrollmentSelfie,
  getErrorMessage,
  isAddressProofSettled,
  patchEnrollmentAddress,
  patchEnrollmentRg,
  postEnrollmentCep,
  postEnrollmentEducation,
  postEnrollmentRgPhoto,
  postEnrollmentSelfie,
  rgAnalysisReason,
  rgAnalysisStatus,
  selfieAnalysisReason,
  selfieAnalysisStatus,
  submitAddressProofKinship,
  uploadEnrollmentAddressProof,
} from "@/lib/api";
import { isValidCep, maskCep } from "@/lib/cep";
import { fetchCities, fetchUfs, type UfOption } from "@/lib/ibge";
import { onlyDigits } from "@/lib/phone";
import { ackPoll, isSettled, pollUntil } from "@/lib/poll";
import { classifyDocument } from "@/lib/api";

import { ContractReveal } from "./contract-reveal";
import { StepErrorModal } from "./step-modal";
import {
  ClassifyResult,
  classifyVerdict,
  proofVerdict,
  type ClassifyVerdict,
} from "./doc-classify";
import { KinshipChat } from "./kinship-chat";

export interface StepProps {
  /** Advance. Pass the server's new `status` when a mutation returns it (no re-fetch). */
  onDone: (status?: string) => void;
  /** State machine mismatch — parent jumps to the section the server expects. */
  onWrongStatus: (expected: string) => void;
  /** Liga o véu de carregamento da página; o rótulo diz o que está rolando. */
  setBusy: (b: boolean, label?: string) => void;
  busy: boolean;
  /** Report current action buttons to the fixed wizard footer. */
  setFooter: (buttons: FooterButton[]) => void;
}

/** Shared submit error handling: state-machine errors route, the rest render inline. */
function handleStepError(
  e: unknown,
  onWrongStatus: (expected: string) => void,
  setError: (m: string | null) => void,
) {
  if (e instanceof ApiError && e.expectedStatus) {
    onWrongStatus(e.expectedStatus);
    return;
  }
  setError(getErrorMessage(e));
}

/* "União estável" fora: não é estado civil (regime jurídico ≠ estado civil). */
const MARITAL_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
];

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
      const ack = await postEnrollmentRgPhoto(apiSlot, file);
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

/* ========================== Seção 2 — Endereço ===================== */

const ADDR_ALWAYS_EDITABLE = new Set(["number", "complement"]);

/**
 * Passo 2 — COMPROVANTE-primeiro (Victor 2026-07-28): a foto/arquivo da conta entra ANTES de
 * qualquer digitação — a IA valida, extrai e POPULA o endereço; o formulário vira confirmação
 * (número/complemento/o que o comprovante não trouxe). As duas telas compartilham
 * status="address" no backend; ele só avança pra "education" com endereço completo E
 * comprovante aprovado. Se a extração completar tudo, o form nem aparece (o status já pulou).
 */
export function StepAddress(props: StepProps) {
  const [phase, setPhase] = useState<"proof" | "form">("proof");
  if (phase === "form") return <StepAddressForm {...props} onComplete={() => props.onDone()} />;
  return <StepAddressProof {...props} onApproved={() => setPhase("form")} />;
}

/** Passo 2a — CEP via ViaCEP; `missing_fields` decide o que o cliente preenche. */
function StepAddressForm({
  onComplete,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
}: StepProps & { onComplete: () => void }) {
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<AddressOut | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEnrollmentAddress()
      .then((addr) => {
        if (cancelled || !(addr.cep || addr.zipcode)) return;
        setAddress(addr);
        setCep(maskCep(addr.cep ?? addr.zipcode ?? ""));
        setMissing(addr.missing_fields ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function locked(field: keyof AddressOut): boolean {
    if (ADDR_ALWAYS_EDITABLE.has(field)) return false;
    return !missing.includes(field) && !!address?.[field];
  }

  function set(field: keyof AddressOut, value: string) {
    setAddress((a) => (a ? { ...a, [field]: value } : a));
  }

  async function lookupCep() {
    setError(null);
    setBusy(true, "Buscando seu CEP…");
    try {
      const addr = await postEnrollmentCep(onlyDigits(cep));
      setAddress(addr);
      setMissing(addr.missing_fields ?? []);
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!address) return;
    setError(null);
    setBusy(true, "Salvando seu endereço…");
    try {
      const addr = await patchEnrollmentAddress({
        street: address.street || null,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city: address.city || null,
        state: address.state || null,
      });
      setAddress(addr);
      setMissing(addr.missing_fields ?? []);
      if ((addr.missing_fields ?? []).length === 0) {
        onComplete(); // endereço confirmado — comprovante já aprovado veio ANTES (fluxo 2026-07-28)
        return;
      }
      setError(`Ainda falta preencher: ${addr.missing_fields.map(addrLabel).join(", ")}.`);
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  // ---- wizard footer buttons ----
  useEffect(() => {
    const buttons: FooterButton[] = [];
    if (address) {
      buttons.push({
        label: "Salvar e continuar",
        onClick: submit,
        loading: busy,
        disabled: !address.number || busy,
      });
    }
    setFooter(buttons);
    return () => setFooter([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, busy]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            label="CEP"
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            value={cep}
            onChange={(e) => setCep(maskCep(e.target.value))}
          />
        </div>
        <Button onClick={lookupCep} loading={busy} disabled={!isValidCep(cep) || busy}>
          Buscar
        </Button>
      </div>

      {address ? (
        <>
          <TextField
            label="Rua"
            value={address.street ?? ""}
            disabled={locked("street")}
            onChange={(e) => set("street", e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Número"
              inputMode="numeric"
              value={address.number ?? ""}
              onChange={(e) => set("number", e.target.value)}
            />
            <TextField
              label="Complemento"
              placeholder="Apto, bloco…"
              value={address.complement ?? ""}
              onChange={(e) => set("complement", e.target.value)}
            />
          </div>
          <TextField
            label="Bairro"
            value={address.neighborhood ?? ""}
            disabled={locked("neighborhood")}
            onChange={(e) => set("neighborhood", e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Cidade"
              value={address.city ?? ""}
              disabled={locked("city")}
              onChange={(e) => set("city", e.target.value)}
            />
            <TextField
              label="UF"
              maxLength={2}
              value={address.state ?? ""}
              disabled={locked("state")}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
            />
          </div>
        </>
      ) : null}

      <ErrorBox message={error} />
    </div>
  );
}

const ADDR_LABEL: Record<string, string> = {
  street: "rua",
  number: "número",
  neighborhood: "bairro",
  city: "cidade",
  state: "UF",
};
function addrLabel(field: string): string {
  return ADDR_LABEL[field] ?? field;
}

/* ---- Passo 2b — Comprovante de endereço (obrigatório, validado por IA) ---- */

type ProofPhase =
  | "loading"
  | "capture"
  | "analyzing"
  | "rejected"
  | "review"
  | "needs_kinship"
  | "timeout";

function proofPhaseFrom(status?: string | null): ProofPhase {
  if (status === "rejected") return "rejected";
  if (status === "review") return "review";
  if (status === "needs_kinship") return "needs_kinship";
  if (status === "pending") return "analyzing";
  return "capture"; // sem foto ainda / status desconhecido → capturar
}

/** Spinner artesanal (mesmo do RG/selfie no ar) — sem depender de componente novo. */
function ProofSpinner() {
  return (
    <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue" />
  );
}

/**
 * Comprovante de residência: foto/PDF → IA valida (endereço + titular). Mesmo padrão do RG:
 * o POST responde na hora e fazemos polling no /me até a IA decidir. `approved` avança o wizard;
 * `needs_kinship` pede o parentesco do titular da conta.
 */
function StepAddressProof({
  onDone,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
  onApproved,
}: StepProps & {
  /** Comprovante aprovado mas o endereço ainda tem lacuna → confirma no formulário. */
  onApproved: () => void;
}) {
  const [phase, setPhase] = useState<ProofPhase>("loading");
  const [proof, setProof] = useState<AddressProofSection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // Classificação RÁPIDA antes do envio (Victor 2026-07-28): a IA só confere se é MESMO um
  // comprovante — identidade/não-documento pedem outra foto; a validação de verdade é a async.
  const [verdict, setVerdict] = useState<ClassifyVerdict | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [relation, setRelation] = useState("");
  // `error` (rede/status) abre MODAL; `fieldError` (validação do parentesco) fica inline.
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Reprovação da IA em MODAL (uma vez por decisão; fechar = pronto pra reenviar).
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);

  // Já avançou de "address" → onDone (extração completou tudo). Aprovado mas AINDA em
  // "address" → falta campo no endereço: vai pro formulário confirmar. Senão segue na tela.
  function resolveFrom(me: EnrollmentMe): boolean {
    if (me.status !== "address") {
      onDone(me.status);
      return true;
    }
    if (me.address_proof?.status === "approved") {
      onApproved();
      return true;
    }
    setProof(me.address_proof ?? null);
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    getEnrollmentMe()
      .then((me) => {
        if (cancelled) return;
        if (resolveFrom(me)) return;
        const st = me.address_proof?.status;
        setPhase(proofPhaseFrom(st));
        if (st === "rejected") {
          setRejectedNotice(
            me.address_proof?.reason ??
              "O comprovante não passou na validação. Envie uma conta recente, nítida e com o endereço legível.",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("capture");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Depois de enviar (foto ou parentesco): avança se decidido, senão faz polling até a IA decidir.
  async function settle(me: EnrollmentMe) {
    if (resolveFrom(me)) return;
    setPhase("analyzing");
    const last = await pollUntil(getEnrollmentMe, (m) =>
      isAddressProofSettled(m.address_proof?.status),
    );
    if (resolveFrom(last)) return;
    const st = last.address_proof?.status;
    setPhase(isAddressProofSettled(st) ? proofPhaseFrom(st) : "timeout");
    if (st === "rejected") {
      setRejectedNotice(
        last.address_proof?.reason ??
          "O comprovante não passou na validação. Envie uma conta recente, nítida e com o endereço legível.",
      );
    }
    setFile(null);
  }

  // Fail-open como no RG: IA/rede falhou na classificação → "confirmar" (a pessoa segue; a
  // validação minuciosa roda no upload de qualquer jeito).
  async function onPickProofFile(f: File | null) {
    setFile(f);
    setVerdict(null);
    setError(null);
    if (!f) return;
    setClassifying(true);
    try {
      setVerdict(proofVerdict(await classifyDocument(f)));
    } catch {
      setVerdict({ kind: "confirm" });
    } finally {
      setClassifying(false);
    }
  }

  const canSubmitProof =
    verdict != null && verdict.kind !== "wrong_kind" && verdict.kind !== "not_document";

  async function uploadAndAnalyze() {
    if (!file || !canSubmitProof) return;
    setError(null);
    setBusy(true, "Validando seu comprovante…");
    setPhase("analyzing");
    try {
      await settle(await uploadEnrollmentAddressProof(file));
      setVerdict(null);
    } catch (e: unknown) {
      setPhase("capture");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function submitKinship() {
    if (!relation.trim()) {
      setFieldError("Diga quem é o titular da conta e o parentesco.");
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true, "Registrando o titular…");
    try {
      await settle(await submitAddressProofKinship(relation.trim()));
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true, "Atualizando a situação…");
    setError(null);
    try {
      await settle(await getEnrollmentMe());
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  // ---- wizard footer buttons ----
  useEffect(() => {
    const buttons: FooterButton[] = [];
    if (phase === "review" || phase === "timeout") {
      buttons.push({
        label: "Atualizar situação",
        onClick: refresh,
        loading: busy,
        variant: "secondary",
      });
    } else if (phase === "needs_kinship") {
      // O chat (KinshipChat) conduz e submete via ação da IA — sem botão no footer. Mantém o
      // submitKinship como caminho manual só se `relation` já tiver texto (fallback de acessibilidade).
      if (relation.trim()) {
        buttons.push({
          label: "Confirmar",
          onClick: submitKinship,
          loading: busy,
          disabled: busy,
        });
      }
    } else if (phase === "capture" || phase === "rejected") {
      buttons.push({
        label: phase === "rejected" ? "Enviar novo comprovante" : "Enviar comprovante",
        onClick: uploadAndAnalyze,
        loading: busy || classifying,
        disabled: !file || busy || classifying || !canSubmitProof,
      });
    }
    setFooter(buttons);
    return () => setFooter([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, busy, file, relation, classifying, verdict]);

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <ProofSpinner />
        <p className="text-base font-semibold text-brand-ink">
          {phase === "loading" ? "Carregando…" : "Conferindo seu comprovante…"}
        </p>
        {phase === "analyzing" ? (
          <p className="text-sm leading-relaxed text-brand-muted">
            Estamos validando o endereço e o titular. Leva alguns segundos.
          </p>
        ) : null}
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-brand-ink">Comprovante em análise</h2>
        <p className="text-base leading-relaxed text-brand-muted">
          {proof?.reason ??
            "Seu comprovante está em análise pelo polo. Avisaremos assim que for liberado — não é preciso fazer nada agora."}
        </p>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-brand-ink">Ainda processando</h2>
        <p className="text-base leading-relaxed text-brand-muted">
          A validação do comprovante está levando mais tempo que o normal. Você pode atualizar
          agora ou aguardar — avisaremos assim que terminar, não precisa ficar nesta tela.
        </p>
      </div>
    );
  }

  if (phase === "needs_kinship") {
    // Diálogo conduzido por IA (CopilotKit): a IA conversa e chama `registrarParentesco`, que
    // submete via submitAddressProofKinship. O backend (evaluate_kinship) avalia o fundamento e
    // corrige o português no servidor. `relation` é mantido pro fallback do botão do footer.
    return (
      <div className="flex flex-col gap-[18px]">
        <KinshipChat
          busy={busy}
          kind={proof?.kinship_kind === "confirm" ? "confirm" : "justify"}
          onSubmit={async (rel) => {
            setRelation(rel);
            await settle(await submitAddressProofKinship(rel));
          }}
        />
        <ErrorBox message={fieldError} />
        {error ? <StepErrorModal message={error} onClose={() => setError(null)} /> : null}
      </div>
    );
  }

  // capture | rejected
  return (
    <div className="flex flex-col gap-[18px]">
      <p className="text-base leading-relaxed text-brand-muted">
        {phase === "rejected"
          ? // O motivo público do servidor cobre também o `needs_new_proof` ("de preferência
            // no SEU nome") — a orientação certa vem dele, não daqui.
            (proof?.reason ??
            "O último comprovante não passou — envie outro, recente e com o endereço legível.")
          : "Envie um comprovante de residência — conta de luz, água, internet ou telefone dos últimos 3 meses, com o endereço legível."}
      </p>

      <FileUpload
        label="Comprovante de endereço"
        hint="Foto, imagem ou PDF — conta de luz, água, internet ou telefone."
        file={file}
        onChange={onPickProofFile}
      />

      {classifying ? (
        <p className="text-[14px] font-semibold text-brand-muted">Reconhecendo o documento…</p>
      ) : verdict && verdict.kind !== "wrong_kind" && verdict.kind !== "not_document" ? (
        <ClassifyResult
          verdict={verdict}
          onAccept={uploadAndAnalyze}
          onRetry={() => onPickProofFile(null)}
          busy={busy}
        />
      ) : null}

      {verdict && (verdict.kind === "wrong_kind" || verdict.kind === "not_document") ? (
        <StepErrorModal
          title={
            verdict.kind === "wrong_kind"
              ? "Isso parece um documento de identidade"
              : "Não achei um comprovante aí"
          }
          message={
            verdict.kind === "wrong_kind"
              ? "Aqui é a vez do comprovante de residência — conta de luz, água, internet ou telefone com o seu endereço. O RG você já enviou. 😉"
              : "Não reconhecemos um comprovante nessa foto. Envie uma conta recente, nítida e com o endereço aparecendo."
          }
          actionLabel="Enviar outra foto"
          onClose={() => onPickProofFile(null)}
        />
      ) : null}

      {/* Erros em MODAL (fechar = componente pronto pra reenviar): */}
      {rejectedNotice ? (
        <StepErrorModal
          title="O comprovante não passou 😕"
          message={rejectedNotice}
          actionLabel="Enviar novo comprovante"
          onClose={() => setRejectedNotice(null)}
        />
      ) : error ? (
        <StepErrorModal message={error} onClose={() => setError(null)} />
      ) : null}
    </div>
  );
}

/* ========================== Seção 3 — Estudos ====================== */

const LEVEL_OPTIONS = [
  { value: "fundamental", label: "Ensino Fundamental (antigo primário/ginásio)" },
  { value: "medio", label: "Ensino Médio (antigo colegial / 2º grau)" },
];

const GRADE_MAX: Record<EducationLevel, number> = { fundamental: 9, medio: 3 };

/* Nomenclatura antiga (série) ao lado do ano atual — o público mais velho
 * reconhece "1ª série", não "2º ano". O value continua sendo o número. */
const GRADE_LABELS: Record<EducationLevel, Record<number, string>> = {
  fundamental: {
    1: "1º ano (antigo Pré / alfabetização)",
    2: "2º ano (antiga 1ª série)",
    3: "3º ano (antiga 2ª série)",
    4: "4º ano (antiga 3ª série)",
    5: "5º ano (antiga 4ª série)",
    6: "6º ano (antiga 5ª série)",
    7: "7º ano (antiga 6ª série)",
    8: "8º ano (antiga 7ª série)",
    9: "9º ano (antiga 8ª série)",
  },
  medio: {
    1: "1º ano (antiga 1ª série / 1º colegial)",
    2: "2º ano (antiga 2ª série / 2º colegial)",
    3: "3º ano (antiga 3ª série / 3º colegial)",
  },
};

/* "Terminou a série ou parou no meio?" — para a secretaria o que importa não é
 * concluir o nível (isso se deduz pelo ano), e sim ter fechado aquela série. */
const COMPLETED_OPTIONS = [
  { value: "sim", label: "Sim, terminei essa série" },
  { value: "nao", label: "Não, parei no meio do ano" },
];

/* Último ano estudado: escolha (pode ser aproximada), do ano atual até 1960. */
const YEAR_OPTIONS = Array.from({ length: 2026 - 1960 + 1 }, (_, i) => {
  const y = 2026 - i;
  return { value: String(y), label: String(y) };
});

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
].map((uf) => ({ value: uf, label: uf }));

function gradeOptions(level: EducationLevel | "") {
  if (!level) return [];
  return Array.from({ length: GRADE_MAX[level] }, (_, i) => {
    const n = i + 1;
    return { value: String(n), label: GRADE_LABELS[level][n] };
  });
}

/** Friendly copy for the structured-education 422s (level/grade). */
function educationErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "EDUCATION_LEVEL_INVALID") {
      return "Selecione um nível válido (Fundamental ou Médio).";
    }
    if (e.code === "EDUCATION_GRADE_OUT_OF_RANGE") {
      const min = e.extra?.min;
      const max = e.extra?.max;
      if (typeof min === "number" && typeof max === "number") {
        return `A série precisa estar entre ${min} e ${max} para o nível escolhido.`;
      }
      return "A série não corresponde ao nível escolhido. Confira e tente de novo.";
    }
  }
  return getErrorMessage(e);
}

/** Passo 3 — escolaridade (contrato estruturado: level/grade/completed + escola/cidade/UF). */
export function StepEducation({
  initial,
  onDone,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
}: StepProps & { initial?: EducationOut | null }) {
  const [level, setLevel] = useState<EducationLevel | "">(initial?.level ?? "");
  const [grade, setGrade] = useState(initial?.grade ? String(initial.grade) : "");
  const [completedChoice, setCompletedChoice] = useState<"" | "sim" | "nao">(
    initial?.completed == null ? "" : initial.completed ? "sim" : "nao",
  );
  const [lastSchool, setLastSchool] = useState(initial?.last_school ?? "");
  const [uf, setUf] = useState(initial?.state ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [when, setWhen] = useState(initial?.last_year_when ?? "");
  const [error, setError] = useState<string | null>(null);

  // IBGE: UF -> cidades, com fallback para texto livre se a API estiver fora.
  const [ufs, setUfs] = useState<UfOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesFor, setCitiesFor] = useState<string | null>(null);
  const [ibgeDown, setIbgeDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUfs()
      .then((list) => {
        if (!cancelled) setUfs(list);
      })
      .catch(() => {
        if (!cancelled) setIbgeDown(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Carrega cidades sempre que há UF (cobre também o prefill de initial.state).
  // "Carregando" é derivado: há UF e a lista carregada ainda é de outra UF.
  const citiesLoading = !!uf && !ibgeDown && citiesFor !== uf;
  useEffect(() => {
    if (!uf || ibgeDown) return;
    let cancelled = false;
    fetchCities(uf)
      .then((list) => {
        if (!cancelled) {
          setCities(list);
          setCitiesFor(uf);
        }
      })
      .catch(() => {
        if (!cancelled) setIbgeDown(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uf, ibgeDown]);

  function changeLevel(next: string) {
    setLevel(next as EducationLevel | "");
    setGrade(""); // faixas diferem entre níveis — força nova escolha válida
  }

  function changeUf(next: string) {
    setUf(next);
    setCity(""); // cidade depende da UF
  }

  // Concluiu o 3º ano do Médio = já terminou os estudos → não é caso de supletivo.
  const concluiuMedio = level === "medio" && grade === "3" && completedChoice === "sim";

  const ufOptions = ibgeDown
    ? UF_OPTIONS
    : ufs.map((u) => ({ value: u.sigla, label: u.sigla + " — " + u.nome }));
  const cityOptions = cities.map((c) => ({ value: c, label: c }));

  async function submit() {
    if (!level || !grade || !completedChoice) return;
    setError(null);
    setBusy(true, "Salvando sua escolaridade…");
    try {
      // POST echoes the canonical enrollment header — route by its status, no /me re-fetch.
      const lite = await postEnrollmentEducation({
        level,
        grade: Number(grade),
        completed: completedChoice === "sim",
        last_school: lastSchool.trim(),
        city: city.trim(),
        state: uf,
        last_year_when: when.trim() || null,
      });
      onDone(lite.status);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.expectedStatus) {
        onWrongStatus(e.expectedStatus);
        return;
      }
      setError(educationErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // ---- wizard footer buttons ----
  useEffect(() => {
    const ready =
      !!level && !!grade && !!completedChoice && !!lastSchool.trim() && !!uf && !!city.trim() &&
      !(level === "medio" && grade === "3" && completedChoice === "sim") && !busy;
    setFooter([
      { label: "Salvar e continuar", onClick: submit, loading: busy, disabled: !ready },
    ]);
    return () => setFooter([]);
  }, [level, grade, completedChoice, lastSchool, uf, city, busy, when]);

  return (
    <div className="flex flex-col gap-[18px]">
      <SelectField
        label="Nível de ensino"
        options={LEVEL_OPTIONS}
        value={level}
        onChange={(e) => changeLevel(e.target.value)}
      />

      <SelectField
        label="Até que ano/série você estudou?"
        placeholder={level ? "Selecione…" : "Escolha o nível primeiro"}
        options={gradeOptions(level)}
        value={grade}
        disabled={!level}
        onChange={(e) => setGrade(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <SelectField
          label="Você terminou essa série?"
          options={COMPLETED_OPTIONS}
          value={completedChoice}
          onChange={(e) => setCompletedChoice(e.target.value as "" | "sim" | "nao")}
        />
        <p className="text-[13px] leading-relaxed text-brand-muted">
          Isso é importante para a secretaria de educação.
        </p>
      </div>

      <TextField
        label="Última escola"
        placeholder="Nome da escola"
        value={lastSchool}
        onChange={(e) => setLastSchool(e.target.value)}
      />

      {ibgeDown ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <SelectField
              label="UF"
              placeholder="UF"
              options={UF_OPTIONS}
              value={uf}
              onChange={(e) => changeUf(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <TextField
              label="Cidade da escola"
              placeholder="Ex.: Curitiba"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <>
          <SelectField
            label="UF da escola"
            placeholder={ufs.length ? "Selecione…" : "Carregando estados…"}
            options={ufOptions}
            value={uf}
            disabled={!ufs.length}
            onChange={(e) => changeUf(e.target.value)}
          />
          <SelectField
            label="Cidade da escola"
            placeholder={
              !uf ? "Escolha a UF primeiro" : citiesLoading ? "Carregando cidades…" : "Selecione…"
            }
            options={cityOptions}
            value={city}
            disabled={!uf || citiesLoading || !cities.length}
            onChange={(e) => setCity(e.target.value)}
          />
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <SelectField
          label="Em que ano você estudou por último? (opcional)"
          placeholder="Selecione (pode ser aproximado)"
          options={YEAR_OPTIONS}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <p className="text-[13px] leading-relaxed text-brand-muted">
          Pode ser um ano aproximado.
        </p>
      </div>

      {concluiuMedio ? (
        <div className="rounded-xl border border-brand-blue bg-brand-blue-bg p-3.5 text-[14px] font-semibold leading-relaxed text-brand-ink">
          Você marcou que <strong>concluiu o 3º ano do Ensino Médio</strong> — ou seja, já
          terminou os estudos! O supletivo é para quem ainda <strong>não</strong> concluiu, então
          aqui não há matrícula a fazer. Se na verdade você parou antes de terminar, ajuste a
          resposta em “Você terminou essa série?”.
        </div>
      ) : null}
      {error ? <StepErrorModal message={error} onClose={() => setError(null)} /> : null}
    </div>
  );
}

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
              "A foto não passou. Tire outra com o rosto bem visível, sem foto de tela ou papel.",
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
      const ack = await postEnrollmentSelfie(file);
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
          selfieAnalysisReason(settled) ??
            "A foto não passou. Tire outra com o rosto bem visível, sem foto de tela ou papel.",
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
      if (status === "approved") {
        onDoneRef.current();
        return;
      }
      setDescription(selfieAnalysisReason(s));
      setPhase(isSettled(status) ? selfiePhaseFrom(status) : "timeout");
      if (status === "rejected") {
        setRejectedNotice(
          selfieAnalysisReason(s) ??
            "A foto não passou. Tire outra com o rosto bem visível, sem foto de tela ou papel.",
        );
      }
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  // ---- wizard footer buttons ----
  useEffect(() => {
    const buttons: FooterButton[] = [];
    if (phase === "review" || phase === "timeout") {
      buttons.push({ label: "Atualizar situação", onClick: refresh, loading: busy, variant: "secondary" });
    } else if (phase === "idle" || phase === "rejected") {
      if (file) {
        buttons.push({
          label: "Assinar e finalizar",
          onClick: submit,
          loading: busy,
          disabled: busy || !accepted,
        });
      }
    }
    setFooter(buttons);
    return () => setFooter([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, file, busy, accepted]);

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue" />
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

  if (phase === "review") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-brand-ink">Assinatura em análise</h2>
        <p className="text-base leading-relaxed text-brand-muted">
          {description ??
            "Sua assinatura está em análise pelo polo. Não é preciso fazer nada agora — avisaremos quando for liberada."}
        </p>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-brand-ink">Ainda conferindo</h2>
        <p className="text-base leading-relaxed text-brand-muted">
          A verificação está levando mais tempo que o normal. Você pode atualizar
          agora ou aguardar — avisaremos quando terminar, não precisa ficar nesta tela.
        </p>
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

      {/* Erros em MODAL (fechar = câmera pronta pra nova tentativa): */}
      {rejectedNotice ? (
        <StepErrorModal
          title="A selfie não passou 😕"
          message={rejectedNotice}
          actionLabel="Tirar outra"
          onClose={() => setRejectedNotice(null)}
        />
      ) : error ? (
        <StepErrorModal message={error} onClose={() => setError(null)} />
      ) : null}

      {showContract ? <ContractReveal onAccept={acceptContract} /> : null}

      {showAcceptPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 text-center shadow-xl">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark">
              <svg
                className="size-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h3 className="text-lg font-extrabold text-brand-ink">Termos aceitos</h3>
            <p className="text-[15px] leading-relaxed text-brand-muted">
              Ao fechar o contrato você declarou estar de acordo com os termos da matrícula. Agora
              é só registrar sua assinatura digital.
            </p>
            <Button onClick={() => setShowAcceptPopup(false)}>Entendi</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
