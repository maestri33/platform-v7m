"use client";

import { BOT_Q } from "./flow-data";
import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

const LEVEL_ICON = {
  Fundamental:
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  Médio: "M22 10L12 5 2 10l10 5 10-5zM6 12.5V17c3 2.6 9 2.6 12 0v-4.5",
};

/**
 * Robô assistente da escolaridade — conversa livre com trava do aluno: quem
 * declara superior/pós ou médio concluído não precisa de supletivo (o robô
 * brinca e repergunta). Sem etapa de cidade (diferença vs. candidato).
 */
export function EduBot({ s, act }: { s: FlowState; act: FlowActions }) {
  const bq = s.botQ ? BOT_Q[s.botQ] : null;
  const btext = s.botQ ? BOT_Q[s.botQ].text : "";
  const listen = s.botPhase === "listen";
  const thinking = s.botPhase === "think";
  const typing = s.botPhase === "typing";
  const celebrating = s.botPhase === "celebrate";
  const oopsPose = (s.botQ === "oops" || s.botQ === "blocked") && !thinking && !celebrating;
  const eyesNormal = !thinking && !celebrating && !oopsPose;

  const chips: Array<{ icon: string; label: string; pick: () => void }> = [];
  if (s.botLevel) {
    chips.push({ icon: LEVEL_ICON.Fundamental, label: s.botLevel, pick: act.botFixLevel });
  }
  if (s.botDone !== null) {
    chips.push({
      icon: s.botDone ? "M20 6L9 17l-5-5" : "M18 6L6 18M6 6l12 12",
      label: s.botDone ? "Terminou" : "Não terminou",
      pick: act.botFixDone,
    });
  }

  return (
    <>
      <div className="flex min-h-[392px] flex-col gap-3.5">
        <div className="flex min-h-[34px] flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.pick}
              className={`${styles.chipFly} flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-brand-green-dark/40 bg-brand-green/10 px-3 py-[7px]`}
            >
              <svg className="size-[15px]" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-green-dark)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={chip.icon} />
              </svg>
              <span className="whitespace-nowrap text-xs font-extrabold text-brand-green-dark">
                {chip.label}
              </span>
            </button>
          ))}
        </div>

        {!!s.botQ && (
          <div className={`${styles.balloonPop} relative rounded-[14px] border border-brand-green-dark/35 bg-white px-4 py-3.5 shadow-[0_14px_34px_-14px_rgba(11,27,59,0.22)]`}>
            {thinking ? (
              <div className="flex justify-center gap-[5px] py-1" aria-label="Pensando…">
                <span className={`${styles.dotA} size-2 rounded-full bg-brand-green-dark`} />
                <span className={`${styles.dotB} size-2 rounded-full bg-brand-green-dark`} />
                <span className={`${styles.dotC} size-2 rounded-full bg-brand-green-dark`} />
              </div>
            ) : (
              <>
                <p className="text-lg font-semibold leading-normal text-brand-ink">
                  {typing ? btext.slice(0, s.botTyped) : btext}
                </p>
                {listen && !!bq?.hint && (
                  <p className="mt-1.5 text-[13px] leading-snug text-brand-muted">{bq.hint}</p>
                )}
              </>
            )}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-brand-green-dark/35 bg-white"
            />
          </div>
        )}

        <div className={`${styles.botIn} flex flex-col items-center`} aria-hidden>
          <div className={`${typing ? styles.antennaPulse : ""} flex flex-col items-center`}>
            <div className="size-[9px] rounded-full bg-[linear-gradient(135deg,var(--color-brand-green-light),var(--color-brand-green-dark))] shadow-[0_0_10px_rgba(56,209,120,0.8)]" />
            <div className="h-3 w-[3px] rounded-sm bg-[linear-gradient(var(--color-brand-green),#6b6f76)]" />
          </div>
          <div className={`${thinking ? styles.wiggle : celebrating ? styles.hop : ""} flex flex-col items-center`}>
            <div
              className="flex h-[66px] w-[94px] items-center justify-center rounded-[22px] border-[1.5px] border-brand-green-dark/55 bg-[linear-gradient(180deg,#26262b,#1a1a1d)] shadow-[0_14px_30px_-12px_rgba(11,27,59,0.4),inset_0_1px_0_rgba(255,255,255,0.07)] transition-transform duration-300"
              style={{ transform: `rotate(${listen ? "-5deg" : "0deg"})` }}
            >
              <div
                className={`${listen && s.botInput ? styles.eyesRead : ""} flex gap-[15px] transition-transform duration-300`}
                style={{ transform: `translateY(${listen ? "4px" : "0px"})` }}
              >
                {eyesNormal && (
                  <>
                    <div className={`${styles.blink} h-[26px] w-[19px] rounded-full bg-brand-green-light shadow-[0_0_14px_rgba(56,209,120,0.6)]`} />
                    <div className={`${styles.blink} h-[26px] w-[19px] rounded-full bg-brand-green-light shadow-[0_0_14px_rgba(56,209,120,0.6)]`} />
                  </>
                )}
                {thinking && (
                  <>
                    {[0, 1].map((i) => (
                      <svg key={i} className={`${styles.gearSpin} size-[22px]`} viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-green-light)" strokeWidth="2">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
                      </svg>
                    ))}
                  </>
                )}
                {celebrating && (
                  <>
                    {[0, 1].map((i) => (
                      <svg key={i} className="size-6" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-green)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12.5l5 5L20 6.5" />
                      </svg>
                    ))}
                  </>
                )}
                {oopsPose && (
                  <>
                    <div className="h-[7px] w-[19px] rounded-full bg-brand-green-light" />
                    <div className="h-[7px] w-[19px] rounded-full bg-brand-green-light" />
                  </>
                )}
              </div>
            </div>
            <div className="mt-[5px] flex h-10 w-[72px] items-center justify-center rounded-[15px] border-[1.5px] border-brand-green-dark/40 bg-[linear-gradient(180deg,#232327,#18181b)]">
              <div className="size-[15px] rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--color-brand-green-light),var(--color-brand-green-dark))] opacity-90" />
            </div>
          </div>
        </div>

        {listen && bq?.kind === "input" && (
          <div className={`${styles.slideUp} flex gap-2`}>
            <label htmlFor="bot-input" className="sr-only">
              Sua resposta
            </label>
            <input
              id="bot-input"
              value={s.botInput}
              onChange={(e) => act.onBotInput(e.target.value)}
              onKeyDown={act.onBotKey}
              placeholder={bq.ph}
              className="box-border min-h-[54px] min-w-0 flex-1 rounded-xl border border-brand-border bg-white px-3.5 text-lg font-semibold text-brand-ink outline-none focus:border-brand-green-dark focus:ring-[3px] focus:ring-brand-green/20"
            />
            <button
              type="button"
              onClick={act.botMic}
              aria-label="Falar"
              className="flex w-[54px] flex-none cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-brand-green-dark/50 bg-brand-green/10"
            >
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-green-dark)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="2.5" width="6" height="12" rx="3" />
                <path d="M5 11.5a7 7 0 0 0 14 0M12 18.5V22M8.5 22h7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={act.botSend}
              aria-label="Enviar"
              className="flex w-[54px] flex-none cursor-pointer items-center justify-center rounded-xl border-none bg-brand-green-dark shadow-[0_10px_26px_-10px_rgba(0,156,59,0.6)]"
            >
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}

        {listen && bq?.kind === "yesno" && (
          <div className={`${styles.slideUp} flex gap-2.5`}>
            <button
              type="button"
              onClick={() => act.answerDone(true)}
              className="min-h-14 flex-1 cursor-pointer rounded-xl border-[1.5px] border-brand-green-dark/50 bg-brand-green/10 text-lg font-extrabold text-brand-green-dark"
            >
              SIM
            </button>
            <button
              type="button"
              onClick={() => act.answerDone(false)}
              className="min-h-14 flex-1 cursor-pointer rounded-xl border-[1.5px] border-brand-green-dark/50 bg-brand-green/10 text-lg font-extrabold text-brand-green-dark"
            >
              NÃO
            </button>
          </div>
        )}
      </div>

      {s.botModal && (
        <div className={`${styles.modalFade} fixed inset-0 z-[80] flex items-end justify-center bg-brand-ink/55 p-[18px] backdrop-blur-sm`}>
          <div className={`${styles.sheetUp} flex w-full max-w-[400px] flex-col gap-4 rounded-3xl border border-brand-green-dark/25 bg-white p-[22px] shadow-[0_-20px_60px_-20px_rgba(11,27,59,0.4)]`}>
            <div className="flex justify-center" aria-hidden>
              <div className="flex h-8 w-11 items-center justify-center gap-[7px] rounded-[11px] border-[1.5px] border-brand-green-dark/55 bg-[linear-gradient(180deg,#26262b,#1a1a1d)]">
                <span className="h-3 w-2 rounded-full bg-brand-green-light" />
                <span className="h-3 w-2 rounded-full bg-brand-green-light" />
              </div>
            </div>
            <p className="text-center text-[13px] font-extrabold uppercase tracking-[0.08em] text-brand-green-dark">
              É isso mesmo?
            </p>
            <div className="flex items-center justify-center gap-4 px-1">
              {(["Fundamental", "Médio"] as const).map((level) => {
                const selected = s.botLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={act.botFixLevel}
                    className="flex cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent"
                    style={{ opacity: selected ? 1 : 0.4 }}
                  >
                    <span
                      className="flex size-[34px] items-center justify-center rounded-full border-[2.5px]"
                      style={{
                        borderColor: selected ? "var(--color-brand-green-dark)" : "var(--color-brand-border)",
                        background: selected ? "rgba(0,156,59,0.12)" : "transparent",
                        boxShadow: selected ? "0 0 16px rgba(0,156,59,0.35)" : "none",
                      }}
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke={selected ? "var(--color-brand-green-dark)" : "var(--color-brand-muted)"} aria-hidden>
                        <path d={LEVEL_ICON[level]} />
                      </svg>
                    </span>
                    <span
                      className="text-center text-[11px] font-extrabold uppercase tracking-[0.03em]"
                      style={{ color: selected ? "var(--color-brand-green-dark)" : "var(--color-brand-muted)" }}
                    >
                      {level}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={act.botFixDone}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-blue/[0.03] p-3"
            >
              <span className={`text-[15px] font-extrabold ${s.botDone ? "text-brand-green-dark" : "text-brand-danger"}`}>
                {s.botDone ? "✓ Terminou" : "✗ Não terminou"}
              </span>
            </button>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={act.botConfirmAll}
                className={`${styles.shiny} min-h-14 cursor-pointer rounded-xl border-none bg-brand-green-dark text-lg font-extrabold text-white shadow-[0_12px_32px_-12px_rgba(0,156,59,0.6)]`}
              >
                Tá certo!
              </button>
              <button
                type="button"
                onClick={act.botCloseModal}
                className="min-h-11 cursor-pointer border-none bg-transparent text-sm font-bold text-brand-muted underline underline-offset-4"
              >
                corrigir algo
              </button>
            </div>
          </div>
        </div>
      )}

      {s.botConfetti &&
        s.botConfs.map((conf, i) => (
          <span
            key={i}
            aria-hidden
            className={`${styles.conf} fixed -top-3 z-[82] h-[13px] w-2 rounded-sm`}
            style={{ left: conf.left, background: conf.color, animationDelay: conf.delay }}
          />
        ))}
    </>
  );
}
