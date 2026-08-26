"use client";

import { ArrowLeft, ArrowUp, Bot, CheckCircle2, LoaderCircle, Pencil, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";

type Level = "fundamental" | "medio" | "superior";
type EducationStage = "fundamental" | "medio" | "superior";
type Qualification = "graduacao" | "pos_graduacao" | "mestrado" | "doutorado";
type EducationStatus = "completed" | "attending" | "stopped";
type Mode = "assistant" | "manual";

type EducationDraft = {
  stage: EducationStage | null;
  level: Level | null;
  grade: number | null;
  lastCompletedGrade: number | null;
  qualification: Qualification | null;
  lastCompletedQualification: Qualification | "none" | null;
  educationStatus: EducationStatus | null;
  year: string;
  city: string;
  school: string;
};

type EducationMessage = {
  role: "assistant" | "user";
  content: string;
};

type AssistantResponse = {
  reply?: string;
  ready?: boolean;
  detail?: string;
  code?: string;
  draft?: {
    level: Level | null;
    stage?: EducationStage | null;
    grade: number | null;
    last_completed_grade?: number | null;
    qualification?: Qualification | null;
    last_completed_qualification?: Qualification | "none" | null;
    education_status: EducationStatus | null;
    year: number | null;
    city: string;
    school: string;
  };
};

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "v7m-education-draft";
const INITIAL_MESSAGES: EducationMessage[] = [
  {
    role: "assistant",
    content:
      "Qual foi a última série ou ano que você frequentou? Diga também se concluiu ou parou no meio.",
  },
];

const STATUS_OPTIONS: Array<{
  value: EducationStatus;
  label: string;
  hint: string;
}> = [
  {
    value: "completed",
    label: "Concluí essa série/ano",
    hint: "Terminei e fui aprovado nessa etapa.",
  },
  {
    value: "attending",
    label: "Ainda estou cursando",
    hint: "Estou matriculado e estudando agora.",
  },
  {
    value: "stopped",
    label: "Parei antes de terminar",
    hint: "Comecei a série/ano, mas interrompi no meio.",
  },
];

function initialDraft(): EducationDraft {
  return {
    stage: null,
    level: null,
    grade: null,
    lastCompletedGrade: null,
    qualification: null,
    lastCompletedQualification: null,
    educationStatus: null,
    year: "",
    city: "",
    school: "",
  };
}

function stageLabel(stage: EducationStage | null) {
  if (stage === "fundamental") return "Ensino Fundamental";
  if (stage === "medio") return "Ensino Médio";
  if (stage === "superior") return "Ensino Superior";
  return "Não informado";
}

function gradeLabel(level: Level | null, grade: number | null) {
  if (grade === null) return "Não informado";
  if (grade === 0) return "Nenhum ano concluído nessa etapa";
  if (level === "medio") return `${grade}º ano do Ensino Médio`;
  return grade === 9 ? "9º ano / antiga 8ª série" : `${grade}º ano`;
}

const QUALIFICATIONS: Array<{ value: Qualification; label: string }> = [
  { value: "graduacao", label: "Graduação" },
  { value: "pos_graduacao", label: "Pós-graduação" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
];

function qualificationLabel(qualification: Qualification | "none" | null) {
  if (qualification === "none") return "Nenhuma formação superior concluída";
  return QUALIFICATIONS.find((option) => option.value === qualification)?.label ?? "Não informado";
}

function statusLabel(status: EducationStatus | null) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Não informado";
}

function validateDraft(draft: EducationDraft) {
  if (!draft.stage) return "Escolha a etapa mais recente que você frequentou.";
  if (!draft.level) return "Informe a etapa de ensino.";
  if (draft.level === "superior") {
    if (!draft.qualification) return "Informe qual formação superior você frequentou.";
    if (!draft.educationStatus) return "Informe se concluiu, está cursando ou parou no meio.";
    if (draft.lastCompletedQualification === null) {
      return "Informe qual formação superior você realmente concluiu.";
    }
    if (
      draft.educationStatus === "completed" &&
      draft.lastCompletedQualification !== draft.qualification
    ) {
      return "Revise a última formação concluída.";
    }
  } else {
  if (!draft.grade) return "Informe a última série ou ano estudado.";
  if (!draft.educationStatus) return "Informe se concluiu, está cursando ou parou no meio.";
  if (draft.lastCompletedGrade === null) {
    return "Informe qual foi o último ano que você realmente concluiu.";
  }
  if (draft.educationStatus === "completed" && draft.lastCompletedGrade !== draft.grade) {
    return "Revise a última série concluída.";
  }
  if (draft.educationStatus !== "completed" && draft.lastCompletedGrade >= draft.grade) {
    return "O último ano concluído precisa ser anterior ao ano frequentado.";
  }
  }

  const year = Number(draft.year);
  if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR + 1) {
    return `Informe um ano entre 1950 e ${CURRENT_YEAR + 1}.`;
  }
  return null;
}

