"use client";

import { useId, useState } from "react";

interface FileUploadProps {
  label: string;
  hint?: string;
  /** "user" = front camera (selfie) · "environment" = rear camera (documents). */
  capture?: "user" | "environment";
  file: File | null;
  onChange: (file: File | null) => void;
  done?: boolean;
}

/** Image picker with preview. On mobile the capture hint opens the right camera. */
export function FileUpload({ label, hint, capture, file, onChange, done = false }: FileUploadProps) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);

  function handle(selected: File | null) {
    onChange(selected);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-bold text-brand-ink">{label}</span>
      <label
        htmlFor={id}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
          done
            ? "border-brand-green bg-brand-green/5"
            : "border-brand-border bg-brand-surface hover:border-brand-blue-bright"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={preview} alt="Pré-visualização" className="max-h-40 rounded-lg object-contain" />
        ) : (
          <>
            <span className="text-3xl" aria-hidden>
              {done ? "✅" : "📷"}
            </span>
            <span className="text-sm font-semibold text-brand-muted">
              {done ? "Enviado! Toque para trocar." : "Toque para tirar a foto ou escolher o arquivo"}
            </span>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={capture}
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      {file ? <p className="text-[13px] text-brand-muted">{file.name}</p> : null}
      {hint ? <p className="text-[13px] text-brand-muted">{hint}</p> : null}
    </div>
  );
}
