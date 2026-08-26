import { NextResponse } from "next/server";
import OpenAI from "openai";

import { readSession } from "@/lib/auth/server";

type Level = "fundamental" | "medio" | "superior";
type EducationStage = "fundamental" | "medio" | "superior";
type Qualification = "graduacao" | "pos_graduacao" | "mestrado" | "doutorado";
type EducationStatus = "completed" | "attending" | "stopped";

type DraftInput = {
  stage?: EducationStage | null;
  level?: Level | null;
  grade?: number | null;
  lastCompletedGrade?: number | null;
  qualification?: Qualification | null;
  lastCompletedQualification?: Qualification | "none" | null;
  educationStatus?: EducationStatus | null;
  year?: string;
  city?: string;
  school?: string;
};

type HistoryMessage = {
  role: "assistant" | "user";
  content: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const BASE_URL = process.env.OMNIROUTE_BASE_URL ?? "";
const API_KEY = process.env.OMNIROUTE_API_KEY ?? "";
const MODEL = process.env.OMNIROUTE_EDUCATION_MODEL ?? "groq/llama-3.3-70b-versatile";

const openai = new OpenAI({
  baseURL: `${BASE_URL}/v1`,
  apiKey: API_KEY,
  maxRetries: 0,
  timeout: 7_000,
});

function normalizedText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
    : "";
}

function normalizeLevel(value: unknown): Level | null {
  const text = normalizedText(value);
  if (/superior|faculdade|graduacao|pos|mestrado|doutorado/.test(text)) return "superior";
  if (text.includes("fundamental")) return "fundamental";
  if (text.includes("medio")) return "medio";
  return null;
}

function normalizeQualification(value: unknown): Qualification | null {
  const text = normalizedText(value);
  if (/doutorado|doutor/.test(text)) return "doutorado";
  if (/mestrado|mestre/.test(text)) return "mestrado";
  if (/pos/.test(text)) return "pos_graduacao";
  if (/graduacao|faculdade|superior/.test(text)) return "graduacao";
  return null;
}

function normalizeCompletedQualification(value: unknown): Qualification | "none" | null {
  const text = normalizedText(value);
  if (/nenhum|nenhuma|none/.test(text)) return "none";
  return normalizeQualification(value);
}

function normalizeStage(value: unknown): EducationStage | null {
  const text = normalizedText(value);
  if (/superior|faculdade|graduacao|pos|mestrado|doutorado/.test(text)) return "superior";
  if (/medio|colegial|segundo grau/.test(text)) return "medio";
  if (/fundamental|primario|ginasio|primeiro grau/.test(text)) return "fundamental";
  return null;
}

function normalizeStatus(value: unknown): EducationStatus | null {
  const text = normalizedText(value);
  if (/conclu|aprov|termin/.test(text)) return "completed";
  if (/curs|matric|estudando/.test(text)) return "attending";
  if (/par|aband|interrom|incomplet/.test(text)) return "stopped";
  return null;
}

function normalizeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").match(/\d+/)?.[0]);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeOptional(value: unknown) {
  const clean = typeof value === "string" ? value.trim() : "";
  if (/^(não sei|nao sei|não lembro|nao lembro|null)$/i.test(clean)) return "";
  return clean.slice(0, 120);
}