function StageScene({ stage }: { stage: EducationStage }) {
  return (
    <svg viewBox="0 0 320 190" className="h-full w-full" aria-hidden>
      <rect width="320" height="190" fill="#171714" />
      <circle cx="266" cy="38" r="52" fill="#ffdf00" opacity=".08" />
      {stage === "fundamental" ? (
        <>
          <rect x="24" y="34" width="116" height="82" rx="4" fill="#203c31" />
          <path d="M38 52h84M38 68h58M38 84h72" stroke="#84b6a0" strokeWidth="5" opacity=".65" />
          <circle cx="204" cy="65" r="26" fill="#9b6546" />
          <path d="M178 64c2-30 15-41 31-39 20 2 27 19 22 41-17-2-28-11-35-23-3 10-9 17-18 21Z" fill="#242429" />
          <path d="M162 176c4-59 18-83 45-83 29 0 47 27 51 83Z" fill="#147d50" />
          <rect x="228" y="107" width="55" height="67" rx="13" fill="#012169" />
        </>
      ) : stage === "medio" ? (
        <>
          <rect x="28" y="122" width="264" height="14" rx="4" fill="#795538" />
          <rect x="47" y="76" width="90" height="46" rx="3" fill="#efe8d8" transform="rotate(-5 47 76)" />
          <path d="M60 91h60M58 102h48" stroke="#8a6526" strokeWidth="4" />
          <circle cx="205" cy="62" r="27" fill="#9b6546" />
          <path d="M177 63c3-31 16-42 34-39 18 3 24 21 20 41-18-3-29-12-36-24-3 10-9 17-18 22Z" fill="#242429" />
          <path d="M161 176c4-57 19-81 47-81 29 0 47 28 50 81Z" fill="#012169" />
          <rect x="246" y="52" width="38" height="70" rx="4" fill="#009c3b" />
        </>
      ) : (
        <>
          <circle cx="145" cy="62" r="29" fill="#9b6546" />
          <path d="M115 63c2-32 16-45 35-42 22 3 29 22 24 44-19-2-32-13-39-26-3 11-10 19-20 24Z" fill="#242429" />
          <path d="M91 178c5-61 21-87 56-87 33 0 54 29 57 87Z" fill="#009c3b" />
          <path d="m218 62 54 20-54 20-54-20Z" fill="#012169" />
          <path d="M184 91v28c21 17 49 17 69 0V91" fill="none" stroke="#ffdf00" strokeWidth="5" />
          <rect x="216" y="126" width="70" height="45" rx="3" fill="#f5f4f1" transform="rotate(-4 216 126)" />
          <path d="M232 143h38M232 153h30" stroke="#8a6526" strokeWidth="3" />
        </>
      )}
      <path d="M18 178h284" stroke="#3a3a42" strokeWidth="2" />
    </svg>
  );
}

function FlowBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm font-semibold text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Voltar
    </button>
  );
}

