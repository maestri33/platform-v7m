import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Trophy,
  Zap,
  Flame,
  Sprout,
  FileText,
  Home,
  KeyRound,
  GraduationCap,
  Camera,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/countdown";
import { ShareActions } from "@/components/ui/share-actions";
import { BlocksBanner } from "@/components/ui/blocks-banner";
import { PixDiagnosticDrawer } from "@/components/ui/pix-diagnostic-drawer";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOutsider, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { getFunnelChecklist, type ChecklistStepKey } from "@/lib/candidate/funnel";
import { djangoFetch } from "@/lib/api/client";
import { formatBRL } from "@/lib/format";
import type {
  CandidateMe,
  PromoterMe,
  PromoterSummary,
  Commission,
} from "@/lib/api/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Painel" };

const STEP_ICONS: Record<ChecklistStepKey, typeof FileText> = {
  documents: FileText,
  address: Home,
  pix: KeyRound,
  education: GraduationCap,
  selfie: Camera,
};

const FALLBACK_SUMMARY: PromoterSummary = {
  week_goal: 5,
  week_paid_leads: 0,
  week_commission_total: "0.00",
  bonus_amount: "500.00",
  goal_reached: false,
  next_closing_at: "2026-08-28T21:00:00.000Z",
  lifetime: { total_received: "0.00", total_students: 0, goals_hit: 0 },
};

