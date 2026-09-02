"use client";

import {
  Card,
  BrandDots,
  StudentCredentialCard,
  Button,
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
    <main id="conteudo" className="flex flex-1 px-6 pt-3 pb-8">
      <Card pad="md" className="mx-auto my-auto flex w-full max-w-md flex-col gap-4">
        <BrandDots size="sm" />

        {/* Saudação de boas-vindas */}
        <div className="flex flex-col gap-1 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-green-dark">
            Bem-vindo de volta
          </p>
          <h1 className="text-[22px] font-extrabold leading-[1.15] tracking-tight text-brand-ink">
            Sua vaga continua te esperando, {firstName}
          </h1>
          <p className="text-[13px] leading-snug text-brand-muted">
            Você já fez a parte mais difícil: decidiu voltar a estudar. Falta um passo pra
            transformar essa decisão em diploma.
          </p>
        </div>

        {/* Credencial institucional moderna do @v7m/ui */}
        <div className="flex w-full justify-center">
          <StudentCredentialCard
            name={s.name}
            photo={null}
            protocol={protocol}
            issuedAt={issuedAt}
            badgeText="⏳ Aguardando matrícula"
            className="border-brand-border/80 shadow-md"
          />
        </div>

        {s.stage === "lead" && (
          <div className="flex flex-col gap-2.5">
            {!semCheckout && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white/75 px-4 py-2.5 shadow-sm">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-brand-green-dark">
                    <span aria-hidden className="size-[7px] rounded-full bg-brand-green" />
                    Pagamento já preparado
                  </span>
                  <span className="text-[15px] font-extrabold text-brand-ink">{methodLabel}</span>
                  <span className="text-[13px] font-semibold text-brand-muted">
                    {methodPrice} · taxa única, sem mensalidade
                  </span>
                </div>
                <button
                  type="button"
                  onClick={act.goPlanos}
                  className="flex-none cursor-pointer border-none bg-transparent text-[13px] font-bold text-brand-blue hover:underline"
                >
                  Trocar
                </button>
              </div>
            )}

            <Button
              variant="primary"
              onClick={act.resumeCheckout}
              className="w-full shadow-[0_12px_30px_-12px_rgba(0,156,59,0.6)]"
            >
              Quero mudar de vida →
            </Button>
            <p className="text-center text-[11px] leading-snug text-brand-muted">
              Aprovação na hora · matrícula liberada em minutos
            </p>
          </div>
        )}

        <div aria-hidden className="-my-0.5 h-px w-full bg-brand-border opacity-70" />
        <button
          type="button"
          onClick={act.logout}
          className="min-h-8 cursor-pointer self-center border-none bg-transparent text-[13px] font-semibold text-brand-muted underline underline-offset-4 hover:text-brand-ink transition-colors"
        >
          Sair da conta
        </button>
      </Card>
    </main>
  );
}