function EducationFields({
  draft,
  onChange,
}: {
  draft: EducationDraft;
  onChange: (next: EducationDraft) => void;
}) {
  type GuidedStep =
    | "stage"
    | "status"
    | "grade"
    | "previous"
    | "earlier"
    | "qualification"
    | "previous-qualification"
    | "earlier-qualification"
    | "details";
  const restoredStep: GuidedStep = draft.year
    ? "details"
    : draft.level === "superior" && draft.lastCompletedQualification !== null
      ? "details"
      : draft.level === "superior" && draft.qualification
        ? "previous-qualification"
        : draft.level === "superior" && draft.educationStatus
          ? "qualification"
    : draft.lastCompletedGrade !== null
      ? "details"
      : draft.grade && draft.educationStatus !== "completed"
        ? "previous"
        : draft.educationStatus
          ? "grade"
          : draft.stage
            ? "status"
            : "stage";
  const [step, setStep] = useState<GuidedStep>(restoredStep);
  const grades = draft.level === "fundamental" ? Array.from({ length: 9 }, (_, index) => index + 1) : [1, 2, 3];
  const yearLabel =
    draft.educationStatus === "attending"
      ? draft.level === "superior"
        ? "Em que ano começou essa formação?"
        : "Em que ano começou essa série?"
      : "Em que ano isso aconteceu?";

  function chooseStage(stage: EducationStage) {
    onChange({
      ...draft,
      stage,
      level: stage,
      grade: null,
      lastCompletedGrade: null,
      qualification: null,
      lastCompletedQualification: null,
      educationStatus: null,
      year: "",
    });
    setStep("status");
  }

  function chooseStageStatus(status: "completed" | "attending" | "stopped") {
    if (draft.level === "superior") {
      onChange({
        ...draft,
        grade: null,
        lastCompletedGrade: null,
        qualification: null,
        lastCompletedQualification: null,
        educationStatus: status,
      });
      setStep("qualification");
      return;
    }
    if (status === "completed") {
      const finalGrade = draft.level === "fundamental" ? 9 : 3;
      onChange({ ...draft, grade: finalGrade, lastCompletedGrade: finalGrade, educationStatus: status });
      setStep("details");
      return;
    }
    onChange({ ...draft, grade: null, lastCompletedGrade: null, educationStatus: status });
    setStep("grade");
  }

  function chooseGrade(grade: number) {
    onChange({ ...draft, grade, lastCompletedGrade: grade === 1 ? 0 : null });
    setStep(grade === 1 ? "details" : "previous");
  }

  function stepBackFromDetails() {
    if (draft.level === "superior") setStep("qualification");
    else if (draft.educationStatus === "completed") setStep("status");
    else setStep("previous");
  }

  function chooseQualification(qualification: Qualification) {
    if (draft.educationStatus === "completed") {
      onChange({ ...draft, qualification, lastCompletedQualification: qualification });
      setStep("details");
      return;
    }
    const index = QUALIFICATIONS.findIndex((option) => option.value === qualification);
    onChange({
      ...draft,
      qualification,
      lastCompletedQualification: index === 0 ? "none" : null,
    });
    setStep(index === 0 ? "details" : "previous-qualification");
  }

  return (
    <div className="space-y-5" aria-live="polite">
      {step === "stage" && (
        <section aria-labelledby="education-stage-title" className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Sua trajetória</p>
            <h2 id="education-stage-title" className="mt-1 font-display text-2xl">Até que etapa você estudou?</h2>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">Escolha a etapa mais recente que você frequentou.</p>
          </div>
          <div className="education-stage-carousel -mx-1 grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto px-1 pb-3 sm:auto-cols-[46%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible">
            {(["fundamental", "medio", "superior"] as const).map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => chooseStage(stage)}
                className="group snap-start overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[#171714] text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              >
                <span className="block aspect-[16/9] overflow-hidden"><StageScene stage={stage} /></span>
                <span className="block border-t border-white/10 px-4 py-4 font-display text-lg text-white">{stageLabel(stage)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "status" && draft.stage && (
        <section className="space-y-4" aria-labelledby="education-status-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Sobre essa etapa</p>
            <h2 id="education-status-title" className="mt-1 font-display text-2xl">Você concluiu o {stageLabel(draft.stage)}?</h2>
          </div>
          <div className="space-y-3">
            <button type="button" onClick={() => chooseStageStatus("completed")} className="choice-card w-full text-left">
              <strong className="block">Sim, concluí essa etapa</strong>
              <span className="mt-1 block text-sm text-[var(--surface-text-muted)]">Terminou o último ano dessa etapa.</span>
            </button>
            <button type="button" onClick={() => chooseStageStatus("attending")} className="choice-card w-full text-left">
              <strong className="block">Ainda estou estudando</strong>
              <span className="mt-1 block text-sm text-[var(--surface-text-muted)]">Está matriculado e cursando agora.</span>
            </button>
            <button type="button" onClick={() => chooseStageStatus("stopped")} className="choice-card w-full text-left">
              <strong className="block">Não, parei durante essa etapa</strong>
              <span className="mt-1 block text-sm text-[var(--surface-text-muted)]">Começou, mas não terminou a etapa.</span>
            </button>
          </div>
          <FlowBack onClick={() => setStep("stage")} />
        </section>
      )}

      {step === "grade" && draft.level && (
        <section className="space-y-4" aria-labelledby="education-grade-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Último ano frequentado</p>
            <h2 id="education-grade-title" className="mt-1 font-display text-2xl">
              {draft.educationStatus === "attending" ? "Qual ano você está cursando?" : "Em qual ano você parou?"}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {grades.map((grade) => (
              <button key={grade} type="button" onClick={() => chooseGrade(grade)} className="choice-card min-h-16 text-center font-semibold">
                {gradeLabel(draft.level, grade)}
              </button>
            ))}
          </div>
          <FlowBack onClick={() => setStep("status")} />
        </section>
      )}

      {step === "previous" && draft.grade && draft.level && (
        <section className="space-y-4" aria-labelledby="education-previous-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Só mais uma confirmação</p>
            <h2 id="education-previous-title" className="mt-1 font-display text-2xl">
              Antes disso, você chegou a concluir o {gradeLabel(draft.level, draft.grade - 1)}?
            </h2>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { onChange({ ...draft, lastCompletedGrade: draft.grade! - 1 }); setStep("details"); }}
              className="choice-card w-full text-left"
            >
              <strong>Sim, concluí</strong>
            </button>
            <button type="button" onClick={() => setStep("earlier")} className="choice-card w-full text-left">
              <strong>Ainda não tinha concluído</strong>
            </button>
          </div>
          <FlowBack onClick={() => setStep("grade")} />
        </section>
      )}

      {step === "earlier" && draft.grade && draft.level && (
        <section className="space-y-4" aria-labelledby="education-earlier-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Último ano realmente concluído</p>
            <h2 id="education-earlier-title" className="mt-1 font-display text-2xl">Qual destes você chegou a concluir?</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: Math.max(0, draft.grade - 1) }, (_, index) => index).reverse().map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => { onChange({ ...draft, lastCompletedGrade: grade }); setStep("details"); }}
                className="choice-card min-h-16 text-center font-semibold"
              >
                {gradeLabel(draft.level, grade)}
              </button>
            ))}
          </div>
          <FlowBack onClick={() => setStep("previous")} />
        </section>
      )}

      {step === "qualification" && draft.level === "superior" && (
        <section className="space-y-4" aria-labelledby="education-qualification-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Formação superior</p>
            <h2 id="education-qualification-title" className="mt-1 font-display text-2xl">
              {draft.educationStatus === "completed"
                ? "Qual foi a formação mais alta que você concluiu?"
                : draft.educationStatus === "attending"
                  ? "Qual formação você está cursando?"
                  : "Em qual formação você parou?"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUALIFICATIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => chooseQualification(option.value)} className="choice-card min-h-16 text-center font-semibold">
                {option.label}
              </button>
            ))}
          </div>
          <FlowBack onClick={() => setStep("status")} />
        </section>
      )}

      {step === "previous-qualification" && draft.qualification && (
        <section className="space-y-4" aria-labelledby="education-previous-qualification-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Só mais uma confirmação</p>
            <h2 id="education-previous-qualification-title" className="mt-1 font-display text-2xl">
              Antes disso, você concluiu {qualificationLabel(QUALIFICATIONS[QUALIFICATIONS.findIndex((option) => option.value === draft.qualification) - 1]?.value ?? "none")}?
            </h2>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                const index = QUALIFICATIONS.findIndex((option) => option.value === draft.qualification);
                onChange({ ...draft, lastCompletedQualification: QUALIFICATIONS[index - 1].value });
                setStep("details");
              }}
              className="choice-card w-full text-left"
            >
              <strong>Sim, concluí</strong>
            </button>
            <button type="button" onClick={() => setStep("earlier-qualification")} className="choice-card w-full text-left">
              <strong>Ainda não tinha concluído</strong>
            </button>
          </div>
          <FlowBack onClick={() => setStep("qualification")} />
        </section>
      )}

      {step === "earlier-qualification" && draft.qualification && (
        <section className="space-y-4" aria-labelledby="education-earlier-qualification-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Última formação concluída</p>
            <h2 id="education-earlier-qualification-title" className="mt-1 font-display text-2xl">Qual destas você realmente concluiu?</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ...QUALIFICATIONS.slice(
                0,
                Math.max(0, QUALIFICATIONS.findIndex((option) => option.value === draft.qualification) - 1),
              ),
              { value: "none" as const, label: "Nenhuma formação superior" },
            ].reverse().map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange({ ...draft, lastCompletedQualification: option.value }); setStep("details"); }}
                className="choice-card min-h-16 text-center font-semibold"
              >
                {option.label}
              </button>
            ))}
          </div>
          <FlowBack onClick={() => setStep("previous-qualification")} />
        </section>
      )}

      {step === "details" && (
        <section className="space-y-4" aria-labelledby="education-details-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Últimos detalhes</p>
            <h2 id="education-details-title" className="mt-1 font-display text-2xl">Quando e onde você estudou?</h2>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
              Confirmado: {draft.level === "superior"
                ? qualificationLabel(draft.lastCompletedQualification)
                : gradeLabel(draft.level, draft.lastCompletedGrade)}.
            </p>
          </div>
          <Field label={yearLabel} type="number" min={1950} max={CURRENT_YEAR + 1} value={draft.year} onChange={(year) => onChange({ ...draft, year })} required />
          <p className="field-hint">Se não lembrar exatamente, informe o ano aproximado.</p>
          <Field label="Cidade onde estudou (opcional)" value={draft.city} onChange={(city) => onChange({ ...draft, city })} />
          <Field label="Nome da escola (opcional)" value={draft.school} onChange={(school) => onChange({ ...draft, school })} />
          <FlowBack onClick={stepBackFromDetails} />
        </section>
      )}
    </div>
  );
}

