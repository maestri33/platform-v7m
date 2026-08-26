"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, TextareaField } from "@/components/ui/field";

import { TrainingRefresh } from "../TrainingRefresh";

type Props = {
  materialExternalId: string;
  /** Estado da última resposta (`TrainingMaterialOut.submission_status`). */
  submissionStatus: string | null;
  /** Feedback da IA na última correção — mostrado no rejected (nunca o gabarito). */
  justification?: string | null;
};

// Erros roteados por `code` (envelope {detail, code}) — nunca parseando detail.
function submitErrorMessage(code: string | undefined, detail: string | undefined) {
  switch (code) {
    case "ALREADY_GRADING":
      return "Sua resposta anterior ainda está sendo corrigida — é rapidinho, já já você pode enviar outra.";
    case "INVALID_AUDIO_TYPE":
      return "Esse áudio veio num formato que a gente ainda não entende. Grave de novo por aqui mesmo que funciona.";
    case "AUDIO_TOO_LARGE":
      return "O áudio ficou longo demais. Grave uma resposta mais curta — direto ao ponto vale mais.";
    default:
      return detail ?? "Não deu pra enviar agora. Tente de novo em instantes.";
  }
}

/** Resposta por texto OU áudio; enviada, a IA corrige e a página re-renderiza. */
export function SubmissionForm({ materialExternalId, submissionStatus, justification }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const refreshSessionAndOpenPanel = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      window.location.assign(response.ok ? "/painel" : "/");
    } catch {
      setError("A conexão oscilou ao liberar o painel. Tente novamente.");
    }
  }, []);

  useEffect(() => {
    if (submissionStatus !== "approved") return;
    void fetch("/api/auth/refresh", { method: "POST" })
      .then((response) => window.location.assign(response.ok ? "/painel" : "/"))
      .catch(() => undefined);
  }, [submissionStatus]);

  // ── Gravação de áudio (MediaRecorder) ──────────────────────────────────────
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Desmonta gravando → solta o microfone.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        uploadAudio(new File([blob], `resposta.${ext}`, { type }));
      };
      recorder.start();
      setRecSecs(0);
      setRecording(true);
    } catch {
      setError("Não conseguimos acessar o microfone. Libere a permissão nas configurações e tente de novo — ou responda por texto, como preferir.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function uploadAudio(file: File) {
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("material_external_id", materialExternalId);
        form.append("file", file, file.name);
        const res = await fetch("/api/me/training/submissions/audio", {
          method: "POST",
          body: form,
        });
        const data: { detail?: string; code?: string } = await res.json();
        if (!res.ok) {
          setError(submitErrorMessage(data.code, data.detail));
          return;
        }
        setSent(true);
        router.refresh();
      } catch {
        setError("A conexão oscilou. Tente de novo — sua resposta continua aqui.");
      }
    });
  }

  function onSubmitText(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/training/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            material_external_id: materialExternalId,
            answer: answer.trim(),
          }),
        });
        const data: { detail?: string; code?: string } = await res.json();
        if (!res.ok) {
          setError(submitErrorMessage(data.code, data.detail));
          return;
        }
        setSent(true);
        router.refresh();
      } catch {
        setError("A conexão oscilou. Tente de novo — sua resposta continua aqui.");
      }
    });
  }

  if (submissionStatus === "approved") {
    return (
      <div className="space-y-3">
        <div className="banner banner-ok" role="status">
          <p className="font-display">Matéria concluída ✓</p>
          <p className="text-sm mt-1 opacity-90">Liberando seu painel…</p>
        </div>
        <FieldError>{error}</FieldError>
        <Button type="button" onClick={refreshSessionAndOpenPanel} className="w-full">
          Abrir painel
        </Button>
      </div>
    );
  }

  // Resposta na fila de correção (recém-enviada ou vinda do backend) — a página
  // re-renderiza sozinha até a IA terminar (1 correção pendente por matéria).
  if (sent || submissionStatus === "pending") {
    return (
      <div className="banner banner-info" role="status">
        <TrainingRefresh />
        <div className="flex items-center gap-2">
          <span className="spinner" aria-hidden />
          <p className="font-display">Resposta recebida ✓ — nossa IA está avaliando…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmitText} className="space-y-5">
      {submissionStatus === "rejected" && (
        <div className="banner banner-warn" role="status">
          <p className="font-display">Quase lá — tente responder de novo</p>
          <p className="text-sm mt-1 opacity-90">
            {justification ||
              "A última resposta não passou. Releia o material e responda com suas palavras, por texto ou áudio."}
          </p>
        </div>
      )}

      <TextareaField
        label="Sua resposta"
        value={answer}
        onChange={setAnswer}
        rows={8}
        placeholder="Escreva com suas palavras…"
      />

      <div className="space-y-2">
        <p className="label">Ou responda por áudio</p>
        {recording ? (
          <Button
            type="button"
            variant="ghost"
            onClick={stopRecording}
            className="w-full border-brand-danger/50 text-brand-danger"
          >
            <Square size={16} aria-hidden /> Parar e enviar (
            {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")})
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={startRecording}
            disabled={pending}
            className="w-full border-[var(--surface-border)] text-[var(--surface-text)]"
          >
            <Mic size={16} aria-hidden /> Gravar resposta em áudio
          </Button>
        )}
      </div>

      <FieldError>{error}</FieldError>
      <Button
        type="submit"
        size="xl"
        loading={pending}
        disabled={!answer.trim() || recording}
        className="w-full"
      >
        {pending ? "Enviando…" : "Enviar resposta"}
      </Button>
    </form>
  );
}
