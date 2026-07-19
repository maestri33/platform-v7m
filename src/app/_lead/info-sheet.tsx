"use client";

import styles from "./lead-flow.module.css";
import type { FlowActions, InfoSheet as InfoSheetState } from "./use-lead-flow";

/** Bottom-sheet informativo da home do aluno (aula / prova / diploma / suporte / doc). */
export function InfoSheet({ info, act }: { info: InfoSheetState; act: FlowActions }) {
  return (
    <div
      className={`${styles.modalFade} fixed inset-0 z-[82] flex items-end justify-center bg-brand-ink/55 backdrop-blur-sm`}
      onClick={act.closeInfo}
      role="dialog"
      aria-modal="true"
      aria-label={info.title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${styles.sheetUp} flex w-full max-w-[468px] flex-col items-center gap-3 rounded-t-3xl border-t border-white/60 bg-white/95 px-6 pt-[26px] text-center shadow-[0_-10px_50px_-12px_rgba(0,0,0,0.4)] backdrop-blur-xl pb-[max(26px,env(safe-area-inset-bottom))]`}
      >
        <span
          className="flex size-[76px] items-center justify-center rounded-full text-[40px] leading-none"
          style={{ background: info.iconBg ?? "var(--color-brand-blue-bg)" }}
          aria-hidden
        >
          {info.emoji}
        </span>
        <h2 className="text-xl font-extrabold text-brand-ink">{info.title}</h2>
        <p className="text-[15px] leading-relaxed text-brand-muted">{info.body}</p>
        <div className="flex w-full flex-col gap-2.5">
          {info.action && (
            <button
              type="button"
              onClick={info.action}
              className={`${styles.shiny} min-h-[52px] w-full cursor-pointer rounded-xl text-base font-extrabold text-white`}
              style={{ background: info.actionBg ?? "var(--color-brand-green-dark)" }}
            >
              {info.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={act.closeInfo}
            className="min-h-12 w-full cursor-pointer rounded-xl border border-brand-border bg-white text-[15px] font-bold text-brand-muted"
          >
            {info.action ? "Agora não" : "Beleza"}
          </button>
        </div>
      </div>
    </div>
  );
}
