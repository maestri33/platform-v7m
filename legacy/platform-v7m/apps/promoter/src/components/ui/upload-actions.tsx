"use client";

import { useRef } from "react";
import { Camera, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Duas ações alimentando o MESMO upload: câmera (capture) ou arquivo (img/PDF).
 * Compartilhado entre o documento (RG/CNH) e o comprovante de residência.
 */
export function UploadActions({
  onFile,
  disabled,
  pending,
  retry,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  pending?: boolean;
  retry?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handle(input: HTMLInputElement | null) {
    const file = input?.files?.[0];
    if (file) onFile(file);
    if (input) input.value = "";
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => handle(cameraRef.current)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={() => handle(fileRef.current)}
      />
      <Button
        type="button"
        loading={pending}
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className="px-3 whitespace-nowrap"
      >
        <Camera size={18} aria-hidden /> {retry ? "Tirar de novo" : "Tirar foto"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className="px-3 whitespace-nowrap"
      >
        <FileUp size={18} aria-hidden /> Enviar arquivo
      </Button>
    </div>
  );
}
