"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpCircle, X, CheckCircle2, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { CandidateMe, PromoterSummary, Commission } from "@/lib/api/types";

export function PixDiagnosticDrawer({
  candidateMe,
  summary,
  commissions = [],
  buttonText = "Por que meu Pix ainda não caiu?",
}: {
  candidateMe?: CandidateMe | null;
  summary?: PromoterSummary | null;
  commissions?: Commission[];
  buttonText?: string;
}) {
  const [open, setOpen] = useState(false);

  const pixValidated = candidateMe?.pix_validated === true;
  const hasBlocks = Boolean(candidateMe?.blocks && candidateMe.blocks.length > 0);
  const failedCommissions = commissions.filter((c) => c.status === "failed");

  const weekPaid = summary?.week_paid_leads ?? 0;
  const weekTotal = summary?.week_commission_total ?? "0.00";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-brand-gold-ink dark:text-brand-gold-light hover:underline font-medium cursor-pointer"
        aria-label="Abrir diagnóstico de pagamento Pix"
      >
        <HelpCircle size={14} aria-hidden="true" />
        <span>{buttonText}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Diagnóstico de repasse Pix"
        >
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-brand-gold/40 bg-[var(--bg)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--surface-border)] pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold-ink dark:text-brand-gold-light">
                  Diagnóstico Automático
                </p>
                <h3 className="font-display text-lg text-[var(--surface-text)]">
                  Status do seu repasse Pix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] hover:bg-[var(--surface)] transition-colors cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Regra de Ouro do Repasse */}
            <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] p-3 text-xs text-[var(--surface-text)] space-y-1">
              <p className="font-semibold text-brand-gold-ink dark:text-brand-gold-light flex items-center gap-1.5">
                <Clock size={14} aria-hidden="true" />
                Como funciona o fechamento:
              </p>
              <p className="text-[var(--surface-text-muted)] leading-relaxed">
                As comissões de matrículas confirmadas fecham <strong>toda sexta-feira às 18h</strong> e são transferidas automaticamente para sua chave Pix.
              </p>
            </div>

            {/* Itens do Diagnóstico baseado em /me */}
            <div className="space-y-2.5 text-xs">
              {/* 1. Status da Chave Pix */}
              <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--surface-text)] flex items-center gap-1.5">
                    {pixValidated ? (
                      <CheckCircle2 size={15} className="text-brand-ok" aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={15} className="text-amber-400" aria-hidden="true" />
                    )}
                    1. Chave Pix Cadastrada
                  </span>
                  <span
                    className={`font-semibold ${
                      pixValidated ? "text-brand-ok" : "text-amber-400"
                    }`}
                  >
                    {pixValidated ? "Validada ✓" : "Pendente"}
                  </span>
                </div>
                <p className="text-[var(--surface-text-muted)]">
                  {pixValidated
                    ? "Sua chave Pix está confirmada no seu nome para receber pagamentos."
                    : "Você ainda não vinculou uma chave Pix válida. Cadastre agora para não atrasar seu repasse."}
                </p>
                {!pixValidated && (
                  <Link
                    href="/pix"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 font-semibold text-brand-gold-ink hover:underline pt-1"
                  >
                    <span>Cadastrar chave Pix</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </Link>
                )}
              </div>

              {/* 2. Status dos Documentos / Validação */}
              <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--surface-text)] flex items-center gap-1.5">
                    {!hasBlocks ? (
                      <CheckCircle2 size={15} className="text-brand-ok" aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={15} className="text-rose-400" aria-hidden="true" />
                    )}
                    2. Validação Cadastral
                  </span>
                  <span
                    className={`font-semibold ${
                      !hasBlocks ? "text-brand-ok" : "text-rose-400"
                    }`}
                  >
                    {!hasBlocks ? "Regular ✓" : "Ajuste Necessário"}
                  </span>
                </div>
                <p className="text-[var(--surface-text-muted)]">
                  {!hasBlocks
                    ? "Sem pendências cadastrais impedindo a liberação de saques."
                    : "Existem documentos ou fotos reprovados que retêm o saque até o reenvio."}
                </p>
                {hasBlocks && candidateMe?.blocks?.[0] && (
                  <Link
                    href={candidateMe.blocks[0].action_route || "/documento"}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 font-semibold text-rose-400 hover:underline pt-1"
                  >
                    <span>{candidateMe.blocks[0].action_label || "Resolver pendência"}</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </Link>
                )}
              </div>

              {/* 3. Matrículas na Semana */}
              <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--surface-text)] flex items-center gap-1.5">
                    <Clock size={15} className="text-brand-gold" aria-hidden="true" />
                    3. Matrículas Desta Semana
                  </span>
                  <span className="font-bold text-brand-gold">
                    {weekPaid} matrícula(s) · {formatBRL(weekTotal)}
                  </span>
                </div>
                <p className="text-[var(--surface-text-muted)]">
                  {weekPaid > 0
                    ? `Total de ${formatBRL(weekTotal)} agendado para o fechamento desta sexta-feira às 18h.`
                    : "Nenhuma matrícula paga confirmada nesta semana até o momento."}
                </p>
              </div>

              {/* 4. Erros de Transferência se houver */}
              {failedCommissions.length > 0 && (
                <div className="rounded-[var(--radius-sm)] border border-rose-500/50 bg-rose-500/10 p-3 space-y-1 text-rose-200">
                  <p className="font-bold">⚠️ Falha no envio do Pix</p>
                  <p className="text-[11px]">
                    Identificamos uma tentativa de transferência que falhou. Por favor, confira e atualize sua chave Pix na tela de configurações.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-full border border-[var(--surface-border)] py-2.5 text-xs font-semibold text-[var(--surface-text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
