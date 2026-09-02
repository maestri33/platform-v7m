/**
 * O StudentMe canônico não devolve a matéria/data que o aluno escolheu ao
 * agendar a prova — só o status (exam_scheduled). Pra ecoar "Sua prova:
 * Matemática, 10/06 às 14h" na tela de espera, guardamos a escolha localmente
 * no momento do agendamento. É só conveniência de UI (sobrevive a refresh e
 * re-login no MESMO dispositivo); sem ela, a tela cai no texto genérico.
 */
const KEY = "supletivo:exam-choice";

export interface ExamChoice {
  subject: string;
  /** ISO 8601 (UTC) — mesmo instante enviado ao backend. */
  scheduledAt: string;
}

export function saveExamChoice(choice: ExamChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    /* storage indisponível (modo privado/cota) — sem eco, sem erro */
  }
}

export function getExamChoice(): ExamChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExamChoice>;
    if (typeof parsed.subject === "string" && typeof parsed.scheduledAt === "string") {
      return { subject: parsed.subject, scheduledAt: parsed.scheduledAt };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearExamChoice(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}

/**
 * Formata a escolha pra UI: "Matemática, 10/06 às 14h" (ou "…às 14h30" quando
 * houver minutos). Data/hora no fuso local do aluno.
 */
export function formatExamChoice(choice: ExamChoice): string {
  const date = new Date(choice.scheduledAt);
  if (Number.isNaN(date.getTime())) return choice.subject;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const time = minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, "0")}`;
  return `${choice.subject}, ${day}/${month} às ${time}`;
}
