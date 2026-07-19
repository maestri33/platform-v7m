"use client";

import styles from "./lead-flow.module.css";
import { BackgroundGradient } from "@/components/ui/background-gradient";

import { DOC_STATUS, PENDING_DOCS, SENT_DOCS, type SentDoc } from "./flow-data";
import { Parchment, ParchmentPhoto } from "./primitives";
import type { FlowActions, FlowState } from "./use-lead-flow";

const DOC_ICON: Record<SentDoc["key"], React.ReactNode> = {
  rg: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M6 15.4c0-1.3 1.1-2.2 2.5-2.2s2.5.9 2.5 2.2" />
      <path d="M14 10h4M14 13.5h3" />
    </>
  ),
  proof: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  edu: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
    </>
  ),
  selfie: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18a6 6 0 0 1 11 0" />
    </>
  ),
};

function SentDocTile({ doc, onTap }: { doc: SentDoc; onTap: () => void }) {
  const st = DOC_STATUS[doc.status];
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex cursor-pointer items-center gap-2.5 rounded-[14px] border px-[11px] py-2.5 text-left"
      style={{ borderColor: st.border, background: st.tileBg }}
    >
      <span
        className="flex size-[38px] flex-none items-center justify-center rounded-[11px]"
        style={{ background: st.pillBg, color: st.pillColor }}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {DOC_ICON[doc.key]}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-extrabold text-brand-ink">
          {doc.label}
        </span>
        <span
          className="mt-[3px] inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold"
          style={{ background: st.pillBg, color: st.pillColor }}
        >
          {st.label}
        </span>
      </span>
    </button>
  );
}

/**
 * App do aluno — home em lista vertical (mobile-first), continuação do funil
 * do lead. Persona inicial: recém-matriculado, documentos em análise.
 * Status de cada doc virá do backend; `platformReady` libera o botão de aula.
 */
