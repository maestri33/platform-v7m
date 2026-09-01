"use client";

import {
  FunnelEntryCard,
  BackPill,
  InlineSpinner,
  StepBar,
  OtpInput,
  ResendCodePill,
  TypingBubble,
} from "@v7m/ui";
import { maskBrPhone } from "@/lib/phone";

import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * Login (OTP) — passo 2 do funil de lead.
 * Padronizado no design system @v7m/ui usando FunnelEntryCard.
 */
export function ScreenLogin({ s, act }: { s: FlowState; act: FlowActions }) {
  const waiting = s.otpSeconds > 0;

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-3">
      <div className="m-auto flex w-full max-w-md flex-col gap-2.5 py-2">
        <FunnelEntryCard
          error={s.cardError}
          header={
            <div className="flex w-full flex-col gap-3">
              <StepBar step={1} label="código" />
              <div className="flex items-center justify-between">
                <BackPill onClick={() => act.nav("check", "left")} />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-green-dark">
                  ✦ Código de acesso
                </span>
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h1 className="text-[23px] font-extrabold tracking-tight text-brand-ink">
                  Confirma que é você?
                </h1>
                <p className="text-sm leading-relaxed text-brand-muted">
                  Enviamos um código de 6 dígitos no WhatsApp{" "}
                  <b className="font-semibold text-brand-ink">
                    {maskBrPhone(s.phone) || "informado"}
                  </b>
                  .
                </p>
              </div>
            </div>
          }
        >
          <div className="flex w-full flex-col items-center gap-4">
            <TypingBubble />

            <div className="flex w-full flex-col gap-2">
              <span className="text-center text-xs font-bold uppercase tracking-wider text-brand-muted">
                Seu código
              </span>
              <OtpInput
                length={6}
                value={s.otp}
                onChange={act.setOtp}
                disabled={s.otpBusy}
              />
              <p className="text-center text-[13px] leading-relaxed text-brand-muted">
                Pode digitar, tô te esperando aqui.
              </p>
            </div>

            {s.otpBusy && (
              <div
                className="flex items-center gap-2 self-center text-sm font-bold text-brand-blue"
                role="status"
              >
                <InlineSpinner className="size-[18px]" />
                Conferindo seu código…
              </div>
            )}

            <ResendCodePill
              waiting={waiting}
              seconds={s.otpSeconds}
              onClick={act.onResend}
            />
          </div>
        </FunnelEntryCard>
      </div>
    </main>
  );
}
