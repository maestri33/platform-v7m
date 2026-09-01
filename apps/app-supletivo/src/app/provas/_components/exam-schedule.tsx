"use client";

import { useState } from "react";

import { Button, ErrorBox, TextField } from "@v7m/ui";
import {
  ApiError,
  type StudentMe,
  getErrorMessage,
  postStudentExamSchedule,
} from "@/lib/api";
import { saveExamChoice } from "@/lib/exam";

interface ExamScheduleProps {
  /** true quando o aluno reprovou (exam_failed) e está reagendando. */
  retry: boolean;
  /** StudentMe canônico devolvido pelo agendamento (status -> exam_scheduled). */
  onScheduled: (next: StudentMe) => void;
  /** Erro de fase (WRONG_STATUS) — o pai re-busca o /me e re-roteia. */
  onWrongStatus: () => void;
}

/**
 * Agendamento da prova (exam_released | exam_failed → exam_scheduled). O aluno
 * informa a matéria e a data/hora; o POST devolve o StudentMe já agendado.
 * `scheduled_at` vai como ISO 8601 (UTC) — instante inequívoco que o back
 * normaliza. A correção é do coordenador (não há ação do aluno depois disto).
 */
export function ExamSchedule({ retry, onScheduled, onWrongStatus }: ExamScheduleProps) {
  const [subject, setSubject] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !!subject.trim() && !!when && !busy;

  async function submit() {
    setError(null);
    const trimmed = subject.trim();
    if (!trimmed) {
      setError("Informe a matéria da prova.");
      return;
    }
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) {
      setError("Escolha uma data e hora válidas.");
      return;
    }
    setBusy(true);
    try {
      const scheduledAt = date.toISOString();
      const next = await postStudentExamSchedule({
        subject: trimmed,
        scheduled_at: scheduledAt,
      });
      // Guarda a escolha pra ecoar na tela de espera (o /me não devolve matéria/data).
      saveExamChoice({ subject: trimmed, scheduledAt });
      onScheduled(next);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.expectedStatus) {
        onWrongStatus();
        return;
      }
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {retry ? (
        <ErrorBox message="Sua prova anterior não foi aprovada. Sem problemas — escolha uma nova data e tente de novo." />
      ) : (
        <p className="text-base leading-relaxed text-brand-muted">
          Seus documentos foram validados! Agora escolha a matéria e quando você quer fazer a prova.
          O polo confirma e corrige depois.
        </p>
      )}

      <TextField
        label="Matéria da prova"
        placeholder="Ex.: Matemática"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={120}
      />

      <TextField
        label="Data e hora da prova"
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        hint="Escolha um dia e horário que funcionam pra você. O polo confirma com você."
      />

      <ErrorBox message={error} />
      <Button onClick={submit} loading={busy} disabled={!ready}>
        {retry ? "Reagendar prova" : "Agendar prova"}
      </Button>
    </div>
  );
}
