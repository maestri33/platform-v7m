"use client";

import type { ReactNode } from "react";
import {
  FunnelEntryCard,
  FunnelEyebrow,
  FunnelField,
  FunnelFieldLabel,
  FunnelHint,
  FunnelStatus,
  FunnelTitle,
  BackPill,
  StepBar,
  OtpInput,
  ResendCodePill,
  TypingBubble,
  ErrorBox,
} from "../index";

export interface PhoneOtpCardProps {
  /** Passo atual: "phone" para digitar o WhatsApp, "otp" para digitar o código de 6 dígitos */
  step: "phone" | "otp";
  /** Valor do telefone formatado ex: (11) 99999-9999 */
  phone: string;
  onPhoneChange?: (val: string) => void;
  onPhoneSubmit?: () => void;
  phoneBusy?: boolean;
  phonePlaceholder?: string;

  /** Código OTP de 6 dígitos */
  otp: string;
  onOtpChange?: (val: string) => void;
  otpBusy?: boolean;

  /** Cooldown de reenvio do OTP em segundos */
  resendSeconds?: number;
  onResend?: () => void;

  /** Botão de voltar */
  onBack?: () => void;

  /** Mensagem de erro ou null */
  error?: string | null;

  /** Textos customizáveis */
  eyebrow?: string;
  title?: string;
  subtitle?: string;

  /** Slots adicionais para banners, selos ou rodapés especiais */
  bannerSlot?: ReactNode;
  footerSlot?: ReactNode;
}

/**
 * Componente canônico de login/registro via WhatsApp OTP do ecossistema V7M.
 * Usado tanto no Portal do Aluno quanto no Portal de Gestão (Promotor/Hub/Admin).
 */
export function PhoneOtpCard({
  step,
  phone,
  onPhoneChange,
  onPhoneSubmit,
  phoneBusy = false,
  phonePlaceholder = "(00) 00000-0000",
  otp,
  onOtpChange,
  otpBusy = false,
  resendSeconds = 0,
  onResend,
  onBack,
  error,
  eyebrow,
  title,
  subtitle,
  bannerSlot,
  footerSlot,
}: PhoneOtpCardProps) {
  const waiting = resendSeconds > 0;

  if (step === "otp") {
    return (
      <FunnelEntryCard
        error={Boolean(error)}
        header={
          <div className="flex w-full flex-col gap-3">
            <StepBar step={1} label="código" />
            <div className="flex items-center justify-between gap-2">
              {onBack ? <BackPill onClick={onBack} /> : <div />}
              <FunnelEyebrow>{eyebrow || "✦ Código de acesso"}</FunnelEyebrow>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <FunnelTitle as="h1">{title || "Confirma que é você?"}</FunnelTitle>
              <FunnelHint>
                {subtitle || (
                  <>
                    Enviamos um código de 6 dígitos no WhatsApp{" "}
                    <b className="font-semibold text-brand-ink">{phone || "informado"}</b>.
                  </>
                )}
              </FunnelHint>
            </div>
          </div>
        }
      >
        <div className="flex w-full flex-col items-center gap-4">
          <TypingBubble />

          {error ? <ErrorBox message={error} /> : null}

          <div className="flex w-full flex-col gap-2">
            <span className="text-center text-xs font-bold uppercase tracking-widest text-brand-muted">
              Seu código
            </span>
            <OtpInput
              length={6}
              value={otp}
              onChange={onOtpChange || (() => {})}
              disabled={otpBusy}
            />
            <FunnelHint className="text-center">
              Pode digitar, estamos te aguardando.
            </FunnelHint>
          </div>

          {otpBusy && <FunnelStatus>Conferindo seu código…</FunnelStatus>}

          {onResend ? (
            <ResendCodePill
              waiting={waiting}
              seconds={resendSeconds}
              onClick={onResend}
            />
          ) : null}

          {footerSlot ? <div className="w-full pt-2">{footerSlot}</div> : null}
        </div>
      </FunnelEntryCard>
    );
  }

  // Step === "phone"
  return (
    <FunnelEntryCard
      as="form"
      onSubmit={(e) => {
        e.preventDefault();
        onPhoneSubmit?.();
      }}
      error={Boolean(error)}
      header={
        <div className="flex flex-col gap-1">
          {bannerSlot}
          <FunnelEyebrow>{eyebrow || "Acesso Rápido"}</FunnelEyebrow>
          <FunnelTitle>{title || "Qual é o seu WhatsApp?"}</FunnelTitle>
        </div>
      }
      footer={
        phoneBusy ? (
          <FunnelStatus>Verificando seu número…</FunnelStatus>
        ) : (
          <FunnelHint>
            {subtitle || "É só digitar — a gente segue sozinho assim que o número estiver completo."}
          </FunnelHint>
        )
      }
    >
      <FunnelHint>
        Informe seu WhatsApp pessoal para receber o link seguro de acesso. Dados protegidos pela LGPD.
      </FunnelHint>

      {error ? <ErrorBox message={error} /> : null}

      <FunnelField invalid={Boolean(error)}>
        <FunnelFieldLabel htmlFor="v7m-phone-input">Seu WhatsApp</FunnelFieldLabel>
        <input
          id="v7m-phone-input"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={16}
          placeholder={phonePlaceholder}
          value={phone}
          aria-invalid={Boolean(error)}
          onChange={(e) => onPhoneChange?.(e.target.value)}
          className="min-h-14 w-full border-none bg-transparent text-center text-2xl font-bold tracking-wide text-brand-ink outline-none placeholder:font-normal placeholder:text-brand-muted"
        />
      </FunnelField>

      {footerSlot ? <div className="w-full pt-2">{footerSlot}</div> : null}
    </FunnelEntryCard>
  );
}
