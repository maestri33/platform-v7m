"use client";

import {
  DiplomaFlag,
  BrandSlogan,
  FunnelEntryCard,
  FunnelEyebrow,
  FunnelField,
  FunnelFieldLabel,
  FunnelHint,
  FunnelMain,
  FunnelStatus,
  FunnelTitle,
  IconLockPaths,
  IconMonitorPaths,
  IconShieldPaths,
  TrustBadges,
} from "@v7m/ui";

import type { FlowActions, FlowState } from "./use-lead-flow";

// O TrustBadges desenha o <svg> por fora e recebe só os traços — por isso os
// ícones entram aqui como os fragmentos compartilhados do @v7m/ui, e não como
// SVGs colados nesta tela (eram os mesmos do checkout e do e-mail).
const TRUST_ITEMS = [
  { label: "Validade nacional (MEC)", icon: IconShieldPaths },
  { label: "Pagamento seguro", icon: IconLockPaths },
  { label: "100% online", icon: IconMonitorPaths },
];

/**
 * Início / verificação — passo 1 do caminho da conta. Sem botão: o celular BR
 * completo (11 dígitos) dispara o check sozinho. Número válido cria a conta e
 * cai direto no OTP (o app atual passava por /planos e /register antes).
 */
export function ScreenCheck({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <FunnelMain>
      <div className="pointer-events-none mx-auto w-80 max-w-[min(70%,26vh)]">
        <DiplomaFlag />
      </div>
      <BrandSlogan text="SUA SEGUNDA CHANCE COMEÇA AQUI" />

      <FunnelEntryCard
        as="form"
        onSubmit={act.onCheckSubmit}
        error={s.cardError}
        header={
          <div className="flex flex-col gap-1">
            {/* Só com o NOME resolvido: o `?ref=` é um UUID, e UUID na tela não é selo. */}
            {!!s.promoterName && (
              <div className="mb-0.5 inline-flex items-center gap-1.5 self-start rounded-full border border-brand-green/30 bg-brand-green-bg px-3 py-1.5">
                <svg
                  className="size-3.5 text-brand-green-dark"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="3" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="text-xs font-extrabold text-brand-green-dark">
                  Indicado por <b className="text-brand-ink">{s.promoterName}</b>
                </span>
              </div>
            )}
            <FunnelEyebrow>Entrar ou criar cadastro</FunnelEyebrow>
            <FunnelTitle>Passa seu WhatsApp pra mim?</FunnelTitle>
          </div>
        }
        footer={
          s.checking ? (
            <FunnelStatus>Verificando seu número…</FunnelStatus>
          ) : (
            <FunnelHint>
              É só digitar — a gente segue sozinho assim que o número estiver
              completo.
            </FunnelHint>
          )
        }
      >
        <FunnelHint>
          Pode ficar sossegado, ninguém vai te encher de mensagem. É só pra
          gente te achar, prometo.
        </FunnelHint>

        <FunnelField invalid={s.cardError}>
          <FunnelFieldLabel htmlFor="lead-phone">Seu WhatsApp</FunnelFieldLabel>
          <input
            id="lead-phone"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={16}
            placeholder="(00) 00000-0000"
            value={s.phoneInput}
            aria-invalid={s.cardError}
            onChange={(e) => act.onPhoneInput(e.target.value)}
            className="min-h-14 w-full border-none bg-transparent text-center text-2xl font-bold tracking-wide text-brand-ink outline-none placeholder:font-normal placeholder:text-brand-muted"
          />
        </FunnelField>
      </FunnelEntryCard>

      <TrustBadges items={TRUST_ITEMS} />
    </FunnelMain>
  );
}
