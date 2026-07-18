"use client";

import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * E-mail — passo 5 (depois do pergaminho). Campo único; confirmado, o envelope
 * voa e o funil segue sozinho pro painel do lead.
 */
export function ScreenEmail({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <main id="conteudo" className="flex flex-1 p-6">
      <div className="m-auto flex w-full max-w-[400px] flex-col gap-4">
        <div
          className={`${s.emailShake ? styles.shake : ""} flex flex-col gap-2.5 rounded-[28px] border border-white/50 bg-white/70 px-[18px] py-4 shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl`}
        >
          <div aria-hidden className="flex gap-1.5">
            <span className="h-[5px] flex-1 rounded-full bg-brand-green" />
            <span className="h-[5px] flex-1 rounded-full bg-brand-green" />
            <span className="h-[5px] flex-1 rounded-full bg-brand-blue-bright" />
          </div>

          {s.emailPhase === "input" && (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span aria-hidden className="text-3xl leading-none">
                  📧
                </span>
                <h2 className="text-[19px] font-extrabold tracking-tight text-brand-ink">
                  Qual é seu melhor e-mail?
                </h2>
                <p className="text-xs leading-normal text-brand-muted">
                  É por ele que enviamos seu acesso e as confirmações.
                </p>
              </div>
              <div
                className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] bg-white/60 px-3.5 py-1.5 ${
                  s.emailError ? "border-brand-danger" : "border-brand-border"
                }`}
              >
                <label htmlFor="lead-email" className="sr-only">
                  Seu melhor e-mail
                </label>
                <input
                  id="lead-email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seuemail@provedor.com"
                  value={s.email}
                  aria-invalid={s.emailError}
                  onChange={(e) => act.onEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") act.submitEmail();
                  }}
                  className="min-h-[52px] min-w-0 flex-1 border-none bg-transparent text-lg font-semibold text-brand-ink outline-none placeholder:font-normal placeholder:text-brand-muted/70"
                />
              </div>
              <button
                type="button"
                onClick={act.submitEmail}
                className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-none bg-brand-green-dark px-5 text-lg font-bold text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]"
              >
                Continuar
              </button>
            </>
          )}

          {s.emailPhase === "processing" && (
            <div className="flex flex-col items-center gap-3.5 py-7 text-center" role="status">
              <span
                aria-hidden
                className="size-11 animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue-bright"
              />
              <p className="text-base font-bold text-brand-ink">Verificando…</p>
            </div>
          )}

          {s.emailPhase === "flying" && (
            <div className="flex flex-col items-center gap-3 overflow-hidden pb-6 pt-4 text-center">
              <div className={`${styles.envelopeFly} w-[250px] max-w-[70%]`} aria-hidden>
                <svg viewBox="0 0 240 170" fill="none" className="h-auto w-full">
                  <rect x="8" y="18" width="224" height="140" rx="14" fill="#f4f7ff" stroke="var(--color-brand-blue-bright)" strokeWidth="4" />
                  <path d="M12 30 L120 104 L228 30" stroke="var(--color-brand-blue-bright)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M8 32 L120 108 L232 32 L232 24 C232 18 227 14 221 14 L19 14 C13 14 8 18 8 24 Z" fill="var(--color-brand-blue-bright)" opacity="0.12" />
                  <circle cx="196" cy="128" r="20" fill="var(--color-brand-green)" />
                  <path d="M188 128l6 6 12-12" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-brand-ink">E-mail confirmado!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