function extractMessageHints(message: string) {
  const text = normalizedText(message);
  const superior = /ensino superior|faculdade|graduacao|pos-graduacao|mestrado|doutorado/.test(text);
  const qualification = superior ? normalizeQualification(text) : null;
  const legacyEighthSeries = /\b8\s*(?:a|ª)?\s*serie\b|\boitava serie\b/.test(text);
  const numericGrade = text.match(/\b([1-9])\s*(?:º|°|o)?\s*(?:ano|serie|medio)\b/);
  const wordGrades: Array<[RegExp, number]> = [
    [/\bprimeir[oa]\b/, 1],
    [/\bsegund[oa]\b/, 2],
    [/\bterceir[oa]\b/, 3],
    [/\bquart[oa]\b/, 4],
    [/\bquint[oa]\b/, 5],
    [/\bsext[oa]\b/, 6],
    [/\bsetim[oa]\b/, 7],
    [/\boitav[oa]\b/, 8],
    [/\bnon[oa]\b/, 9],
  ];
  const wordGrade = wordGrades.find(([pattern]) => pattern.test(text))?.[1] ?? null;
  const parsedGrade = legacyEighthSeries ? 9 : numericGrade ? Number(numericGrade[1]) : wordGrade;
  const level = superior
    ? "superior"
    : /ensino medio|\bmedio\b|colegial|segundo grau/.test(text)
    ? "medio"
    : /fundamental|primario|ginasio|primeiro grau/.test(text) ||
        legacyEighthSeries ||
        Boolean(parsedGrade && parsedGrade >= 4)
      ? "fundamental"
      : null;
  const educationStatus = /parei|aband|interromp|nao conclui/.test(text)
    ? "stopped"
    : /curs|matric|estudando/.test(text)
      ? "attending"
      : /conclu|terminei|aprov/.test(text)
      ? "completed"
      : null;
  const grade = superior
    ? null
    : parsedGrade ??
    (educationStatus === "completed" && level === "fundamental"
      ? 9
      : educationStatus === "completed" && level === "medio"
        ? 3
        : null);
  const explicitYear = text.match(/\b(19\d{2}|20\d{2})\b/);
  const year = explicitYear
    ? Number(explicitYear[1])
    : /este ano|esse ano/.test(text)
      ? CURRENT_YEAR
      : /ano passado/.test(text)
        ? CURRENT_YEAR - 1
        : null;

  const superiorStatus = superior ? educationStatus : null;
  const lastCompletedQualification =
    superior && superiorStatus === "completed"
      ? qualification
      : superior && qualification === "graduacao" && superiorStatus
        ? "none"
        : /conclu[^.]{0,24}graduacao|terminei[^.]{0,24}faculdade/.test(text)
          ? "graduacao"
          : null;
  return {
    stage: superior ? "superior" : level,
    level,
    grade,
    educationStatus,
    lastCompletedGrade: null,
    qualification,
    lastCompletedQualification,
    year,
  } as const;
}

function normalizePreviousDraft(value: unknown) {
  const draft = value && typeof value === "object" ? (value as DraftInput) : {};
  return {
    stage:
      draft.stage === "fundamental" || draft.stage === "medio" || draft.stage === "superior"
        ? draft.stage
        : draft.level === "fundamental" || draft.level === "medio"
          ? draft.level
          : null,
    level:
      draft.level === "fundamental" || draft.level === "medio" || draft.level === "superior"
        ? draft.level
        : null,
    grade: normalizeNumber(draft.grade),
    last_completed_grade: normalizeNumber(draft.lastCompletedGrade),
    qualification: normalizeQualification(draft.qualification),
    last_completed_qualification:
      draft.lastCompletedQualification === "none"
        ? "none"
        : normalizeQualification(draft.lastCompletedQualification),
    education_status:
      draft.educationStatus === "completed" ||
      draft.educationStatus === "attending" ||
      draft.educationStatus === "stopped"
        ? draft.educationStatus
        : null,
    year: normalizeNumber(draft.year),
    city: normalizeOptional(draft.city),
    school: normalizeOptional(draft.school),
  };
}

function validGrade(level: Level | null, grade: number | null) {
  if (!level || !grade) return false;
  return level === "fundamental" ? grade >= 1 && grade <= 9 : grade >= 1 && grade <= 3;
}

function fallbackReply(draft: {
  stage: EducationStage | null;
  level: Level | null;
  grade: number | null;
  last_completed_grade: number | null;
  qualification: Qualification | null;
  last_completed_qualification: Qualification | "none" | null;
  education_status: EducationStatus | null;
  year: number | null;
}) {
  if (!draft.stage || !draft.level) return "Essa série foi no Ensino Fundamental, Médio ou Superior?";
  if (draft.level === "superior") {
    if (!draft.education_status) return "Você concluiu essa formação, ainda está cursando ou parou antes de terminar?";
    if (!draft.qualification) return "Foi graduação, pós-graduação, mestrado ou doutorado?";
    if (draft.last_completed_qualification === null) {
      return "Antes disso, qual formação superior você realmente concluiu? Se nenhuma, diga nenhuma.";
    }
    if (!draft.year) return "Em que ano isso aconteceu?";
    return "Entendi. Confira o resumo abaixo antes de continuar.";
  }
  if (!validGrade(draft.level, draft.grade)) return "Qual foi exatamente a última série ou ano?";
  const grade = draft.grade as number;
  if (!draft.education_status) return "Você concluiu essa série, ainda está cursando ou parou antes de terminar?";
  if (draft.last_completed_grade === null) {
    if (grade === 1) return "Antes dessa série, você concluiu algum ano dessa etapa? Se nenhum, diga nenhum.";
    return `Antes disso, você chegou a concluir o ${grade - 1}º ano?`;
  }
  if (!draft.year) return "Em que ano isso aconteceu?";
  return "Entendi. Confira o resumo abaixo antes de continuar.";
}