export default async function PainelPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  if (isOutsider(session.roles)) {
    redirect(OUTSIDE_APP_URL);
  }

  // Busca paralela defensiva: dados do candidato, promotor, resumo e comissões
  const [candidateMe, promoterMe, summary, commissions] = await Promise.all([
    djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me").catch(() => null),
    djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me").catch(() => null),
    djangoFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary").catch(
      () => FALLBACK_SUMMARY,
    ),
    djangoFetch<Commission[]>("/api/v1/collaborators/promoter/me/commissions").catch(
      () => [],
    ),
  ]);

  const isRejected = candidateMe?.status === "rejected";


  const checklist = candidateMe ? getFunnelChecklist(candidateMe) : [];
  const completedCount = checklist.filter((item) => item.state === "approved").length;
  const isAllApproved = checklist.length > 0 && completedCount === checklist.length;
  const hasPendingAnalysis = checklist.some((item) => item.state === "pending");
  const hasNeedsAction = checklist.some((item) => item.state === "needs_action");

  // ValidationBlocks combinados sem travar o app
  const allBlocks = [
    ...(candidateMe?.blocks ?? []),
    ...(promoterMe?.blocks ?? []),
  ];

  // Link de captação (do promotor ou sintetizado)
  const refUrl =
    promoterMe?.ref_url ||
    (candidateMe ? `https://supletivo.net.br/?ref=${session.external_id}` : null);

  const goal = summary.week_goal;
  const paid = summary.week_paid_leads;
  const remaining = Math.max(0, goal - paid);
  const weekTotalAmount =
    Number(summary.week_commission_total) +
    (summary.goal_reached ? Number(summary.bonus_amount) : 0);

  return (
    <div className="space-y-4">
      {/* Header com saudação e status */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl text-[var(--surface-text)] truncate">
            Olá, {session.name ?? "Promotor"}
          </h1>
          <p className="text-xs text-[var(--surface-text-muted)]">
            {isAllApproved
              ? "Promotor verificado · Saques liberados"
              : "Ativação instantânea · Indique e acumule"}
          </p>
        </div>
        <Badge tone={isAllApproved ? "ok" : "gold"}>
          {isAllApproved ? "Ativo" : "Iniciado"}
        </Badge>
      </div>

      {/* Banner se houver reprovação cadastral */}
      {isRejected && (
        <div className="banner banner-danger" role="alert">
          <p className="font-bold text-sm">Ajuste necessário no cadastro</p>
          <p className="text-xs mt-1">
            O coordenador do polo solicitou ajustes no seu cadastro. Suas indicações continuam valendo normalmente. Entre em contato com seu polo para regularizar.
          </p>
        </div>
      )}

      {/* Banner de ValidationBlocks sem travar o app */}
      {allBlocks.length > 0 && <BlocksBanner blocks={allBlocks} />}


      {/* Link de captação — Central de Captação Rápida WhatsApp / QR Code / 1-Click */}
      {refUrl && (
        <div className="rounded-[var(--radius)] border border-brand-gold/50 bg-[var(--surface)] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold-ink dark:text-brand-gold-light">
              Seu link de indicação
            </p>
            <span className="text-[10px] text-brand-ok font-semibold">Liberado na hora ✓</span>
          </div>

          <ShareActions refUrl={refUrl} />

          <p className="text-[11px] text-[var(--surface-text-muted)]">
            Cada matrícula confirmada é <strong className="text-brand-gold-ink dark:text-brand-gold-light">R$ 100,00</strong> na sua conta via Pix toda sexta-feira.
          </p>
        </div>
      )}

      {/* HERO: Meta da semana & fechamento */}
      <div className="rounded-[var(--radius)] border border-brand-gold/40 bg-brand-char p-4 text-white">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gold-light">
            Meta da semana
          </p>
          <p className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white">
            fecha em{" "}
            <Countdown
              target={summary.next_closing_at}
              urgentBelowHours={summary.goal_reached ? undefined : 24}
            />
          </p>
        </div>
        <div className="flex items-baseline gap-2 font-display">
          <span aria-hidden className="text-brand-gold">
            {paid >= goal ? (
              <Trophy size={26} className="text-brand-gold inline animate-pulse" />
            ) : paid >= Math.ceil(goal * 0.6) ? (
              <Zap size={26} className="text-brand-gold inline" />
            ) : paid >= 1 ? (
              <Flame size={26} className="text-amber-400 inline" />
            ) : (
              <Sprout size={26} className="text-emerald-400 inline" />
            )}
          </span>
          <span className="text-2xl text-white font-bold">
            {paid}
            <span className="text-sm text-zinc-400 font-normal"> / {goal}</span>
          </span>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: goal }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < paid ? "bg-brand-gold" : "bg-white/15"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-200">
          {summary.goal_reached
            ? `🏆 Bônus de ${formatBRL(summary.bonus_amount)} garantido.`
            : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} pra meta.`}
        </p>

        {/* Badge da Bolsa de Estudos */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] text-brand-gold-light border border-brand-gold/30">
          <Sparkles size={14} className="shrink-0 text-brand-gold" aria-hidden />
          <span>
            Bata 5 matrículas e ganhe <strong>R$ 1.000 no bolso + Bolsa 100% gratuita</strong>.
          </span>
        </div>
      </div>

      {/* Alerta de Loss Aversion: Reta final para o Super Bônus */}
      {remaining > 0 && paid >= 3 && (
        <div className="rounded-[var(--radius)] border border-amber-500/50 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
          <div className="text-xs">
            <p className="font-bold text-amber-300">
              🔥 Você está a {remaining} matrícula{remaining > 1 ? "s" : ""} do Super Bônus de +R$ 500!
            </p>
            <p className="text-[11px] text-[var(--surface-text-muted)]">
              Não deixe seu bônus na mesa no fechamento desta sexta às 18h.
            </p>
          </div>
        </div>
      )}

      {/* Ganhos: Recebido × Sai na Sexta × Diagnóstico */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2 text-[var(--surface-text)]">
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">
              Acumulado Recebido
            </p>
            <p className="font-display text-sm tabular-nums">
              {formatBRL(summary.lifetime.total_received)}
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-brand-gold/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-brand-gold-ink dark:text-brand-gold-light">
              Sai na Sexta
            </p>
            <p className="font-display text-sm tabular-nums font-bold text-brand-gold">
              {formatBRL(weekTotalAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <PixDiagnosticDrawer
            candidateMe={candidateMe}
            summary={summary}
            commissions={commissions}
          />
          <Link
            href="/comissoes"
            className="text-[11px] text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] hover:underline"
          >
            Ver extrato detalhado →
          </Link>
        </div>
      </div>

      {/* Checklist de Validação Assíncrona dos Deveres */}
      {checklist.length > 0 && !isAllApproved && (
        <section className="auth-card space-y-3" aria-label="Deveres para liberação de saques">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-ink dark:text-brand-gold-light">
                Liberação de Saques
              </p>
              <h2 className="font-display text-base text-[var(--surface-text)]">
                {completedCount} de 5 deveres cumpridos
              </h2>
            </div>
            <Badge
              tone={
                hasNeedsAction
                  ? "danger"
                  : hasPendingAnalysis
                    ? "gold"
                    : "warn"
              }
            >
              {hasNeedsAction
                ? "Ajuste Necessário"
                : hasPendingAnalysis
                  ? "Em Análise"
                  : "Pendências"}
            </Badge>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--surface-border)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={completedCount}
            aria-label={`Deveres concluídos: ${completedCount} de 5`}
          >
            <div
              className="h-full rounded-full bg-brand-gold transition-[width] duration-300 ease-out"
              style={{ width: `${(completedCount / 5) * 100}%` }}
            />
          </div>

          <p className="text-xs text-[var(--surface-text-muted)]">
            Suas comissões acumulam automaticamente. Conclua os deveres abaixo no seu tempo para liberar os saques via Pix toda sexta-feira.
          </p>

          <div className="space-y-2 pt-1">
            {checklist.map((item) => {
              const StepIcon = STEP_ICONS[item.key] || FileText;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 transition-colors hover:border-brand-gold/50"
                >
                  <div className="min-w-0 flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-md bg-brand-gold/10 p-1.5 text-brand-gold-ink dark:text-brand-gold-light shrink-0">
                      <StepIcon size={16} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--surface-text)]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[var(--surface-text-muted)] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Badge
                      tone={
                        item.state === "approved"
                          ? "ok"
                          : item.state === "pending"
                            ? "gold"
                            : item.state === "needs_action"
                              ? "danger"
                              : "muted"
                      }
                    >
                      {item.badgeLabel}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
