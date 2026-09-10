"use client";

import { FunnelMain, PhoneOtpCard } from "@v7m/ui";
import { maskBrPhone } from "@/lib/phone";

import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * Login (OTP) — passo 2 do funil de lead.
 * Padronizado no design system @v7m/ui usando o componente canônico PhoneOtpCard.
 */
export function ScreenLogin({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <FunnelMain>
      <PhoneOtpCard
        step="otp"
        phone={maskBrPhone(s.phone) || "informado"}
        otp={s.otp}
        onOtpChange={act.setOtp}
        otpBusy={s.otpBusy}
        resendSeconds={s.otpSeconds}
        onResend={act.onResend}
        onBack={() => act.nav("check", "left")}
        error={s.cardError ? "Código incorreto ou expirado. Tente novamente." : null}
      />
    </FunnelMain>
  );
}