function EducationReview({ draft, onEdit }: { draft: EducationDraft; onEdit: () => void }) {
  return (
    <div className="space-y-4 rounded-[var(--radius)] border border-brand-gold/40 bg-[var(--surface)] p-4" role="status">
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-gold" />
        <div>
          <p className="font-display text-lg">Confira o que entendemos</p>
          <p className="text-sm text-[var(--surface-text-muted)]">Nada será salvo antes da sua confirmação.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-[var(--surface-text-muted)]">Etapa</dt>
        <dd className="text-right font-medium">{stageLabel(draft.stage)}</dd>
        <dt className="text-[var(--surface-text-muted)]">
          {draft.level === "superior" ? "Formação frequentada" : "Último ano frequentado"}
        </dt>
        <dd className="text-right font-medium">
          {draft.level === "superior" ? qualificationLabel(draft.qualification) : gradeLabel(draft.level, draft.grade)}
        </dd>
        <dt className="text-[var(--surface-text-muted)]">
          {draft.level === "superior" ? "Formação concluída" : "Último ano concluído"}
        </dt>
        <dd className="text-right font-medium">
          {draft.level === "superior"
            ? qualificationLabel(draft.lastCompletedQualification)
            : gradeLabel(draft.level, draft.lastCompletedGrade)}
        </dd>
        <dt className="text-[var(--surface-text-muted)]">Situação</dt>
        <dd className="text-right font-medium">
          {statusLabel(draft.educationStatus)}
        </dd>
        <dt className="text-[var(--surface-text-muted)]">Ano</dt>
        <dd className="text-right font-medium">{draft.year}</dd>
        <dt className="text-[var(--surface-text-muted)]">Cidade</dt>
        <dd className="text-right font-medium">{draft.city || "Não informada"}</dd>
        <dt className="text-[var(--surface-text-muted)]">Escola</dt>
        <dd className="text-right font-medium">{draft.school || "Não informada"}</dd>
      </dl>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] px-3 text-sm font-semibold text-[var(--surface-text)]"
      >
        <Pencil aria-hidden className="size-4" />
        Corrigir pelas opções
      </button>
    </div>
  );
}

