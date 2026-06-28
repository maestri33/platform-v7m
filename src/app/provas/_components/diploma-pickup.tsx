"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/ui/error-box";
import { FileUpload } from "@/components/ui/file-upload";
import {
  ApiError,
  type StudentMe,
  getErrorMessage,
  postStudentDiplomaPickup,
} from "@/lib/api";

interface DiplomaPickupProps {
  /** StudentMe canônico devolvido pela retirada (status -> veteran). */
  onPickedUp: (next: StudentMe) => void;
  /** Erro de fase (WRONG_STATUS) — o pai re-busca o /me e re-roteia. */
  onWrongStatus: () => void;
}

/**
 * Retirada do diploma (awaiting_pickup → veteran). O aluno tira a FOTO segurando
 * o diploma; o POST multipart registra a retirada, vira veteran e dispara a
 * comissão do coordenador. Como a troca de role invalida o JWT, o pai conduz o
 * re-login depois — aqui só capturamos a foto e enviamos.
 */
export function DiplomaPickup({ onPickedUp, onWrongStatus }: DiplomaPickupProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const next = await postStudentDiplomaPickup(file);
      onPickedUp(next);
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
      <p className="text-base leading-relaxed text-brand-muted">
        Seu diploma está pronto pra retirada! Tire uma foto segurando o diploma — é o registro da
        sua conquista e libera sua formatura.
      </p>

      <FileUpload
        label="Foto da retirada do diploma"
        capture="environment"
        file={file}
        onChange={setFile}
        hint="Você segurando o diploma, com o documento bem visível."
      />

      <ErrorBox message={error} />
      <Button onClick={submit} loading={busy} disabled={!file || busy}>
        Registrar retirada
      </Button>
    </div>
  );
}
