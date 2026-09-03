"use client";

import {
  BrandDots,
  Button,
  FunnelEntryCard,
  FunnelEyebrow,
  FunnelHint,
  FunnelMain,
  FunnelTitle,
  StudentCredentialCard,
} from "@v7m/ui";
import { formatBRL } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payment";

import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * Painel do lead = tela de retorno (re-engajamento): o lead saiu e voltou, já
 * com checkout gerado no backend. Credencial reservada do aluno + card "Pagamento já
 * preparado" + CTA que retoma o checkout. Pós-pagamento NÃO existe aqui — pago,
 * o parceiro manda o usuário direto pro app do aluno.
 */
export function ScreenPainel({ s, act }: { s: FlowState; act: FlowActions }) {
  const firstName = s.name.split(" ")[0] || "Aluno";
  const protocol = `7M-${(s.externalId || s.phone || "0000").replace(/-/g, "").slice(-4).toUpperCase()}`;
  const issuedAt = new Date().toLocaleDateString("pt-BR");

  // O card fala do checkout VIGENTE (GET /lead/me): o valor é o que SERÁ cobrado, não a
  // vitrine. Enquanto o retrato não chega (ou falhou), degrada pro estado local.
  const co = s.painelCheckout;
  const methodLabel = PAYMENT_LABEL[co?.method ?? s.checkoutMethod];
  const methodPrice = co
    ? formatBRL(co.amount)
    : s.checkoutMethod === "pix"
      ? formatBRL(s.pricing.pix)
      : `${s.pricing.card.installments}× de ${formatBRL(s.pricing.card.installment)}`;
  // Só esconde o card com CERTEZA (retrato carregado e sem checkout) — quem nunca
  // escolheu forma vai pro planos pelo CTA, sem card órfão prometendo pagamento.
  const semCheckout = s.painelLoaded && !co;

  return (
    <FunnelMain>
      {/* Mesmo card das outras seis telas: o painel usava o `Card` genérico
          (raio, borda e sombra diferentes) e era o único fora do padrão. */}
      <FunnelEntryCard
        header={
          <div className="flex w-full flex-col items-center gap-1">
            <BrandDots size="sm" />
            <FunnelEyebrow>Bem-vindo de volta</FunnelEyebrow>
            <FunnelTitle as="h1">
              Sua vaga continua te esperando, {firstName}
            </FunnelTitle>
            <FunnelHint>
              Você já fez a parte mais difícil: decidiu voltar a estudar. Falta
              um passo pra transformar essa decisão em diploma.
            </FunnelHint>
          </div>
        }
        footer={
          <Button
            type="button"
            variant="linkMuted"
            onClick={act.logout}
            className="self-center"
          >
            Sair da conta
          </Button>
        }
      >
        <StudentCredentialCard
          name={s.name}
          photo={null}
          protocol={protocol}
          issuedAt={issuedAt}
          badgeText="⏳ Aguardando matrícula"
          className="border-brand-border shadow-sm"
        />

        {s.stage === "lead" && (
          <div className="flex w-full flex-col gap-2.5">
            {!semCheckout && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-left">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <FunnelEyebrow className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2 rounded-full bg-brand-green-dark"
                    />
                    Pagamento já preparado
                  </FunnelEyebrow>
                  <span className="text-base font-extrabold text-brand-ink">
                    {methodLabel}
                  </span>
                  <span className="text-sm font-semibold text-brand-muted">
                    {methodPrice} · taxa única, sem mensalidade
                  </span>
                </div>
                <Button
                  type="button"
                  variant="link"
                  onClick={act.goPlanos}
                  className="flex-none"
                >
                  Trocar
                </Button>
              </div>
            )}

            <Button
              type="button"
              size="xl"
              variant="primary"
              onClick={act.resumeCheckout}
              className="w-full shadow-[var(--shadow-button)]"
            >
              Quero mudar de vida →
            </Button>
            <p className="text-center text-xs leading-snug text-brand-muted">
              Aprovação na hora · matrícula liberada em minutos
            </p>
          </div>
        )}
      </FunnelEntryCard>
    </FunnelMain>
  );
}
