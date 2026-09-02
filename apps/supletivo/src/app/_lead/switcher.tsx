"use client";

import { MODALS, SCREEN_LIST, SCREEN_NAMES, TRIGGERS, type ModalKind } from "./flow-data";
import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

const MODAL_DEMOS = Object.keys(MODALS) as ModalKind[];

/**
 * Ferramenta do protótipo (não faz parte do app final): botão flutuante que
 * abre o navegador de telas, o previewer de modais e a tabela de gatilhos de
 * teste. Aqui só entra LEAD — quem já é aluno usa o app.supletivo.net.br.
 */
export function Switcher({ s, act }: { s: FlowState; act: FlowActions }) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <>
      {s.switcherOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-ink/55 backdrop-blur-[4px]"
          onClick={act.toggleSwitcher}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${styles.sheetUp} max-h-[82vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-white p-5 pb-7 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]`}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-ink">Navegar o protótipo</h2>
              <button
                type="button"
                onClick={act.toggleSwitcher}
                className="cursor-pointer border-none bg-transparent text-sm font-bold text-brand-muted"
              >
                Fechar
              </button>
            </div>
            <p className="mb-3.5 text-xs leading-normal text-brand-muted">
              Ferramenta do protótipo (não faz parte do app). Pule para qualquer tela do funil do
              lead. Aqui só entra LEAD — quem já é aluno usa o app.supletivo.net.br.
            </p>

            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-blue">
              Telas
            </p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {SCREEN_LIST.map(([key, label]) => {
                const active = s.screen === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => act.nav(key)}
                    className={`cursor-pointer rounded-full border px-3.5 py-2 text-[13px] font-bold ${
                      active
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-brand-border bg-white text-brand-ink"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="mb-1.5 mt-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-blue">
              Modais (animações &amp; textos)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MODAL_DEMOS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => act.showModalDemo(kind)}
                  className="cursor-pointer rounded-full border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-ink"
                >
                  {MODALS[kind].title}
                </button>
              ))}
            </div>

            <p className="mb-1.5 mt-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-blue">
              Gatilhos de teste
            </p>
            <div className="flex flex-col gap-1 rounded-xl border border-brand-border bg-brand-bg px-3 py-2.5">
              {TRIGGERS.map((trigger) => (
                <div key={trigger.k} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-bold text-brand-ink">{trigger.k}</span>
                  <span className="text-right font-mono text-xs text-brand-muted">{trigger.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={act.toggleSwitcher}
        title="Navegar (ferramenta do protótipo)"
        className="fixed bottom-4 right-4 z-[65] flex cursor-pointer items-center gap-2 rounded-full border-none bg-brand-ink px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        {SCREEN_NAMES[s.screen]}
      </button>
    </>
  );
}