function extractJson(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("MODEL_JSON_INVALID");
  return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ detail: "Sessão expirada.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json(
      { detail: "Assistente temporariamente indisponível.", code: "ASSISTANT_UNAVAILABLE" },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      message?: unknown;
      draft?: unknown;
      history?: unknown;
    };
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (!message) {
      return NextResponse.json({ detail: "Escreva uma resposta.", code: "EMPTY_MESSAGE" }, { status: 400 });
    }

    const previous = normalizePreviousDraft(body.draft);
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is HistoryMessage =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  ((item as HistoryMessage).role === "assistant" || (item as HistoryMessage).role === "user") &&
                  typeof (item as HistoryMessage).content === "string",
              ),
          )
          .slice(-4)
          .map((item) => ({ role: item.role, content: item.content.slice(0, 240) }))
      : [];

    const completion = await openai.chat.completions.create(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: `Você extrai escolaridade em português do Brasil. Retorne somente JSON, sem markdown, com: reply, stage, level, grade, last_completed_grade, qualification, last_completed_qualification, education_status, year, city, school. Valores canônicos: stage e level=fundamental|medio|superior|null; education_status=completed|attending|stopped|null; qualification e last_completed_qualification=graduacao|pos_graduacao|mestrado|doutorado|none|null. grade é a última série frequentada; last_completed_grade é a última série realmente concluída no mesmo nível e pode ser 0 quando nenhuma foi concluída. No Superior, grade deve ser null; qualification é a formação frequentada e last_completed_qualification é a última formação concluída, usando none quando nenhuma foi concluída. Fundamental aceita 1-9; médio aceita 1-3; ano entre 1950 e ${CURRENT_YEAR + 1}. Quem frequentou Ensino Superior necessariamente tem level=superior e comprova o Médio, mesmo sem concluir a graduação. Reconheça primário, ginásio e primeiro grau como Fundamental; colegial e segundo grau como Médio; antiga 8ª série equivale ao atual 9º ano. Nunca presuma que alguém que parou concluiu a etapa anterior: pergunte. Cidade e escola são opcionais e devem ser string vazia quando a pessoa não souber. Preserve dados anteriores não corrigidos. Se faltar dado obrigatório, reply deve fazer uma única pergunta curta. Se estiver completo, reply deve pedir conferência do resumo. Nunca invente dados.`,
          },
          {
            role: "user",
            content: JSON.stringify({ previous, history, message }),
          },
        ],
      },
      { signal: AbortSignal.timeout(8_000) },
    );

    const candidate = extractJson(completion.choices[0]?.message?.content ?? "");
    const hints = extractMessageHints(message);
    const has = (key: string) => Object.prototype.hasOwnProperty.call(candidate, key);
    const stage = hints.stage ?? previous.stage ?? (has("stage") ? normalizeStage(candidate.stage) : null);
    const level = hints.level ?? previous.level ?? (has("level") ? normalizeLevel(candidate.level) : null);
    const answeringLastCompleted = Boolean(
      previous.level !== "superior" &&
      previous.grade &&
        previous.education_status &&
        previous.education_status !== "completed" &&
        previous.last_completed_grade === null,
    );
    const answeringLastCompletedQualification = Boolean(
      previous.level === "superior" &&
        previous.qualification &&
        previous.education_status &&
        previous.education_status !== "completed" &&
        previous.last_completed_qualification === null,
    );
    const grade = answeringLastCompleted
      ? previous.grade
      : hints.grade ?? previous.grade ?? (has("grade") ? normalizeNumber(candidate.grade) : null);
    const educationStatus = answeringLastCompleted || answeringLastCompletedQualification
      ? previous.education_status
      : hints.educationStatus ??
        previous.education_status ??
        (has("education_status") ? normalizeStatus(candidate.education_status) : null);
    let lastCompletedGrade =
      hints.lastCompletedGrade ??
      previous.last_completed_grade ??
      (has("last_completed_grade") ? normalizeNumber(candidate.last_completed_grade) : null);
    if (educationStatus === "completed" && grade) lastCompletedGrade = grade;
    if (answeringLastCompleted && previous.grade) {
      if (/\b(nenhum|nenhuma)\b/.test(normalizedText(message))) lastCompletedGrade = 0;
      else if (/^(sim|conclui|terminei|completei)/.test(normalizedText(message))) {
        lastCompletedGrade = previous.grade - 1;
      } else if (hints.grade !== null && hints.grade < previous.grade) {
        lastCompletedGrade = hints.grade;
      }
    }
    const qualification = answeringLastCompletedQualification
      ? previous.qualification
      : hints.qualification ??
        previous.qualification ??
        (has("qualification") ? normalizeQualification(candidate.qualification) : null);
    let lastCompletedQualification: Qualification | "none" | null =
      (hints.lastCompletedQualification as Qualification | "none" | null) ??
      (previous.last_completed_qualification as Qualification | "none" | null) ??
      (has("last_completed_qualification")
        ? normalizeCompletedQualification(candidate.last_completed_qualification)
        : null);
    if (educationStatus === "completed" && qualification) {
      lastCompletedQualification = qualification;
    }
    if (answeringLastCompletedQualification && previous.qualification) {
      const previousIndex = ["graduacao", "pos_graduacao", "mestrado", "doutorado"].indexOf(
        previous.qualification,
      );
      if (/\b(nenhum|nenhuma)\b/.test(normalizedText(message))) {
        lastCompletedQualification = "none";
      } else if (/^(sim|conclui|terminei|completei)/.test(normalizedText(message))) {
        lastCompletedQualification =
          previousIndex > 0
            ? (["graduacao", "pos_graduacao", "mestrado", "doutorado"][
                previousIndex - 1
              ] as Qualification)
            : "none";
      } else if (hints.qualification) {
        const hintedIndex = ["graduacao", "pos_graduacao", "mestrado", "doutorado"].indexOf(
          hints.qualification,
        );
        if (hintedIndex < previousIndex) lastCompletedQualification = hints.qualification;
      }
    }
    const year = hints.year ?? previous.year ?? (has("year") ? normalizeNumber(candidate.year) : null);
    const city = has("city") ? normalizeOptional(candidate.city) : previous.city;
    const school = has("school") ? normalizeOptional(candidate.school) : previous.school;
    const ready =
      Boolean(stage && level && educationStatus) &&
      (level === "superior"
        ? Boolean(
            qualification &&
              lastCompletedQualification !== null &&
              (educationStatus !== "completed" || lastCompletedQualification === qualification),
          )
        : validGrade(level, grade) &&
          lastCompletedGrade !== null &&
          (educationStatus === "completed"
            ? lastCompletedGrade === grade
            : lastCompletedGrade < (grade ?? 0))) &&
      Boolean(year && year >= 1950 && year <= CURRENT_YEAR + 1);
    const draft = {
      stage,
      level,
      grade,
      last_completed_grade: lastCompletedGrade,
      qualification,
      last_completed_qualification: lastCompletedQualification,
      education_status: educationStatus,
      year,
      city,
      school,
    };
    const reply = fallbackReply(draft);

    return NextResponse.json({ reply, ready, draft });
  } catch (error) {
    const timedOut =
      error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`);
    return NextResponse.json(
      {
        detail: timedOut
          ? "O assistente demorou mais que o esperado."
          : "Não foi possível entender a resposta agora.",
        code: timedOut ? "ASSISTANT_TIMEOUT" : "ASSISTANT_INVALID_RESPONSE",
      },
      { status: 502 },
    );
  }
}
