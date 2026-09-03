"use client";

import {
  FunnelEntryCard,
  FunnelEyebrow,
  FunnelHint,
  FunnelMain,
  FunnelStatus,
  FunnelTitle,
  BackPill,
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
    <FunnelMain>
      <FunnelEntryCard
        error={s.cardError}
        header={
          <div className="flex w-full flex-col gap-3">
            <StepBar step={1} label="código" />
            <div className="flex items-center justify-between gap-2">
              <BackPill onClick={() => act.nav("check", "left")} />
              <FunnelEyebrow>✦ Código de acesso</FunnelEyebrow>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <FunnelTitle as="h1">Confirma que é você?</FunnelTitle>
              <FunnelHint>
                Enviamos um código de 6 dígitos no WhatsApp{" "}
                <b className="font-semibold text-brand-ink">
                  {maskBrPhone(s.phone) || "informado"}
                </b>
                .
              </FunnelHint>
            </div>
          </div>
        }
      >
        <div className="flex w-full flex-col items-center gap-4">
          <TypingBubble />

          <div className="flex w-full flex-col gap-2">
            <span className="text-center text-xs font-bold uppercase tracking-widest text-brand-muted">
              Seu código
            </span>
            <OtpInput
              length={6}
              value={s.otp}
              onChange={act.setOtp}
              disabled={s.otpBusy}
            />
            <FunnelHint className="text-center">
              Pode digitar, tô te esperando aqui.
            </FunnelHint>
          </div>

          {s.otpBusy && <FunnelStatus>Conferindo seu código…</FunnelStatus>}

          <ResendCodePill
            waiting={waiting}
            seconds={s.otpSeconds}
            onClick={act.onResend}
          />
        </div>
      </FunnelEntryCard>
    </FunnelMain>
  );
}