export function ScreenHome({ s, act }: { s: FlowState; act: FlowActions }) {
  const firstName = s.name.split(" ")[0] || "Aluno";
  const pendingTotal = PENDING_DOCS.filter((d) => !("maleOnly" in d && d.maleOnly) || s.sex === "M").length;

  return (
    <main id="conteudo" className="flex flex-1 px-4 pb-7 pt-4">
      <div className="mx-auto flex w-full max-w-[468px] flex-col gap-3.5">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/50 bg-white/70 px-[18px] py-5 shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-[5px]" aria-hidden>
              <span className="h-1.5 w-[26px] rounded-full bg-brand-green" />
              <span className="h-1.5 w-[26px] rounded-full bg-brand-yellow" />
              <span className="h-1.5 w-[26px] rounded-full bg-brand-blue" />
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brand-green-dark/30 bg-brand-green-bg px-[11px] py-[5px] text-[11px] font-extrabold uppercase tracking-[0.05em] text-brand-green-dark">
              <span aria-hidden className="size-1.5 rounded-full bg-brand-green" />
              Aluno
            </span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-brand-muted">Que bom te ver de volta,</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-brand-ink">
              {firstName} 👋
            </h1>
            <p className="mt-1.5 inline-flex items-center gap-[5px] text-[12.5px] font-bold text-brand-blue">
              <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {s.studentPolo}
            </p>
          </div>

          <BackgroundGradient containerClassName="mx-auto w-full max-w-[300px]" className="rounded-3xl bg-white/85 px-[15px] pb-4 pt-[13px] backdrop-blur-md">
            <p className="mb-[9px] text-center text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-brand-blue/80">
              Carteira do aluno
            </p>
            <div className="flex w-full flex-col items-center">
              <Parchment rollerClassName="h-3.5" bodyClassName="px-4 pb-5 pt-[18px]">
                <div className="flex flex-col items-center gap-2">
                  <ParchmentPhoto size={70} />
                  <p className="text-center font-serif text-base font-extrabold leading-tight tracking-[0.01em] text-[#3f2f12]">
                    {s.name.toUpperCase()}
                  </p>
                  <div aria-hidden className="h-px w-[46px] bg-[rgba(120,90,30,0.4)]" />
                  <p className="text-center font-serif text-xs leading-normal text-[#5b4a24]">
                    Matrícula <strong className="text-[#3f2f12]">Supletivo Brasil</strong>
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(166,124,0,0.45)] bg-[rgba(255,223,0,0.18)] px-[13px] py-[5px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#8a6a00]">
                    ⏳ Matrícula em análise
                  </span>
                </div>
              </Parchment>
            </div>
          </BackgroundGradient>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2.5">
              <span className="text-[12.5px] font-extrabold text-brand-ink">
                Análise dos seus documentos
              </span>
              <span className="text-xs font-extrabold text-brand-blue">55%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-blue/10">
              <div
                className="h-full w-[55%] rounded-full bg-gradient-to-r from-brand-green to-brand-blue-bright"
                role="progressbar"
                aria-valuenow={55}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-2 text-[12.5px] leading-normal text-brand-muted">
              Recebemos os documentos da sua matrícula (RG, comprovante, escolaridade e selfie).
              Assim que aprovarmos, suas aulas liberam.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={act.onAula}
          className={`${styles.shiny} flex w-full cursor-pointer items-center gap-[13px] rounded-[20px] border-none bg-brand-green-dark px-[18px] py-[17px] text-left text-white shadow-[0_14px_30px_-12px_rgba(0,156,59,0.6)]`}
        >
          <span className="flex size-[46px] flex-none items-center justify-center rounded-[14px] bg-white/[0.18]">
            <svg viewBox="0 0 24 24" className="size-[26px]" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold">Assistir aula</span>
            <span className="block text-[12.5px] font-semibold text-white/85">
              Entrar na plataforma de estudos
            </span>
          </span>
          <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        <div className="rounded-[20px] border border-white/60 bg-white/70 px-4 py-[15px] shadow-[0_8px_24px_-14px_rgba(11,27,59,0.3)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-brand-ink">Documentos enviados</h3>
            <span className="text-[11px] font-bold text-brand-muted">toque pra ver</span>
          </div>
          <div className="flex flex-col gap-2">
            {SENT_DOCS.map((doc) => (
              <SentDocTile key={doc.key} doc={doc} onTap={() => act.onDocTap(doc)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={act.onPending}
            className="flex cursor-pointer items-center gap-[13px] rounded-2xl border border-[rgba(255,159,0,0.4)] bg-[#fff6d6] px-4 py-3.5 text-left"
          >
            <span className="flex size-11 flex-none items-center justify-center rounded-[13px] bg-[rgba(255,223,0,0.32)]">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#8a6d00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h4" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-brand-ink">Seus documentos</span>
              <span className="block text-xs font-semibold text-brand-muted">
                Liberado após aprovar a matrícula
              </span>
            </span>
            <span className="flex-none rounded-full bg-[rgba(255,159,0,0.18)] px-[11px] py-[5px] text-xs font-extrabold text-[#8a6d00]">
              0/{pendingTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={act.onProva}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-border bg-white/70 px-[15px] py-[13px] text-left opacity-[0.62]"
          >
            <span className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-brand-blue-bg text-brand-blue">
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <path d="M8 9h8M8 13h6" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-brand-ink">Prova</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-muted">
                <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                Bloqueada · libera após os documentos
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="size-[18px] flex-none opacity-50" fill="none" stroke="var(--color-brand-muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={act.onDiploma}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-border bg-white/70 px-[15px] py-[13px] text-left opacity-80"
          >
            <span className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-[rgba(255,223,0,0.25)] text-[#8a6d00]">
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="8" r="5" />
                <path d="M8.5 12.5 7 21l5-2.5L17 21l-1.5-8.5" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-brand-ink">Diploma</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-muted">
                <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                Ao concluir o curso
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="size-[18px] flex-none opacity-50" fill="none" stroke="var(--color-brand-muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={act.onSuporte}
            className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-brand-green/[0.22] bg-brand-green/[0.06] px-4 py-[13px] text-left"
          >
            <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-[#25D366]">
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="#fff" aria-hidden>
                <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.7c.1.1.1.3 0 .5l-.3.4-.3.3c-.1.1-.2.3-.1.5.1.2.5.9 1.2 1.5.9.8 1.6 1 1.8 1.1.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.5-.1 1z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-extrabold text-brand-ink">
                Precisa de ajuda?
              </span>
              <span className="block text-xs font-semibold text-brand-muted">
                Fale com a gente no WhatsApp
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="var(--color-brand-green-dark)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
