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
  const isPdf = file?.type === "application/pdf";

  function handle(selected: File | null) {
    onChange(selected);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      // PDF não renderiza em <img>; só geramos preview pra imagem (o PDF mostra um selo).
      return selected && selected.type.startsWith("image/")
        ? URL.createObjectURL(selected)
        : null;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-bold text-brand-ink">{label}</span>
      <label
        htmlFor={id}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center backdrop-blur-md transition ${
          done
            ? "border-brand-green bg-brand-green-bg/60"
            : "border-brand-border bg-white/45 hover:border-brand-blue-bright hover:bg-white/60"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={preview} alt="Pré-visualização" className="max-h-40 rounded-lg object-contain" />
        ) : isPdf ? (
          <>
            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark"
            >
              <svg
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-brand-muted">
              PDF selecionado. Toque para trocar.
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className={`flex size-12 items-center justify-center rounded-full ${
                done ? "bg-brand-green-bg text-brand-green-dark" : "bg-brand-blue-bg text-brand-blue"
              }`}
            >
              {done ? (
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4l1.4 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.1l1.4-2z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              )}
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
        accept="image/*,application/pdf"
        capture={capture}
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      {file ? <p className="text-[13px] text-brand-muted">{file.name}</p> : null}
      {hint ? <p className="text-[13px] text-brand-muted">{hint}</p> : null}
    </div>
  );
}
