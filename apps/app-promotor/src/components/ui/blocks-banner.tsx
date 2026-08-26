"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { ValidationBlock } from "@/lib/api/types";

export function BlocksBanner({
  blocks,
}: {
  blocks?: ValidationBlock[] | null;
}) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <aside
      aria-label="Avisos de validação de cadastro"
      className="space-y-2"
    >
      {blocks.map((block) => (
        <div
          key={block.external_id || block.source_type}
          className="rounded-[var(--radius-sm)] border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-200"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-400 shrink-0">
              <AlertCircle size={16} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-amber-300">
                {block.title || "Ajuste necessário no cadastro"}
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                {block.description}
              </p>
              {block.action_route && (
                <div className="mt-2.5">
                  <Link
                    href={block.action_route}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
                  >
                    <span>{block.action_label || "Resolver agora"}</span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}
