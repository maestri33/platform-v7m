"use client";

import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { OtpInput } from "@/components/ui/otp-input";
import { maskBrPhone } from "@/lib/phone";

import styles from "./lead-flow.module.css";
import { BackPill, InlineSpinner, StepBar } from "./primitives";
import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * Login (OTP) — passo 2. Sem botão "Entrar": o 6º dígito confirma sozinho.
 * "Reenviar" é uma pílula discreta — vermelha no cooldown, verde ao liberar.
 */
export function ScreenLogin({ s, act }: { s: FlowState; act: FlowActions }) {
  const waiting = s.otpSeconds > 0;
  return (
    <main id="conteudo" className="flex flex-1 px-6 py-8">
      <Card className="m-auto flex w-full max-w-md flex-col gap-4">
        <StepBar step={1} label="código" />
        <BackPill onClick={() => act.nav("check", "left")} />

        <IconBadge>
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
            <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
          </svg>
        </IconBadge>

        <h1 className="text-center text-[26px] font-extrabold text-brand-ink">
          Confirma que é você?
        </h1>
        <p className="text-center text-base leading-relaxed text-brand-muted">
          Mandei um código pro WhatsApp {maskBrPhone(s.phone) || "informado"}. É só digitar ele aqui
          embaixo.
        </p>

        <div className="flex flex-col items-center gap-2">
          <div
            aria-hidden
            className="inline-flex items-center gap-[7px] rounded-[18px_18px_18px_5px] bg-brand-blue-bg px-4 py-3 shadow-[0_8px_20px_-8px_rgba(1,33,105,0.35)]"
          >
            <span className={`${styles.typeDot} size-[9px] rounded-full bg-brand-blue-bright`} style={{ animationDelay: "0s" }} />
            <span className={`${styles.typeDot} size-[9px] rounded-full bg-brand-blue-bright`} style={{ animationDelay: "0.15s" }} />
            <span className={`${styles.typeDot} size-[9px] rounded-full bg-brand-blue-bright`} style={{ animationDelay: "0.3s" }} />
          </div>
          <p className="text-center text-[13px] font-bold text-brand-green-dark">
            🤫 Psiu… o código secreto já tá voando pro seu WhatsApp!
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-center text-[15px] font-bold text-brand-ink">Seu código</span>
          <OtpInput length={6} value={s.otp} onChange={act.setOtp} disabled={s.otpBusy} />
          <p className="text-center text-[13px] leading-relaxed text-brand-muted">
            Pode digitar, tô te esperando aqui.
          </p>
        </div>

        {s.otpBusy && (
          <div className="flex items-center gap-2 self-center text-sm font-bold text-brand-blue" role="status">
            <InlineSpinner className="size-[18px]" />
            Conferindo seu código…
          </div>
        )}

        <button
          type="button"
          onClick={act.onResend}
          disabled={waiting}
          className={`inline-flex items-center gap-1.5 self-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors duration-300 ${
            waiting
              ? "cursor-default border-brand-danger/30 bg-brand-danger/10 text-brand-danger"
              : "cursor-pointer border-brand-green-dark/35 bg-brand-green-dark/10 text-brand-green-dark"
          }`}
        >
          <svg className="size-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {waiting ? `Reenviar em ${s.otpSeconds}s` : "Reenviar código"}
        </button>
      </Card>
    </main>
  );
}
