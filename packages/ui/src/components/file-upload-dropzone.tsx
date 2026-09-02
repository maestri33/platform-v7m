"use client";

import React, { useId, useRef, useState } from "react";
import { IconCamera, IconCloudUpload, IconUpload } from "@tabler/icons-react";

export interface FileUploadDropzoneProps {
  label?: string;
  hint?: string;
  accept?: string;
  capture?: "user" | "environment";
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
}

/**
 * FileUploadDropzone (Aceternity / V7M).
 *
 * Área de upload com drag & drop moderna, borda pontilhada responsiva,
 * feedback de arraste e botão direto para câmera em dispositivos móveis.
 */
export function FileUploadDropzone({
  label = "Arraste ou selecione seu arquivo",
  hint = "Formatos aceitos: JPG, PNG ou PDF (até 15MB)",
  accept = "image/*,application/pdf",
  capture,
  disabled = false,
  compact = false,
  className = "",
  onFileSelect,
  onError,
}: FileUploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validação de tamanho (15MB)
    if (file.size > 15 * 1024 * 1024) {
      onError?.("O arquivo selecionado excede o limite máximo de 15MB.");
      return;
    }

    onFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragging
          ? "border-brand-blue-bright bg-blue-50/70 scale-[1.01] dark:border-blue-500 dark:bg-blue-950/30"
          : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/60 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600"
      } ${compact ? "p-4 min-h-[140px]" : "p-8 min-h-[220px]"} ${
        disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
      } ${className}`}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center text-center">
        {/* Ícone com animação de hover */}
        <div
          className={`flex items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${
            isDragging
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-white text-slate-700 shadow-sm border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
          } ${compact ? "size-10 mb-2" : "size-14 mb-3"}`}
        >
          {capture ? (
            <IconCamera className={compact ? "size-5" : "size-7"} />
          ) : isDragging ? (
            <IconCloudUpload className={compact ? "size-5" : "size-7"} />
          ) : (
            <IconUpload className={compact ? "size-5" : "size-7"} />
          )}
        </div>

        <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-brand-blue-bright transition-colors">
          {label}
        </p>

        {hint && (
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-xs">
            {hint}
          </p>
        )}

        <span className="mt-3 inline-flex items-center rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-semibold text-slate-700 transition group-hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-300">
          Escolher arquivo
        </span>
      </div>
    </div>
  );
}
