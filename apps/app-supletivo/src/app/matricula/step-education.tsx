"use client";

import { useEffect, useRef, useState } from "react";

import {
  Button,
  SelectField,
  TextField,
  EducationStageCard,
  EducationGradeCard,
  ActionChoiceCard,
  FeedbackModal,
} from "@v7m/ui";
import {
  ApiError,
  type EducationLevel,
  type EducationOut,
  getErrorMessage,
  postEnrollmentEducation,
} from "@/lib/api";
import { fetchCities, fetchUfs, type UfOption } from "@/lib/ibge";

import { StepProps, handleStepError } from "./step-types";
/* ========================== Seção 3 — Estudos ====================== */

/**
 * Funil de ELIMINAÇÃO (Victor 2026-07-28): em vez de selects, a pessoa desce por cards —
 * onde parou (primário/ginásio/médio, nomes da ÉPOCA dela) → qual ano → terminou aquele ano?
 * → onde estudou (UF/cidade IBGE). Cada card carrega as DUAS nomenclaturas (antiga e atual):
 * o público mais velho reconhece "4ª série", não "5º ano" — e a atual desambigua.
 *
 * `level`/`grade` do contrato não mudam: primário e ginásio são recortes do fundamental
 * (grade = numeração ATUAL 1–9); médio segue 1–3.
 */
type EducationStage = "primario" | "ginasio" | "medio";

interface GradeCard {
  grade: number;
  /** nome da época ("4ª série", "Pré") — o grande do card */
  old: string;
  /** equivalente atual ("hoje: 5º ano") — o pequeno */
  now: string;
  /** o mesmo ano em versão curta ("5º"), desenhado DENTRO da medalha */
  short: string;
}

const STAGE_INFO: Record<
  EducationStage,
  { title: string; range: string; nowRange: string; level: EducationLevel; cards: GradeCard[] }
> = {
  primario: {
    title: "Primário",
    range: "Do Pré à 4ª série",
    nowRange: "hoje: 1º ao 5º ano",
    level: "fundamental",
    cards: [
      { grade: 1, old: "Pré", now: "hoje: 1º ano", short: "1º" },
      { grade: 2, old: "1ª série", now: "hoje: 2º ano", short: "2º" },
      { grade: 3, old: "2ª série", now: "hoje: 3º ano", short: "3º" },
      { grade: 4, old: "3ª série", now: "hoje: 4º ano", short: "4º" },
      { grade: 5, old: "4ª série", now: "hoje: 5º ano", short: "5º" },
    ],
  },
  ginasio: {
    title: "Ginásio",
    range: "Da 5ª à 8ª série",
    nowRange: "hoje: 6º ao 9º ano",
    level: "fundamental",
    cards: [
      { grade: 6, old: "5ª série", now: "hoje: 6º ano", short: "6º" },
      { grade: 7, old: "6ª série", now: "hoje: 7º ano", short: "7º" },
      { grade: 8, old: "7ª série", now: "hoje: 8º ano", short: "8º" },
      { grade: 9, old: "8ª série", now: "hoje: 9º ano", short: "9º" },
    ],
  },
  medio: {
    title: "Ensino Médio",
    range: "Do 1º ao 3º ano",
    nowRange: "antigo colegial / 2º grau",
    level: "medio",
    cards: [
      { grade: 1, old: "1º ano", now: "antiga 1ª série / 1º colegial", short: "1º" },
      { grade: 2, old: "2º ano", now: "antiga 2ª série / 2º colegial", short: "2º" },
      { grade: 3, old: "3º ano", now: "antiga 3ª série / 3º colegial", short: "3º" },
    ],
  },
};

/** Ícone de cada nível — traço simples, herda a cor do card (stroke=currentColor). */
function StageIcon({ stage }: { stage: EducationStage }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-11",
    "aria-hidden": true,
  };
  if (stage === "primario") {
    // lápis + primeiras letras
    return (
      <svg {...common}>
        <path d="M14 34 34 14l6 6-20 20-8 2z" />
        <path d="M30 18l6 6" />
        <path d="M8 12h10M8 18h6" />
      </svg>
    );
  }
  if (stage === "ginasio") {
    // caderno com marcador
    return (
      <svg {...common}>
        <rect x="10" y="8" width="28" height="32" rx="3" />
        <path d="M18 8v32" />
        <path d="M24 16h8M24 22h8M24 28h5" />
      </svg>
    );
  }
  // capelo (formatura à vista)
  return (
    <svg {...common}>
      <path d="M4 20 24 12l20 8-20 8z" />
      <path d="M14 24v8c0 3 5 6 10 6s10-3 10-6v-8" />
      <path d="M40 22v10" />
    </svg>
  );
}