function EducationAssistant({ assistantEnabled }: { assistantEnabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Sem assistente configurado no servidor, abrir no chat é atrito garantido:
  // toda pessoa bateria numa conversa que nunca responde. Começa no manual.
  const [mode, setMode] = useState<Mode>(assistantEnabled ? "assistant" : "manual");
  const [draft, setDraft] = useState<EducationDraft>(initialDraft);
  const [prepared, setPrepared] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<EducationMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [assistantUnavailable, setAssistantUnavailable] = useState(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            draft?: EducationDraft;
            prepared?: boolean;
            messages?: EducationMessage[];
          };
          if (parsed.draft) {
            const restoredDraft = { ...initialDraft(), ...parsed.draft };
            if (!restoredDraft.stage && restoredDraft.level) restoredDraft.stage = restoredDraft.level;
            if (
              restoredDraft.lastCompletedGrade === null &&
              restoredDraft.educationStatus === "completed"
            ) {
              restoredDraft.lastCompletedGrade = restoredDraft.grade;
            }
            if (
              restoredDraft.level === "superior" &&
              restoredDraft.qualification === "graduacao" &&
              restoredDraft.educationStatus !== "completed" &&
              restoredDraft.lastCompletedQualification === null
            ) {
              restoredDraft.lastCompletedQualification = "none";
            }
            if (!restoredDraft.level && !restoredDraft.grade && !restoredDraft.educationStatus) {
              restoredDraft.year = "";
            }
            setDraft(restoredDraft);
            setPrepared(Boolean(parsed.prepared) && validateDraft(restoredDraft) === null);
          }
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setMessages(
              parsed.messages
                .filter(
                  (message) =>
                    (message.role === "assistant" || message.role === "user") &&
                    typeof message.content === "string",
                )
                .slice(-8),
            );
          }
        }
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!restored) return;
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, prepared, messages: messages.slice(-8) }),
    );
  }, [draft, messages, prepared, restored]);

  async function sendAssistantMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || thinking) return;

    const history = messages.slice(-4);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setThinking(true);
    setPrepared(false);
    setAssistantUnavailable(false);
    setError(null);

    try {
      const response = await fetch("/api/me/education/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, draft, history }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await response.json()) as AssistantResponse;
      if (response.status === 401) {
        router.push("/");
        return;
      }
      if (!response.ok || !data.draft || !data.reply) {
        throw new Error(data.detail || "ASSISTANT_UNAVAILABLE");
      }

      const nextDraft: EducationDraft = {
        stage: data.draft.stage ?? data.draft.level,
        level: data.draft.level,
        grade: data.draft.grade,
        lastCompletedGrade: data.draft.last_completed_grade ?? null,
        qualification: data.draft.qualification ?? null,
        lastCompletedQualification: data.draft.last_completed_qualification ?? null,
        educationStatus: data.draft.education_status,
        year: data.draft.year ? String(data.draft.year) : "",
        city: data.draft.city || "",
        school: data.draft.school || "",
      };
      setDraft(nextDraft);
      setPrepared(Boolean(data.ready) && validateDraft(nextDraft) === null);
      setMessages((current) => [...current, { role: "assistant", content: data.reply as string }]);
    } catch {
      setAssistantUnavailable(true);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Não consegui entender agora. Tente novamente ou continue pelas opções.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function saveEducation() {
    const validationError = validateDraft(draft);
    if (validationError || pending) {
      setError(validationError);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: draft.level,
            grade: draft.grade,
            last_completed_grade: draft.lastCompletedGrade,
            qualification: draft.qualification,
            last_completed_qualification:
              draft.lastCompletedQualification === "none" ? null : draft.lastCompletedQualification,
            education_status: draft.educationStatus,
            completed:
              draft.educationStatus === "completed" &&
              (draft.level === "superior" ||
                (draft.level === "fundamental" && draft.grade === 9) ||
                (draft.level === "medio" && draft.grade === 3)),
            year: Number(draft.year),
            city: draft.city.trim() || null,
            school: draft.school.trim() || null,
          }),
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await response.json();
        if (!response.ok) {
          const redirectTo = wrongStatusHref(data.code, data.expected_status, "/escolaridade");
          if (redirectTo) {
            router.push(redirectTo);
            return;
          }
          setError(apiErrorMessage(data.code, data.detail, data));
          return;
        }
        window.sessionStorage.removeItem(STORAGE_KEY);
        router.push(NEXT_STAGE.education);
      } catch {
        setError("A conexão oscilou. Tente novamente — suas respostas continuam aqui.");
      }
    });
  }

  const canAttemptSave =
    mode === "assistant"
      ? prepared
      : Boolean(
          draft.educationStatus &&
            (draft.level === "superior"
              ? draft.qualification && draft.lastCompletedQualification !== null
              : draft.grade && draft.lastCompletedGrade !== null),
        );

  return (
    <div className="space-y-5">
      {pending && <LoadingOverlay label="Salvando escolaridade…" logo />}

      <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand-gold/50 text-brand-gold">
          <Bot aria-hidden className="size-5" />
        </span>
        <div>
          <p className="flex items-center gap-2 font-display text-base">
            Assistente de escolaridade
            <Sparkles aria-hidden className="size-4 text-brand-gold" />
          </p>
          <p className="text-sm text-[var(--surface-text-muted)]">Responda do seu jeito. Você confere tudo antes de salvar.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Modo de preenchimento">
        <button
          type="button"
          onClick={() => setMode("assistant")}
          aria-pressed={mode === "assistant"}
          className={`min-h-11 cursor-pointer rounded-[var(--radius-sm)] border px-3 text-sm font-semibold transition-colors duration-200 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
            mode === "assistant"
              ? "border-brand-gold bg-brand-gold-light/10 text-[var(--surface-text)]"
              : "border-[var(--surface-border)] text-[var(--surface-text-muted)]"
          }`}
        >
          Conversar
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          aria-pressed={mode === "manual"}
          className={`min-h-11 cursor-pointer rounded-[var(--radius-sm)] border px-3 text-sm font-semibold transition-colors duration-200 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
            mode === "manual"
              ? "border-brand-gold bg-brand-gold-light/10 text-[var(--surface-text)]"
              : "border-[var(--surface-border)] text-[var(--surface-text-muted)]"
          }`}
        >
          Responder por opções
        </button>
      </div>

      {mode === "assistant" ? (
        <div className="space-y-4">
          {assistantUnavailable && !prepared && (
            <div className="banner" role="alert">
              <p className="font-semibold">O assistente não respondeu agora.</p>
              <p className="mt-1 text-sm">Suas respostas não foram perdidas. Use as opções para continuar.</p>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="mt-3 min-h-11 cursor-pointer rounded-[var(--radius-sm)] border border-current px-4 text-sm font-semibold transition-colors duration-200 hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Continuar pelas opções
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)]">
            <div className="max-h-80 min-h-48 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] rounded-[var(--radius-sm)] px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-brand-gold text-brand-ink"
                      : "border border-[var(--surface-border)] bg-[var(--surface-alt)] text-[var(--surface-text)]"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {thinking && (
                <div className="flex max-w-[88%] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--surface-text-muted)]">
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  Entendendo sua resposta…
                </div>
              )}
            </div>
            <form onSubmit={sendAssistantMessage} className="border-t border-[var(--surface-border)] p-3">
              <label htmlFor="education-message" className="sr-only">
                Resposta sobre sua escolaridade
              </label>
              <div className="flex items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] p-2 focus-within:border-brand-gold">
                <textarea
                  id="education-message"
                  rows={2}
                  maxLength={500}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={thinking}
                  placeholder="Ex.: parei no 8º ano em 2022"
                  className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-base text-[var(--surface-text)] outline-none placeholder:text-[var(--surface-text-muted)]"
                />
                <button
                  type="submit"
                  disabled={thinking || !input.trim()}
                  className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] bg-brand-gold px-4 text-sm font-semibold text-brand-ink transition-colors duration-200 hover:bg-brand-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Enviar resposta"
                >
                  <ArrowUp aria-hidden className="size-4" />
                  Enviar
                </button>
              </div>
            </form>
            <p className="px-4 pb-4 text-xs leading-relaxed text-[var(--surface-text-muted)]">
              Sua resposta é processada pelo assistente apenas para organizar estes dados. Você confere tudo antes de salvar.
            </p>
          </div>
          {prepared && <EducationReview draft={draft} onEdit={() => setMode("manual")} />}
        </div>
      ) : (
        <EducationFields
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setPrepared(validateDraft(next) === null);
            setError(null);
          }}
        />
      )}

      <FieldError>{error}</FieldError>
      <Button
        type="button"
        size="xl"
        loading={pending}
        disabled={thinking || pending || !canAttemptSave}
        onClick={saveEducation}
        className="w-full"
      >
        {pending ? "Salvando…" : "Confirmar e continuar"}
      </Button>
      <p className="field-hint">
        Cidade e escola ajudam, mas não bloqueiam. Quem ainda não concluiu o ensino médio pode entrar no programa e conquistar a bolsa pelas indicações pagas.
      </p>
    </div>
  );
}

export function EscolaridadeForm({
  assistantEnabled = true,
}: {
  /** Falso quando o assistente não está configurado no servidor: abre no manual. */
  assistantEnabled?: boolean;
}) {
  return <EducationAssistant assistantEnabled={assistantEnabled} />;
}
