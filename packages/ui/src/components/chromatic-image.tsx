"use client";

import React from "react";
import { IconFileText } from "@tabler/icons-react";

export interface ChromaticImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  width?: number | string;
  height?: number | string;
  onClick?: () => void;
}

/**
 * ChromaticImage.
 *
 * Exibe imagem ou preview de documento com separação de cores RGB e reflexo suave.
 */
export function ChromaticImage({
  src,
  alt = "Imagem ou documento",
  className,
  imgClassName,
  width,
  height,
  onClick,
}: ChromaticImageProps) {
  const isPdf = typeof src === "string" && src.toLowerCase().includes(".pdf");

  if (isPdf) {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 ${
          className || ""
        }`}
      >
        <div className="flex size-14 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <IconFileText className="size-7" />
        </div>
        <span className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">
          Documento em PDF
        </span>
        <span className="text-xs text-slate-500 dark:text-zinc-400">
          Clique para visualizar
        </span>
      </div>
    );
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-black/5 ${
        className || ""
      }`}
      style={{ width, height }}
    >
      {/* Imagem base nítida */}
      <img
        src={src}
        alt={alt}
        className={`relative z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          imgClassName || ""
        }`}
        loading="lazy"
      />

      {/* Camada Cromática Vermelha (RGB shift) */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-0 mix-blend-screen transition-all duration-500 group-hover:scale-105 group-hover:opacity-40"
        style={{ transform: "translate(2px, -1px)" }}
      />

      {/* Camada Cromática Ciano (RGB shift) */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-0 mix-blend-screen transition-all duration-500 group-hover:scale-105 group-hover:opacity-40"
        style={{ transform: "translate(-2px, 1px)" }}
      />
    </div>
  );
}