/**
 * Distintivo do ano: medalha com o ano ATUAL desenhado dentro. O nome da época vai no texto
 * do card — dentro da medalha entra o equivalente de hoje, então o card mostra as duas
 * nomenclaturas sem repetir a mesma palavra duas vezes.
 */
function GradeBadge({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className="size-14"
      aria-hidden
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="26" r="16" />
      <path d="M24 39 19 54l8-4 5 6 5-6 8 4-5-15" />
      <text
        x="32"
        y="31"
        textAnchor="middle"
        fontSize={16}
        fontWeight="800"
        fill="currentColor"
        stroke="none"
      >
        {label}
      </text>
    </svg>
  );
}

/** Terminou o ano × não terminou/repetiu — os dois desfechos com desenho próprio. */
function FinishedIcon({ done }: { done: boolean }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-11",
    "aria-hidden": true,
  };
  if (done) {
    // bandeira de chegada
    return (
      <svg {...common}>
        <path d="M12 42V8" />
        <path d="M12 10h24l-5 7 5 7H12" />
      </svg>
    );
  }
  // caminho interrompido
  return (
    <svg {...common}>
      <path d="M8 40c8-10 12-10 16-16" strokeDasharray="5 5" />
      <circle cx="34" cy="14" r="8" />
      <path d="M30 10l8 8" />
    </svg>
  );
}

/* Último ano estudado: escolha (pode ser aproximada), do ano atual até 1960. */
const YEAR_OPTIONS = Array.from({ length: 2026 - 1960 + 1 }, (_, i) => {
  const y = 2026 - i;
  return { value: String(y), label: String(y) };
});

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
].map((uf) => ({ value: uf, label: uf }));

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

