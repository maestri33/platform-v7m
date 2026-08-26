import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Clock, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { PixDiagnosticDrawer } from "@/components/ui/pix-diagnostic-drawer";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, Commission, PromoterSummary } from "@/lib/api/types";
import { getFunnelChecklist } from "@/lib/candidate/funnel";
import { formatBRL } from "@/lib/format";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOutsider, OUTSIDE_APP_URL } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Comissões" };

const FALLBACK_SUMMARY: PromoterSummary = {
  week_goal: 5,
  week_paid_leads: 0,
  week_commission_total: "0.00",
  bonus_amount: "500.00",
  goal_reached: false,
  next_closing_at: "2026-08-28T21:00:00.000Z",
  lifetime: { total_received: "0.00", total_students: 0, goals_hit: 0 },
};

// Origem da comissão em pt-BR (enum cru do backend nunca chega ao usuário).
const SOURCE_LABEL: Record<string, string> = {
  lead: "Matrícula paga",
  enrollment: "Matrícula paga",
  bonus: "Bônus da meta",
  goal_bonus: "Bônus da meta",
};

function sourceLabel(sourceType: string): string {
  return SOURCE_LABEL[sourceType] ?? "Comissão";
}

export default async function ComissoesPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");
  if (isOutsider(session.roles)) redirect(OUTSIDE_APP_URL);

  const [commissions, candidateMe, summary] = await Promise.all([
    djangoFetch<Commission[]>(
      "/api/v1/collaborators/promoter/me/commissions",
    ).catch(() => []),
    djangoFetch<CandidateMe>(
      "/api/v1/collaborators/candidate/me",
    ).catch(() => null),
    djangoFetch<PromoterSummary>(
      "/api/v1/collaborators/promoter/me/summary",
    ).catch(() => FALLBACK_SUMMARY),
  ]);

  const checklist = candidateMe ? getFunnelChecklist(candidateMe) : [];
  const completedCount = checklist.filter((item) => item.state === "approved").length;
  const isAllApproved = checklist.length > 0 && completedCount === checklist.length;

  // `amount` é STRING decimal — somar como número só pra exibição
  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  const lifetimeReceived = Number(summary.lifetime.total_received) || totalPaid;
  const weekExpected =
    Number(summary.week_commission_total) +
    (summary.goal_reached ? Number(summary.bonus_amount) : 0);

  // Se o cadastro não está 100% aprovado, o valor previsto fica bloqueado para liberação
  const amountBlocked = isAllApproved ? 0 : weekExpected || totalPending;
  const amountToReleaseFriday = isAllApproved ? weekExpected || totalPending : 0;

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Promotor"
        title="Suas comissões"
        subtitle="R$ 100 por matrícula paga + R$ 500 de bônus fixo ao bater 5 na semana. Fecha toda sexta às 18h, pago via Pix."
      />

      {/* Grid de Ganhos: Acumulado vs Sai na Sexta vs Bloqueado por Validação */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] p-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--surface-text-muted)]">
            Acumulado Recebido
          </p>
          <p className="font-display text-lg font-bold text-[var(--surface-text)] tabular-nums mt-0.5">
            {formatBRL(lifetimeReceived)}
          </p>
          <p className="text-[10px] text-[var(--surface-text-muted)] mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-brand-ok shrink-0" aria-hidden="true" />
            Total repassado via Pix
          </p>
        </div>

        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-brand-gold/40 p-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-brand-gold-ink dark:text-brand-gold-light">
            Sai na Sexta
          </p>
          <p className="font-display text-lg font-bold text-brand-gold tabular-nums mt-0.5">
            {formatBRL(amountToReleaseFriday)}
          </p>
          <p className="text-[10px] text-[var(--surface-text-muted)] mt-1 flex items-center gap-1">
            <Clock size={12} className="text-brand-gold shrink-0" aria-hidden="true" />
            Fechamento sexta 18h
          </p>
        </div>

        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] p-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--surface-text-muted)]">
            Bloqueado por Validação
          </p>
          <p
            className={`font-display text-lg font-bold tabular-nums mt-0.5 ${
              amountBlocked > 0 ? "text-amber-400" : "text-[var(--surface-text-muted)]"
            }`}
          >
            {formatBRL(amountBlocked)}
          </p>
          <p className="text-[10px] text-[var(--surface-text-muted)] mt-1 flex items-center gap-1">
            <Lock size={12} className="shrink-0 text-amber-400" aria-hidden="true" />
            {isAllApproved ? "Nenhum bloqueio" : "Liberado após dossiê"}
          </p>
        </div>
      </div>

      {/* Aviso contextual se houver retenção */}
      {!isAllApproved && amountBlocked > 0 && (
        <div className="banner banner-warn flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">
              Dossiê pendente ({completedCount}/5 concluídos)
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              Conclua o envio de documentos e chave Pix para receber seus ganhos automaticamente nesta sexta-feira às 18h.
            </p>
          </div>
          <Link
            href="/painel"
            className="shrink-0 rounded-full bg-brand-gold px-3 py-1.5 text-xs font-bold text-black hover:opacity-90 transition-opacity"
          >
            Ver checklist
          </Link>
        </div>
      )}


      {/* Diagnóstico Integrado: "Por que não caiu o Pix?" */}
      <div className="flex items-center justify-between border-y border-[var(--surface-border)] py-2 px-1">
        <PixDiagnosticDrawer
          candidateMe={candidateMe}
          summary={summary}
          commissions={commissions}
          buttonText="Dúvidas sobre o Pix? Abrir diagnóstico do repasse"
        />
      </div>

      {/* Lista de comissões */}
      {commissions.length === 0 ? (
        <div className="auth-card text-[var(--surface-text-muted)] space-y-2">
          <p>
            Suas comissões vão aparecer aqui conforme as matrículas dos seus indicados forem confirmadas.
          </p>
          <p className="text-xs">
            Cada matrícula paga é creditada na sua conta no fechamento da semana — toda sexta-feira às 18h direto na sua chave Pix.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {commissions.map((c) => (
            <li key={c.external_id}>
              <div className="auth-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">{formatBRL(c.amount)}</p>
                    <p className="text-xs text-[var(--surface-text-muted)]">
                      {sourceLabel(c.source)} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge
                    tone={
                      c.status === "paid"
                        ? "ok"
                        : c.status === "failed"
                          ? "danger"
                          : "muted"
                    }
                  >
                    {c.status === "paid"
                      ? "Paga ✓"
                      : c.status === "failed"
                        ? "Falhou ⚠️"
                        : "Pendente"}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
