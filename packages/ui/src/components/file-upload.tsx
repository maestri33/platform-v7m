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

async function compressImageFile(file: File, maxDim = 1600, quality = 0.75): Promise<File> {
  if (!file.type.startsWith("image/") || typeof window === "undefined") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const { width: w, height: h } = bitmap;
    if (w <= maxDim && h <= maxDim && file.size < 600 * 1024) {
      bitmap.close();
      return file;
    }
    let targetW = w;
    let targetH = h;
    if (w > maxDim || h > maxDim) {
      if (w >= h) {
        targetW = maxDim;
        targetH = Math.round((h * maxDim) / w);
      } else {
        targetH = maxDim;
        targetW = Math.round((w * maxDim) / h);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Image picker with preview. On mobile the capture hint opens the right camera. */
export function FileUpload({ label, hint, capture, file, onChange, done = false }: FileUploadProps) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const isPdf = file?.type === "application/pdf";

  async function handle(selected: File | null) {
    if (!selected) {
      onChange(null);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }

    const processed = await compressImageFile(selected);
    onChange(processed);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      // PDF não renderiza em <img>; só geramos preview pra imagem (o PDF mostra um selo).
      return processed && processed.type.startsWith("image/")
        ? URL.createObjectURL(processed)
        : null;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-bold text-brand-ink">{label}</span>
      <label
        htmlFor={id}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
          done
            ? "border-brand-green bg-brand-green-bg/60"
            : "border-brand-border bg-white/80 hover:border-brand-blue-bright hover:bg-white"
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
