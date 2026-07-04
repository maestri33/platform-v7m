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
  type AnalysisAck,
  type EducationLevel,
  type EducationOut,
  type RgBrief,
  type RgPatchIn,
  type RgSection,
  getEnrollmentAddress,
  getEnrollmentRg,
  getEnrollmentSelfie,
  getErrorMessage,
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
} from "@/lib/api";
import { isValidCep, maskCep } from "@/lib/cep";
import { fetchCities, fetchUfs, type UfOption } from "@/lib/ibge";
import { onlyDigits } from "@/lib/phone";
import { ackPoll, isSettled, pollUntil } from "@/lib/poll";

import { ContractReveal } from "./contract-reveal";

export interface StepProps {
  /** Advance. Pass the server's new `status` when a mutation returns it (no re-fetch). */
  onDone: (status?: string) => void;
  /** State machine mismatch — parent jumps to the section the server expects. */
  onWrongStatus: (expected: string) => void;
  setBusy: (b: boolean) => void;
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

function rgPhaseFrom(status?: string | null): RgPhase {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "review") return "review";
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
  const [mode, setMode] = useState<"sides" | "full">("sides");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [full, setFull] = useState<File | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEnrollmentRg()
      .then((data) => {
        if (cancelled) return;
        setRg(data);
        setPhase(rgPhaseFrom(rgAnalysisStatus(data)));
      })
      .catch(() => {
        if (!cancelled) setPhase(rgPhaseFrom(brief ? rgAnalysisStatus(brief) : null));
      });
    return () => {
      cancelled = true;
    };
  }, [brief]);

  function applySettled(data: RgSection) {
    setRg(data);
    const next = rgPhaseFrom(rgAnalysisStatus(data));
    setPhase(next);
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

  async function uploadAndAnalyze() {
    setError(null);
    setBusy(true);
    setPhase("analyzing");
    try {
      let ack: AnalysisAck = {};
      if (mode === "full") {
        if (full) ack = await postEnrollmentRgPhoto("full", full);
      } else {
        if (front) ack = await postEnrollmentRgPhoto("front", front);
        if (back) await postEnrollmentRgPhoto("back", back);
      }
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
    } catch (e: unknown) {
      setPhase("capture");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmExtracted() {
    setError(null);
    const missing = rg?.missing_fields ?? [];
    if (missing.includes("number") && !vals.number?.trim()) {
      setError("Informe o número do RG para continuar.");
      return;
    }
    setBusy(true);
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
    setBusy(true);
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
  const ready = mode === "full" ? !!full : !!front;
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
        loading: busy,
        disabled: !ready || busy,
      });
    }
    setFooter(buttons);
    return () => setFooter([]);
  }, [phase, busy, ready, vals, mode, full, front, back]);

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
        <ErrorBox message={error} />
      </div>
    );
  }

  // capture | rejected
  return (
    <div className="flex flex-col gap-[18px]">
      {phase === "rejected" ? (
        <ErrorBox
          message={
            (rg && rgAnalysisReason(rg)) ??
            "A foto não passou na validação. Envie uma nova, nítida e sem reflexo."
          }
        />
      ) : (
        <p className="text-base leading-relaxed text-brand-muted">
          Fotografe seu RG. A leitura é automática — não precisa digitar os dados.
        </p>
      )}

      <div className="flex gap-2 rounded-xl bg-brand-bg p-1">
        <button
          type="button"
          onClick={() => setMode("sides")}
          className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition ${
            mode === "sides" ? "bg-brand-surface text-brand-blue shadow-sm" : "text-brand-muted"
          }`}
        >
          Frente e verso
        </button>
        <button
          type="button"
          onClick={() => setMode("full")}
          className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition ${
            mode === "full" ? "bg-brand-surface text-brand-blue shadow-sm" : "text-brand-muted"
          }`}
        >
          Documento aberto
        </button>
      </div>

      {mode === "full" ? (
        <FileUpload
          label="Foto do RG (documento inteiro)"
          capture="environment"
          file={full}
          onChange={setFull}
          hint="RG aberto, frente e verso visíveis na mesma foto."
        />
      ) : (
        <>
          <FileUpload
            label="Foto do RG — FRENTE"
            capture="environment"
            file={front}
            onChange={setFront}
          />
          <FileUpload
            label="Foto do RG — VERSO (opcional)"
            capture="environment"
            file={back}
            onChange={setBack}
          />
        </>
      )}

      <ErrorBox message={error} />
    </div>
  );
}

function maritalLabel(value: string): string {
  return MARITAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/* ========================== Seção 2 — Endereço ===================== */

const ADDR_ALWAYS_EDITABLE = new Set(["number", "complement"]);

/** Passo 2 — CEP via ViaCEP; `missing_fields` decide o que o cliente preenche. */
export function StepAddress({ onDone, onWrongStatus, setBusy, busy, setFooter }: StepProps) {
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
    setBusy(true);
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
    setBusy(true);
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
        onDone();
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
  const [citiesLoading, setCitiesLoading] = useState(false);
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
  useEffect(() => {
    if (!uf || ibgeDown) return;
    let cancelled = false;
    setCitiesLoading(true);
    fetchCities(uf)
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .catch(() => {
        if (!cancelled) setIbgeDown(true);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
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
    setBusy(true);
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
      <ErrorBox message={error} />
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
  const [error, setError] = useState<string | null>(null);
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
        setPhase(selfiePhaseFrom(selfieAnalysisStatus(s)));
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
    setBusy(true);
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
      setFile(null);
    } catch (e: unknown) {
      setPhase("idle");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      const s = await getEnrollmentSelfie();
      const status = selfieAnalysisStatus(s);
      if (status === "approved") {
        onDoneRef.current();
        return;
      }
      setDescription(selfieAnalysisReason(s));
      setPhase(isSettled(status) ? selfiePhaseFrom(status) : "timeout");
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
        <ErrorBox
          message={
            description ??
            "A foto não passou. Tire outra com o rosto bem visível, sem foto de tela ou papel."
          }
        />
      ) : null}

      <CameraCapture file={file} onCapture={setFile} />
      <ErrorBox message={error} />

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