/** Passo 3 — escolaridade por ELIMINAÇÃO (Victor 2026-07-28): onde parou → ano → terminou? → cidade. */
export function StepEducation({
  initial,
  onDone,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
}: StepProps & { initial?: EducationOut | null }) {
  // Fases do funil. Prefill (F3): quem já respondeu como candidato pula direto pra fase do lugar.
  const [stage, setStage] = useState<EducationStage | null>(null);
  const [grade, setGrade] = useState<number | null>(initial?.grade ?? null);
  const [finished, setFinished] = useState<boolean | null>(initial?.completed ?? null);
  const [phase, setPhase] = useState<"stage" | "grade" | "finished" | "place">(
    initial?.level && initial?.grade != null && initial?.completed != null ? "place" : "stage",
  );
  const [uf, setUf] = useState(initial?.state ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [when, setWhen] = useState(initial?.last_year_when ?? "");
  const [error, setError] = useState<string | null>(null);

  const level: EducationLevel | null = stage
    ? STAGE_INFO[stage].level
    : (initial?.level ?? null);

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

  function changeUf(next: string) {
    setUf(next);
    setCity(""); // cidade depende da UF
  }

  // Concluiu o 3º do Médio = já terminou os estudos → não é caso de supletivo.
  const concluiuMedio = level === "medio" && grade === 3 && finished === true;

  const ufOptions = ibgeDown
    ? UF_OPTIONS
    : ufs.map((u) => ({ value: u.sigla, label: u.sigla + " — " + u.nome }));
  const cityOptions = cities.map((c) => ({ value: c, label: c }));

  async function submit() {
    if (!level || grade == null || finished == null) return;
    setError(null);
    setBusy(true, "Salvando sua escolaridade…");
    try {
      // POST echoes the canonical enrollment header — route by its status, no /me re-fetch.
      const lite = await postEnrollmentEducation({
        level,
        grade,
        completed: finished,
        last_school: "",
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

  // Sem footer botões manuais — fluxo 100% in-card e contextual nos cards

  /* ---- fase 1: onde você parou? ---- */
  if (phase === "stage") {
    return (
      <div className="flex flex-col gap-[18px]">
        <h2 className="text-xl font-extrabold text-brand-ink">Onde você parou de estudar?</h2>
        <p className="text-[15px] leading-relaxed text-brand-muted">
          Vale como era na sua época — a gente traduz para os nomes de hoje.
        </p>
        {(Object.keys(STAGE_INFO) as EducationStage[]).map((s) => (
          <EducationStageCard
            key={s}
            onClick={() => {
              setStage(s);
              setGrade(null);
              setPhase("grade");
            }}
            icon={<StageIcon stage={s} />}
            title={STAGE_INFO[s].title}
            range={STAGE_INFO[s].range}
            nowRange={STAGE_INFO[s].nowRange}
            themeColor={s === "primario" ? "green" : s === "ginasio" ? "blue" : "accent"}
          />
        ))}
      </div>
    );
  }

  /* ---- fase 2: qual foi o último ano? ---- */
  if (phase === "grade") {
    const info = stage ? STAGE_INFO[stage] : null;
    return (
      <div className="flex flex-col gap-[18px]">
        <h2 className="text-xl font-extrabold text-brand-ink">
          Até que ano do {info?.title ?? "nível"} você foi?
        </h2>
        <p className="text-[15px] leading-relaxed text-brand-muted">
          Escolha o ÚLTIMO ano em que você entrou na escola — mesmo que não tenha terminado.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(info?.cards ?? []).map((c) => (
            <EducationGradeCard
              key={c.grade}
              gradeShort={c.short}
              gradeOld={c.old}
              gradeNow={c.now}
              onClick={() => {
                setGrade(c.grade);
                setFinished(null);
                setPhase("finished");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---- fase 3: terminou aquele ano? ---- */
  if (phase === "finished") {
    const card = stage ? STAGE_INFO[stage].cards.find((c) => c.grade === grade) : null;
    return (
      <div className="flex flex-col gap-[18px]">
        <h2 className="text-xl font-extrabold text-brand-ink">
          E esse ano ({card?.old ?? "o último"}), você terminou?
        </h2>
        <p className="text-[15px] leading-relaxed text-brand-muted">
          Isso é importante para a secretaria de educação — não muda sua vaga.
        </p>
        <ActionChoiceCard
          onClick={() => {
            setFinished(true);
            setPhase("place");
          }}
          icon={<FinishedIcon done />}
          title="Terminei o ano"
          subtitle="Passei — fui até o final"
          themeColor="green"
        />
        <ActionChoiceCard
          onClick={() => {
            setFinished(false);
            setPhase("place");
          }}
          icon={<FinishedIcon done={false} />}
          title="Não terminei"
          subtitle="Parei no meio, ou repeti"
          themeColor="neutral"
        />
      </div>
    );
  }

  /* ---- fase 4: onde foi esse último ano? ---- */
  return (
    <div className="flex flex-col gap-[18px]">
      <h2 className="text-xl font-extrabold text-brand-ink">Onde você estudou esse último ano?</h2>
      <p className="text-[15px] leading-relaxed text-brand-muted">
        Estado e cidade da escola — ajuda a secretaria a localizar seu histórico.
      </p>

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
            label="Estado (UF)"
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
        <p className="text-[13px] leading-relaxed text-brand-muted">Pode ser um ano aproximado.</p>
      </div>

      {concluiuMedio ? (
        <div className="rounded-xl border border-brand-blue bg-brand-blue-bg p-3.5 text-[14px] font-semibold leading-relaxed text-brand-ink">
          Você marcou que <strong>concluiu o 3º ano do Ensino Médio</strong> — ou seja, já
          terminou os estudos! O supletivo é para quem ainda <strong>não</strong> concluiu, então
          aqui não há matrícula a fazer. Se na verdade você parou antes de terminar, volte e
          ajuste a resposta.
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={() => setPhase("finished")}
          className="flex-1"
        >
          ← Voltar
        </Button>
        <Button
          onClick={submit}
          loading={busy}
          disabled={!uf || !city.trim() || concluiuMedio || busy}
          className="flex-1"
        >
          Salvar e continuar
        </Button>
      </div>

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
    </div>
  );
}
