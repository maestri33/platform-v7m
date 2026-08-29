"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpCircle, X, CheckCircle2, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import type { CandidateMe } from "@/lib/api-collaborators";

export function PixDiagnosticDrawer({
  candidateMe,
  weekPaid = 0,
  weekTotal = "R$ 0,00",
  buttonText = "Por que meu Pix ainda não caiu?",
}: {
  candidateMe?: CandidateMe | null;
  weekPaid?: number;
  weekTotal?: string;
  buttonText?: string;
}) {
  const [open, setOpen] = useState(false);

  const pixValidated = candidateMe?.pix_validated === true;
  const hasBlocks = Boolean(candidateMe?.blocks && candidateMe.blocks.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-brand-blue hover:underline font-semibold cursor-pointer"
        aria-label="Abrir diagnóstico de pagamento Pix"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
        <span>{buttonText}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Diagnóstico de repasse Pix"
        >
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-brand-border bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                  Diagnóstico de Pagamentos
                </p>
                <h3 className="text-base font-extrabold text-brand-ink">
                  Status do seu repasse Pix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-brand-muted hover:text-brand-ink hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Regra de Ouro do Repasse */}
            <div className="rounded-xl bg-slate-50 border border-brand-border/60 p-3 text-xs text-brand-ink space-y-1">
              <p className="font-bold text-brand-blue flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                Como funciona o fechamento:
              </p>
              <p className="text-brand-muted leading-relaxed">
                As comissões de matrículas confirmadas fecham <strong>toda sexta-feira às 18h</strong> e são transferidas automaticamente para sua chave Pix cadastrada.
              </p>
            </div>

            {/* Itens do Diagnóstico */}
            <div className="space-y-2.5 text-xs">
              {/* 1. Status da Chave Pix */}
              <div className="rounded-xl border border-brand-border/60 bg-white p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-ink flex items-center gap-1.5">
                    {pixValidated ? (
                      <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />
                    )}
                    1. Chave Pix Cadastrada
                  </span>
                  <span
                    className={`font-bold ${
                      pixValidated ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {pixValidated ? "Validada ✓" : "Pendente"}
                  </span>
                </div>
                <p className="text-brand-muted">
                  {pixValidated
                    ? "Sua chave Pix está confirmada no seu nome para receber pagamentos."
                    : "Você ainda não vinculou uma chave Pix válida. Cadastre para não atrasar seu repasse."}
                </p>
                {!pixValidated && (
                  <Link
                    href="/onboarding/pix"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 font-bold text-brand-blue hover:underline pt-1"
                  >
                    <span>Cadastrar chave Pix</span>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>

              {/* 2. Status dos Documentos / Validação */}
              <div className="rounded-xl border border-brand-border/60 bg-white p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-ink flex items-center gap-1.5">
                    {!hasBlocks ? (
                      <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-4 text-red-500" aria-hidden="true" />
                    )}
                    2. Validação Cadastral
                  </span>
                  <span
                    className={`font-bold ${
                      !hasBlocks ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {!hasBlocks ? "Regular ✓" : "Ajuste Necessário"}
                  </span>
                </div>
                <p className="text-brand-muted">
                  {!hasBlocks
                    ? "Sem pendências cadastrais impedindo a liberação de saques."
                    : "Existem documentos ou fotos reprovados que retêm o saque até o reenvio."}
                </p>
                {hasBlocks && candidateMe?.blocks?.[0] && (
                  <Link
                    href={candidateMe.blocks[0].action_route || "/onboarding"}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 font-bold text-red-600 hover:underline pt-1"
                  >
                    <span>{candidateMe.blocks[0].action_label || "Resolver pendência"}</span>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>

              {/* 3. Matrículas na Semana */}
              <div className="rounded-xl border border-brand-border/60 bg-white p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-ink flex items-center gap-1.5">
                    <Clock className="size-4 text-brand-blue" aria-hidden="true" />
                    3. Matrículas Desta Semana
                  </span>
                  <span className="font-black text-brand-blue">
                    {weekPaid} matrícula(s) · {weekTotal}
                  </span>
                </div>
                <p className="text-brand-muted">
                  {weekPaid > 0
                    ? `Total de ${weekTotal} agendado para o fechamento desta sexta-feira às 18h.`
                    : "Nenhuma matrícula paga confirmada nesta semana até o momento."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
