"use client";

import { useEffect, useRef } from "react";

import { MODALS, type ModalKind } from "./flow-data";
import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

/** Ícone animado por tipo de modal — cada erro tem personalidade própria. */
function ModalIcon({ kind }: { kind: ModalKind }) {
  switch (kind) {
    case "server":
      // disco voador 🛸 flutuando com raio — "zuando"
      return (
        <span className="relative flex size-[88px] items-center justify-center overflow-hidden rounded-full bg-brand-blue-bg">
          <svg className={`${styles.ufo} size-[54px] overflow-visible`} viewBox="0 0 48 48" fill="none" aria-hidden>
            <path className={styles.ufoBeam} d="M16 24 L32 24 L39 46 L9 46 Z" fill="var(--color-brand-yellow)" opacity="0.5" />
            <ellipse cx="24" cy="21" rx="15" ry="6" fill="var(--color-brand-blue)" />
            <path d="M15 19c1-4 4-6 9-6s8 2 9 6" fill="none" stroke="var(--color-brand-blue-bright)" strokeWidth="2.4" />
            <ellipse cx="24" cy="12" rx="6.5" ry="5" fill="var(--color-brand-blue-bright)" opacity="0.9" />
            <circle cx="15" cy="22" r="1.6" fill="#fff" />
            <circle cx="24" cy="24" r="1.6" fill="#fff" />
            <circle cx="33" cy="22" r="1.6" fill="#fff" />
          </svg>
        </span>
      );
    case "invalid":
      // telefone tremendo forte + carimbo de proibido entrando
      return (
        <span className={`${styles.hardshake} relative flex size-20 items-center justify-center rounded-full bg-brand-danger-bg text-brand-danger`}>
          <svg className="size-[34px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </svg>
          <svg className={`${styles.stampHard} absolute inset-0 size-20 text-brand-danger`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="10.2" />
            <path d="M5 5l14 14" />
          </svg>
        </span>
      );
    case "otp":
      // 👀 balançando — "presta atenção no que tá fazendo"
      return (
        <span className={`${styles.wobble} flex size-[88px] items-center justify-center rounded-full bg-brand-danger-bg text-[42px] leading-none`}>
          👀
        </span>
      );
    case "cpfinvalid":
      return (
        <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-brand-danger-bg text-brand-danger">
          <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="11" r="2" />
            <path d="M6 15.2c0-1.3 1.1-2.2 2.5-2.2s2.5 .9 2.5 2.2" />
            <path d="M14 10h4M14 13.5h4" />
          </svg>
          <span className={`${styles.scanline} absolute inset-x-4 h-0.5 rounded-sm bg-brand-danger shadow-[0_0_8px_var(--color-brand-danger)]`} />
        </span>
      );
    case "exists":
      // proteção de identidade: escudo + cadeado com anel pulsando
      return (
        <span className="relative flex size-20 items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
          <span className={`${styles.ringPulse} absolute inset-0 rounded-full border-2 border-brand-blue-bright`} />
          <svg className="size-[38px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6z" />
            <rect x="9.3" y="11.2" width="5.4" height="4.6" rx="1" />
            <path d="M10.4 11.2v-1.1a1.6 1.6 0 0 1 3.2 0v1.1" />
          </svg>
        </span>
      );
    case "support":
      return (
        <span className="flex size-[76px] items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
          <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 16v-4a7 7 0 0 1 14 0v4" />
            <rect x="3" y="15" width="4" height="6" rx="1.5" />
            <rect x="17" y="15" width="4" height="6" rx="1.5" />
            <path d="M19 19a4 4 0 0 1-4 3" />
          </svg>
        </span>
      );
    case "slow":
      // café ☕ com vapor
      return (
        <span className="flex size-[76px] items-center justify-center rounded-full bg-brand-yellow text-brand-ink">
          <svg className="size-[34px] overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className={styles.steam} style={{ animationDelay: "0s" }} d="M8 3v2" />
            <path className={styles.steam} style={{ animationDelay: ".45s" }} d="M12 3v2" />
            <path className={styles.steam} style={{ animationDelay: ".9s" }} d="M16 3v2" />
            <path d="M4 9h14v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
            <path d="M18 10h2a2 2 0 0 1 0 4h-2" />
          </svg>
        </span>
      );
    case "unverified":
      return (
        <span className="flex size-[76px] items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
          <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className={styles.wifi} style={{ animationDelay: ".3s" }} d="M5 12.5a10 10 0 0 1 14 0" />
            <path className={styles.wifi} style={{ animationDelay: ".15s" }} d="M8.5 15.5a5 5 0 0 1 7 0" />
            <circle className={styles.wifi} cx="12" cy="19" r="1" />
          </svg>
        </span>
      );
    case "staff":
      // 🙌 saltitante — número sem role de cliente → portal da equipe
      return (
        <span className={`${styles.boing} flex size-[88px] items-center justify-center rounded-full bg-brand-blue-bg text-[44px] leading-none`}>
          🙌
        </span>
      );
    case "client":
      return (
        <span className={`${styles.boing} flex size-[88px] items-center justify-center rounded-full bg-brand-green-bg text-[44px] leading-none`}>
          🎓
        </span>
      );
    case "expired":
      return (
        <span className="flex size-[76px] items-center justify-center rounded-full bg-brand-danger-bg text-brand-danger">
          <svg className={`${styles.hour} size-8`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      );
    case "resent":
      return (
        <span className="flex size-[76px] items-center justify-center overflow-hidden rounded-full bg-brand-green-bg text-brand-green-dark">
          <svg className={`${styles.plane} size-8`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4z" />
          </svg>
        </span>
      );
    case "offline":
      return (
        <span className="flex size-[76px] items-center justify-center rounded-full bg-brand-danger-bg text-brand-danger">
          <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className={styles.wifi} d="M5 12.5a10 10 0 0 1 14 0" />
            <path className={styles.wifi} d="M8.5 15.5a5 5 0 0 1 7 0" />
            <circle cx="12" cy="19" r="1" />
            <path d="M3 3l18 18" />
          </svg>
        </span>
      );
    case "success":
      return (
        <span className={`${styles.modalPop} flex size-[76px] items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark`}>
          <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className={styles.draw} d="M5 13l4 4L19 7" pathLength="1" />
          </svg>
        </span>
      );
    case "sessionexpired":
      return (
        <span className="flex size-[76px] items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
          <svg className={`${styles.tilt} size-[34px]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="9" cy="9" r="5" />
            <path d="M12.5 12.5 20 20M17 17l2.5-2.5M14.5 14.5 17 12" />
          </svg>
        </span>
      );
    case "docerror":
      // folha de documento com ✕ — upload reprovado (tipo/tamanho/leitura)
      return (
        <span className={`${styles.hardshake} flex size-20 items-center justify-center rounded-full bg-brand-danger-bg text-brand-danger`}>
          <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9.6 12.6l4.8 4.8M14.4 12.6l-4.8 4.8" />
          </svg>
        </span>
      );
  }
}

/**
 * Modal padrão do funil (fade + escurece tudo): um componente, 16 personalidades.
 * `exists`/`cpfinvalid` viram bottom-sheet premium com 2 botões (padrão de
 * proteção de identidade); os demais são cards centrais com 1 botão.
 */
export function LeadModal({
  kind,
  act,
  docError,
}: {
  kind: ModalKind;
  act: FlowActions;
  docError?: FlowState["docError"];
}) {
  // docerror é o único com copy dinâmica: o motivo vem do estado (tipo errado,
  // pesado demais, CNH, ilegível…) — o resto usa o texto fixo do MODALS.
  const base = MODALS[kind];
  const copy = kind === "docerror" && docError ? { ...base, ...docError } : base;
  const isSheet = kind === "exists" || kind === "cpfinvalid";

  // `sessionexpired` não tem "fechar": a sessão guardada aponta pra um usuário que não existe
  // mais, então ficar na tela do OTP é um beco sem saída. Backdrop, Esc e botão levam todos ao
  // mesmo lugar — recomeçar o funil do telefone.
  const dismiss = kind === "sessionexpired" ? act.restartFunnel : act.closeModal;

  // Acessibilidade: foco entra no primeiro botão, Esc fecha (mesmo caminho do
  // backdrop), Tab fica preso no modal e, ao fechar, o foco volta pro campo da
  // tela (OTP/CPF/telefone/e-mail) pronto pra digitar de novo.
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = boxRef.current;
    box?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !box) return;
      const els = Array.from(box.querySelectorAll<HTMLElement>("button"));
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.querySelector<HTMLElement>("main input:not([disabled])")?.focus();
    };
  }, [kind, act, dismiss]);
  const primaryLabel = kind === "cpfinvalid" ? "Revisar CPF" : "Recuperar acesso";
  const primaryAction = kind === "cpfinvalid" ? act.closeModal : act.onExistsUseNumber;
  // Erro transitório: o botão RE-EXECUTA a verificação com o valor já digitado
  // (padrão "modal explica → componente pronto pra nova tentativa").
  const isTransient =
    kind === "server" || kind === "slow" || kind === "offline" || kind === "unverified";
  const onPrimary =
    kind === "success"
      ? act.onSuccessContinue
      : kind === "staff" || kind === "client"
        ? act.goV7m
        : kind === "support"
          ? act.supportWhats
          : isTransient
            ? act.retryTransient
            : dismiss;
  const btnBg =
    kind === "support"
      ? "bg-brand-danger"
      : kind === "staff" || kind === "client"
        ? "bg-brand-blue-bright"
        : "bg-brand-green-dark shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]";

  return (
    <div
      className={`${styles.modalFade} fixed inset-0 z-[80] flex justify-center bg-brand-ink/55 backdrop-blur-sm ${
        isSheet ? "items-end p-0" : "items-center p-6"
      }`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col items-center gap-3.5 border border-white/60 bg-white/95 px-6 pt-7 text-center shadow-[0_-10px_50px_-12px_rgba(0,0,0,0.4)] backdrop-blur-xl pb-[max(28px,env(safe-area-inset-bottom))] ${
          isSheet
            ? `${styles.sheetUp} max-w-[460px] rounded-t-[28px]`
            : `${styles.modalPop} max-w-[360px] rounded-[28px]`
        }`}
      >
        <ModalIcon kind={kind} />
        <h2 className="text-xl font-extrabold text-brand-ink">{copy.title}</h2>
        <p className="text-[15px] leading-relaxed text-brand-muted">{copy.body}</p>
        {isSheet ? (
          <div className="flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={primaryAction}
              className={`${styles.shiny} flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-brand-green-dark px-5 text-[17px] font-bold text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]`}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={act.openSupport}
              className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-brand-danger/35 bg-brand-danger/10 px-5 text-[17px] font-bold text-brand-danger"
            >
              Falar com o suporte
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPrimary}
            className={`${btnBg.includes("green") ? styles.shiny : ""} flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl px-5 text-lg font-bold text-white ${btnBg}`}
          >
            {copy.btn}
          </button>
        )}
      </div>
    </div>
  );
}
