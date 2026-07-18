"use client";

import styles from "./lead-flow.module.css";
import { EduBot } from "./edu-bot";
import { BackPill } from "./primitives";
import type { FlowActions, FlowState } from "./use-lead-flow";

const SHINY_BTN =
  "flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-brand-green-dark text-[15px] font-bold text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]";

function CameraIcon({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/** Câmera fake do protótipo: guia (rosto ou documento) + botão de disparo. */
function FakeCamera({ s, act }: { s: FlowState; act: FlowActions }) {
  const isFace = s.photoCtx === "selfie";
  const hint =
    s.photoCtx === "rgfront"
      ? "Encaixe a FRENTE do RG"
      : s.photoCtx === "rgback"
        ? "Encaixe o VERSO do RG"
        : s.photoCtx === "proof"
          ? "Encaixe o comprovante inteiro"
          : "Centralize o seu rosto";
  return (
    <div className={`${styles.modalPop} flex flex-col items-center gap-3`}>
      {isFace ? (
        <div className="flex aspect-[3/4] max-h-[300px] w-full items-center justify-center rounded-2xl bg-[#0b1b3b]">
          <div className="flex h-[86%] aspect-[3/4] items-end justify-center rounded-[999px_999px_46%_46%/60%_60%_40%_40%] border-2 border-dashed border-[rgba(56,209,120,0.85)] pb-3.5">
            <span className="text-center text-[11.5px] font-bold text-white/85">{hint}</span>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-[#0b1b3b]">
          <div className="flex aspect-[1.9/1] w-[82%] items-center justify-center rounded-[10px] border-2 border-dashed border-[rgba(56,209,120,0.85)] p-1.5">
            <span className="text-center text-[11.5px] font-bold text-white/85">{hint}</span>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={act.takePhoto}
        aria-label="Tirar foto"
        className="size-[62px] cursor-pointer rounded-full border-4 border-white bg-[linear-gradient(135deg,var(--color-brand-green),var(--color-brand-green-dark))] shadow-[0_10px_26px_-8px_rgba(0,156,59,0.6)]"
      />
    </div>
  );
}

/** Preview da foto fake ("Ficou boa?") — ilustrações SVG no lugar da imagem real. */
function FakePreview({ s, act }: { s: FlowState; act: FlowActions }) {
  const isFace = s.photoCtx === "selfie";
  return (
    <div className={`${styles.modalPop} flex flex-col gap-3`}>
      <div
        className={`flex w-full items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_50%_40%,#16305f,#0b1b3b_82%)] ${
          isFace ? "aspect-[3/4] max-h-[300px]" : "aspect-[16/10]"
        }`}
        aria-hidden
      >
        {(s.photoCtx === "rgfront" || s.photoCtx === "rgback") && (
          <svg viewBox="0 0 150 96" className="h-auto w-[56%] -rotate-2 drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]" fill="none">
            <rect x="2" y="2" width="146" height="92" rx="8" fill="#f4f6fb" stroke="var(--color-brand-yellow)" strokeWidth="1.5" />
            <rect x="12" y="14" width="34" height="42" rx="4" fill="rgba(1,33,105,0.08)" stroke="rgba(1,33,105,0.3)" strokeWidth="1" />
            <rect x="56" y="18" width="80" height="4" rx="2" fill="rgba(1,33,105,0.5)" />
            <rect x="56" y="30" width="60" height="4" rx="2" fill="rgba(1,33,105,0.22)" />
            <rect x="56" y="42" width="70" height="4" rx="2" fill="rgba(1,33,105,0.22)" />
            <rect x="12" y="68" width="124" height="4" rx="2" fill="rgba(1,33,105,0.28)" />
          </svg>
        )}
        {s.photoCtx === "proof" && (
          <svg viewBox="0 0 90 116" className="h-[84%] w-auto -rotate-2 drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]" fill="none">
            <rect x="2" y="2" width="86" height="112" rx="7" fill="#f4f6fb" stroke="var(--color-brand-blue-bright)" strokeWidth="1.5" />
            <rect x="12" y="14" width="50" height="5" rx="2.5" fill="rgba(1,33,105,0.5)" />
            <rect x="12" y="28" width="66" height="4" rx="2" fill="rgba(1,33,105,0.24)" />
            <rect x="12" y="39" width="58" height="4" rx="2" fill="rgba(1,33,105,0.24)" />
            <rect x="12" y="50" width="64" height="4" rx="2" fill="rgba(1,33,105,0.24)" />
            <rect x="12" y="82" width="66" height="7" rx="3.5" fill="rgba(0,156,59,0.25)" />
          </svg>
        )}
        {isFace && (
          <svg viewBox="0 0 120 150" className="h-[88%] w-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]" fill="none">
            <circle cx="60" cy="52" r="26" fill="rgba(255,255,255,0.1)" stroke="var(--color-brand-green-light)" strokeWidth="2" />
            <circle cx="51" cy="49" r="2.6" fill="#fff" />
            <circle cx="69" cy="49" r="2.6" fill="#fff" />
            <path d="M51 62c4 4.6 14 4.6 18 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M22 132c4-24 72-24 76 0" stroke="var(--color-brand-green-light)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
        )}
      </div>
      <p className="text-center text-base font-extrabold text-brand-ink">Ficou boa?</p>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={act.retakePhoto}
          className="min-h-12 flex-1 cursor-pointer rounded-xl border-[1.5px] border-brand-border bg-white text-sm font-bold text-brand-muted"
        >
          Tirar outra
        </button>
        <button
          type="button"
          onClick={act.sendPhoto}
          className="min-h-12 flex-1 cursor-pointer rounded-xl border-none bg-brand-green-dark text-sm font-bold text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

/**
 * Matrícula do aluno (pós-pagamento): Documento (RG) → Endereço → Escolaridade
 * → Selfie. Sem CNH (aluno usa só RG, frente e verso) e uploads simulados —
 * a IA de validação sempre "aprova" após ~1,5s.
 */
export function ScreenEnroll({ s, act }: { s: FlowState; act: FlowActions }) {
  const kicker =
    s.screen === "e_doc"
      ? "Identidade"
      : s.screen === "e_addr"
        ? "Endereço"
        : s.screen === "e_edu"
          ? "Escolaridade"
          : "Confirmação";
  const title =
    s.screen === "e_doc"
      ? "Foto do seu RG"
      : s.screen === "e_addr"
        ? "Comprovante de residência"
        : s.screen === "e_edu"
          ? "Até onde você estudou?"
          : "Selfie de segurança";
  const sub =
    s.screen === "e_doc"
      ? s.docStep === "front"
        ? "Vamos começar pela frente do documento."
        : "Agora o verso do RG."
      : s.screen === "e_addr"
        ? "Um comprovante recente no seu nome ou de um familiar."
        : s.screen === "e_edu"
          ? "É isso que define a trilha que vamos montar pra você."
          : "Só pra confirmar que é você mesmo — rapidinho.";

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-8">
      <div className="m-auto flex w-full max-w-[440px] flex-col items-center gap-3.5">
        <div
          className={`${s.enrollShake ? styles.shake : ""} flex w-full flex-col gap-4 rounded-[28px] border border-white/50 bg-white/[0.78] p-6 shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl`}
        >
          <div aria-hidden className="flex gap-1.5">
            <span className="h-[5px] w-6 rounded-full bg-brand-green" />
            <span className="h-[5px] w-6 rounded-full bg-brand-yellow" />
            <span className="h-[5px] w-6 rounded-full bg-brand-blue-bright" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-green-dark">
              {kicker}
            </p>
            <h1 className="text-[22px] font-extrabold tracking-tight text-brand-ink">{title}</h1>
            <p className="text-[13px] leading-relaxed text-brand-muted">{sub}</p>
          </div>

          {s.camPhase === "camera" && <FakeCamera s={s} act={act} />}
          {s.camPhase === "preview" && <FakePreview s={s} act={act} />}
          {s.camPhase === "sending" && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-[14px] border border-brand-blue-bright/30 bg-brand-blue-bright/10 p-4 text-brand-blue"
            >
              <span
                aria-hidden
                className="size-4 flex-none animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              <span className="font-bold">{s.eSendLabel}</span>
            </div>
          )}

          {s.screen === "e_doc" && !s.camPhase && (
            <div className="flex flex-col items-center gap-3.5">
              <svg viewBox="0 0 140 90" fill="none" className={`${styles.efloat} h-auto w-[150px] max-w-[60%] drop-shadow-[0_12px_22px_rgba(11,27,59,0.18)]`} aria-hidden>
                <rect x="3" y="6" width="134" height="80" rx="10" fill="#fff" stroke="var(--color-brand-blue)" strokeWidth="2" />
                <rect x="3" y="6" width="134" height="16" rx="10" fill="var(--color-brand-blue)" />
                <rect x="14" y="34" width="34" height="42" rx="5" fill="rgba(1,33,105,0.08)" stroke="rgba(1,33,105,0.35)" strokeWidth="1.4" />
                <circle cx="31" cy="48" r="7" fill="none" stroke="rgba(1,33,105,0.5)" strokeWidth="1.6" />
                <path d="M21 70c2-6 6-9 10-9s8 3 10 9" fill="none" stroke="rgba(1,33,105,0.5)" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="58" y="36" width="66" height="5" rx="2.5" fill="rgba(1,33,105,0.55)" />
                <rect x="58" y="49" width="50" height="4" rx="2" fill="rgba(1,33,105,0.28)" />
                <rect x="58" y="60" width="60" height="4" rx="2" fill="rgba(1,33,105,0.28)" />
                <rect x="58" y="71" width="40" height="4" rx="2" fill="rgba(1,33,105,0.28)" />
              </svg>
              <div className="flex items-center gap-2 text-[12.5px] font-bold text-brand-muted">
                <span
                  className={`flex size-[22px] items-center justify-center rounded-full text-[11px] ${
                    s.docStep === "back" ? "bg-brand-green text-white" : "bg-brand-blue text-white"
                  }`}
                >
                  1
                </span>
                Frente
                <span aria-hidden className="h-[1.5px] w-4 bg-brand-border" />
                <span
                  className={`flex size-[22px] items-center justify-center rounded-full text-[11px] ${
                    s.docStep === "back" ? "bg-brand-blue text-white" : "bg-brand-border text-brand-muted"
                  }`}
                >
                  2
                </span>
                Verso
              </div>
              <button type="button" onClick={act.startDocCam} className={SHINY_BTN}>
                <CameraIcon />
                {s.docStep === "front" ? "Tirar foto da frente" : "Tirar foto do verso"}
              </button>
              <p className="text-center text-xs text-brand-muted">
                RG só por foto — a gente pede a frente e depois o verso.
              </p>
            </div>
          )}

          {s.screen === "e_addr" && !s.camPhase && (
            <div className="flex flex-col items-center gap-3.5">
              <svg viewBox="0 0 140 100" fill="none" className={`${styles.efloat} h-auto w-[150px] max-w-[58%] drop-shadow-[0_12px_22px_rgba(11,27,59,0.18)]`} aria-hidden>
                <path d="M16 46 L58 14 L100 46" stroke="var(--color-brand-green-dark)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M24 42 v38 a4 4 0 0 0 4 4 h60 a4 4 0 0 0 4-4 V42" stroke="var(--color-brand-blue)" strokeWidth="2.6" fill="rgba(30,111,224,0.06)" strokeLinecap="round" />
                <rect x="48" y="56" width="20" height="28" rx="2.5" fill="rgba(0,156,59,0.14)" stroke="rgba(0,156,59,0.55)" strokeWidth="1.6" />
                <rect x="98" y="30" width="40" height="56" rx="6" fill="#fff" stroke="var(--color-brand-yellow)" strokeWidth="2" />
                <rect x="106" y="42" width="24" height="3.5" rx="1.75" fill="rgba(1,33,105,0.5)" />
                <rect x="106" y="51" width="18" height="3.5" rx="1.75" fill="rgba(1,33,105,0.26)" />
                <rect x="106" y="60" width="22" height="3.5" rx="1.75" fill="rgba(1,33,105,0.26)" />
                <circle cx="126" cy="76" r="7" fill="none" stroke="var(--color-brand-green)" strokeWidth="1.7" />
                <path d="M123 76l2.2 2.2 4-4.4" stroke="var(--color-brand-green)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex w-full gap-2.5">
                <button
                  type="button"
                  onClick={act.chooseAddrFoto}
                  className="flex min-h-[50px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-xl border-none bg-brand-green-dark text-[13.5px] font-bold text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]"
                >
                  <CameraIcon className="size-4" />
                  Tirar foto
                </button>
                <button
                  type="button"
                  onClick={act.chooseAddrArquivo}
                  className="flex min-h-[50px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-xl border-[1.5px] border-brand-border bg-white text-[13.5px] font-bold text-brand-ink"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  Enviar arquivo
                </button>
              </div>
              <p className="text-center text-xs text-brand-muted">
                Imagem ou PDF · até 10 MB — conta de luz, água ou internet (últimos 3 meses).
              </p>
            </div>
          )}

          {s.screen === "e_edu" && <EduBot s={s} act={act} />}

          {s.screen === "e_selfie" && !s.camPhase && (
            <div className="flex flex-col items-center gap-3.5">
              <svg viewBox="0 0 150 150" fill="none" className={`${styles.efloat} h-auto w-[130px] max-w-[46%] drop-shadow-[0_12px_22px_rgba(11,27,59,0.18)]`} aria-hidden>
                <rect x="40" y="10" width="70" height="130" rx="14" fill="#fff" stroke="var(--color-brand-blue)" strokeWidth="2.2" />
                <circle cx="75" cy="20" r="2.4" fill="var(--color-brand-blue)" />
                <rect x="48" y="28" width="54" height="94" rx="8" fill="#0b1b3b" />
                <circle cx="75" cy="58" r="13" fill="rgba(255,255,255,0.08)" stroke="var(--color-brand-green-light)" strokeWidth="1.8" />
                <circle cx="70" cy="56" r="1.7" fill="#fff" />
                <circle cx="80" cy="56" r="1.7" fill="#fff" />
                <path d="M70 63c2.2 2.6 7.8 2.6 10 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                <path d="M56 114c2.5-13 35.5-13 38 0" stroke="var(--color-brand-green-light)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <circle cx="75" cy="132" r="4" fill="none" stroke="var(--color-brand-green-light)" strokeWidth="1.8" />
              </svg>
              <button type="button" onClick={act.startSelfieCam} className={SHINY_BTN}>
                <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
                </svg>
                Tirar selfie
              </button>
              <p className="text-center text-xs text-brand-muted">
                Rosto bem iluminado, sem óculos escuros e sem chapéu.
              </p>
            </div>
          )}
        </div>

        {["e_addr", "e_edu", "e_selfie"].includes(s.screen) && !s.camPhase && (
          <BackPill onClick={act.goBackE} className="self-center px-5 py-[9px]" />
        )}
      </div>
    </main>
  );
}

/** Matrícula concluída → app do aluno (auto-redirect ~2,6s + botão manual). */
export function ScreenEnrollDone({ act }: { act: FlowActions }) {
  return (
    <main id="conteudo" className="flex flex-1 px-6 py-10">
      <div
        className={`${styles.modalPop} m-auto flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[28px] border border-white/50 bg-white/80 px-6 py-7 text-center shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25)] backdrop-blur-xl`}
      >
        <span className="flex size-[72px] items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark">
          <svg className="size-[38px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className={styles.draw} d="M5 13l4 4L19 7" pathLength="1" />
          </svg>
        </span>
        <h1 className="text-[25px] font-extrabold text-brand-ink">Matrícula concluída! 🎉</h1>
        <p className="flex items-center gap-2 text-sm font-bold text-brand-green-dark" role="status">
          <span
            aria-hidden
            className="size-3.5 flex-none animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Levando você pro app do aluno…
        </p>
        <p className="text-sm leading-[1.65] text-brand-muted">
          Recebemos seu RG, comprovante, escolaridade e selfie. Agora é só estudar — suas aulas te
          esperam no <span className="font-bold text-brand-ink">app.supletivo.net.br</span>.
        </p>
        <div aria-hidden className="h-px w-full bg-brand-border opacity-80" />
        <button
          type="button"
          onClick={act.enterHome}
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl border-none bg-brand-green-dark px-5 text-[15px] font-bold text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]"
        >
          Entrar no meu app
        </button>
      </div>
    </main>
  );
}
