"use client";

import styles from "./lead-flow.module.css";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { Card } from "@/components/ui/card";
import { BrandDots } from "@/components/ui/brand-dots";
import { formatBRL } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payment";

import { Parchment, ParchmentPortrait } from "./primitives";
import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * Painel do lead = tela de retorno (re-engajamento): o lead saiu e voltou, já
 * com checkout gerado no backend. Diplominha reservado + card "Pagamento já
 * preparado" + CTA que retoma o checkout. Pós-pagamento NÃO existe aqui — pago,
 * o parceiro manda o usuário direto pro app do aluno.
 */
export function ScreenPainel({ s, act }: { s: FlowState; act: FlowActions }) {
  const firstName = s.name.split(" ")[0] || "Aluno";
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
    <main id="conteudo" className="flex flex-1 px-6 py-10">
      <Card pad="lg" className="m-auto flex w-full max-w-md flex-col gap-6">
        <BrandDots size="md" />

        {/* Ordem do protótipo: a SAUDAÇÃO acolhe primeiro; o diplominha vem como prova,
            não como abertura (comparação ponta-a-ponta 2026-07-27). */}
        <div className="flex flex-col gap-1.5 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-green-dark">
            Bem-vindo de volta
          </p>
          <h1 className="text-[25px] font-extrabold leading-[1.15] tracking-tight text-brand-ink">
            Sua vaga continua te esperando, {firstName}
          </h1>
          <p className="text-[14.5px] leading-relaxed text-brand-muted">
            Você já fez a parte mais difícil: decidiu voltar a estudar. Falta um passo pra
            transformar essa decisão em diploma.
          </p>
        </div>

        <BackgroundGradient containerClassName="mx-auto w-full max-w-[320px]" className="rounded-3xl bg-white/85 px-4 pb-[18px] pt-3.5 backdrop-blur-md">
          <p className="mb-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.15em] text-brand-blue/80">
            Seu futuro diploma
          </p>
          <div className="flex w-full flex-col items-center">
            <Parchment>
              <div className="flex flex-col items-center gap-[9px]">
                {/* /lead/me não expõe a foto do zap — monograma das iniciais, como o
                    pergaminho do CPF degrada. Câmera-placeholder aqui leria como pendência. */}
                <ParchmentPortrait name={s.name} photo={null} size={74} />
                <p className="text-center font-serif text-[17px] font-extrabold leading-tight tracking-[0.01em] text-[#3f2f12]">
                  {s.name.toUpperCase()}
                </p>
                <div aria-hidden className="h-px w-12 bg-[rgba(120,90,30,0.4)]" />
                <p className="text-center font-serif text-[13px] leading-[1.55] text-[#5b4a24]">
                  Certificado de conclusão
                  <br />
                  <strong className="text-[#3f2f12]">reservado em seu nome</strong>
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(166,124,0,0.45)] bg-[rgba(255,223,0,0.18)] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#8a6a00]">
                  ⏳ Aguardando matrícula
                </span>
              </div>
            </Parchment>
          </div>
        </BackgroundGradient>

        {s.stage === "lead" && (
          <div className="flex flex-col gap-3.5">
            {!semCheckout && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white/75 px-4 py-3.5">
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
                className="flex-none cursor-pointer border-none bg-transparent text-[13px] font-bold text-brand-blue"
              >
                Trocar
              </button>
            </div>
            )}
            <button
              type="button"
              onClick={act.resumeCheckout}
              className={`${styles.shiny} flex min-h-[60px] cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-brand-green-dark px-5 text-[19px] font-extrabold tracking-tight text-white shadow-[0_12px_30px_-12px_rgba(0,156,59,0.6)]`}
            >
              Quero mudar de vida →
            </button>
            <p className="text-center text-[13px] leading-relaxed text-brand-muted">
              Aprovação na hora · matrícula liberada em minutos
            </p>
          </div>
        )}

        <div aria-hidden className="mt-1 h-px w-full bg-brand-border opacity-70" />
        <button
          type="button"
          onClick={act.logout}
          className="min-h-11 cursor-pointer self-center border-none bg-transparent text-[13px] font-semibold text-brand-muted underline underline-offset-4"
        >
          Sair da conta
        </button>
      </Card>
    </main>
  );
}
