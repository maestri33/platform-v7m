"use client";

import {
  DiplomaFlag,
  BrandSlogan,
  FunnelEntryCard,
  TrustBadges,
  InlineSpinner,
} from "@v7m/ui";

import type { FlowActions, FlowState } from "./use-lead-flow";

const TRUST_ITEMS = [
  {
    label: "Validade nacional (MEC)",
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    label: "Pagamento seguro",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    label: "100% online",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
];

/**
 * Início / verificação — passo 1 do caminho da conta. Sem botão: o celular BR
 * completo (11 dígitos) dispara o check sozinho. Número válido cria a conta e
 * cai direto no OTP (o app atual passava por /planos e /register antes).
 */
export function ScreenCheck({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <main id="conteudo" className="flex flex-1 px-6 py-3">
      <div className="m-auto flex w-full max-w-md flex-col gap-2.5 py-2">
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
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-green-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-green-dark">
                Entrar ou criar cadastro
              </p>
              <h2 className="text-[23px] font-extrabold tracking-tight text-brand-ink">
                Passa seu WhatsApp pra mim?
              </h2>
            </div>
          }
          footer={
            s.checking ? (
              <div className="flex items-center gap-2 text-sm font-bold text-brand-blue" role="status">
                <InlineSpinner />
                Verificando seu número…
              </div>
            ) : (
              <p className="text-xs leading-normal text-brand-muted">
                É só digitar — a gente segue sozinho assim que o número estiver completo.
              </p>
            )
          }
        >
          <p className="text-[13px] leading-normal text-brand-muted">
            Pode ficar sossegado, ninguém vai te encher de mensagem. É só pra gente te achar,
            prometo.
          </p>

          <div className="w-full rounded-[18px] border border-brand-blue/15 bg-brand-blue/5 p-4">
            <label
              htmlFor="lead-phone"
              className="mb-2 block text-left text-xs font-bold uppercase tracking-[0.06em] text-brand-muted"
            >
              Seu WhatsApp
            </label>
            <input
              id="lead-phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={16}
              placeholder="(00) 00000-0000"
              value={s.phoneInput}
              aria-invalid={s.cardError}
              onChange={(e) => act.onPhoneInput(e.target.value)}
              className={`min-h-[58px] w-full rounded-[14px] border-[1.5px] bg-white/60 px-4 text-center text-[23px] font-bold tracking-[0.06em] text-brand-ink outline-none backdrop-blur-md placeholder:font-normal placeholder:text-brand-muted/40 ${
                s.cardError ? "border-brand-danger" : "border-brand-border"
              }`}
            />
          </div>
        </FunnelEntryCard>

        <TrustBadges items={TRUST_ITEMS} />
      </div>
    </main>
  );
}
