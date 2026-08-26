"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentBlocks, useResolveBlock } from "./use-blocks";
import { explainBlock } from "./explainer";
import type { BlockOut } from "./types";

interface ActiveBlocksBannerProps {
  className?: string;
  onBlockAction?: (block: BlockOut) => void;
}

export function ActiveBlocksBanner({ className = "", onBlockAction }: ActiveBlocksBannerProps) {
  const router = useRouter();
  const { data: blocks = [], isLoading } = useStudentBlocks();
  const resolveMutation = useResolveBlock();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (isLoading || !blocks || blocks.length === 0) {
    return null;
  }

  const handleAction = async (block: BlockOut) => {
    if (onBlockAction) {
      onBlockAction(block);
      return;
    }

    if (block.action_route) {
      router.push(block.action_route);
      return;
    }

    // Se for ação de resolver direto
    try {
      setResolvingId(block.external_id);
      await resolveMutation.mutateAsync(block.external_id);
    } catch {
      // Ignora e deixa o fallback
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <aside
      aria-label="Avisos importantes"
      className={`flex flex-col gap-3 ${className}`}
    >
      {blocks.map((block) => {
        const explained = explainBlock(block);
        const isResolving = resolvingId === block.external_id;

        const borderClass =
          explained.severity === "error"
            ? "border-red-500/40 bg-red-950/30 text-red-100"
            : explained.severity === "info"
              ? "border-sky-500/40 bg-sky-950/30 text-sky-100"
              : "border-amber-500/40 bg-amber-950/30 text-amber-100";

        const badgeClass =
          explained.severity === "error"
            ? "bg-red-500/20 text-red-200 border-red-500/30"
            : explained.severity === "info"
              ? "bg-sky-500/20 text-sky-200 border-sky-500/30"
              : "bg-amber-500/20 text-amber-200 border-amber-500/30";

        const btnClass =
          explained.severity === "error"
            ? "bg-red-600 hover:bg-red-500 text-white"
            : explained.severity === "info"
              ? "bg-sky-600 hover:bg-sky-500 text-white"
              : "bg-amber-600 hover:bg-amber-500 text-white";

        return (
          <div
            key={block.external_id}
            role="alert"
            className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all ${borderClass}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                {explained.severity === "error" ? "⚠️" : explained.severity === "info" ? "ℹ️" : "📸"}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-bold leading-snug">{explained.title}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                    Atenção
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed opacity-90">{explained.friendlyReason}</p>
                {explained.tip ? (
                  <p className="mt-1 text-[12px] font-medium leading-relaxed opacity-75">
                    {explained.tip}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              disabled={isResolving}
              onClick={() => handleAction(block)}
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-bold shadow transition active:scale-[0.99] disabled:opacity-50 ${btnClass}`}
            >
              {isResolving ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>Atualizando…</span>
                </>
              ) : (
                <span>{explained.actionLabel}</span>
              )}
            </button>
          </div>
        );
      })}
    </aside>
  );
}
