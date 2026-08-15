import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { Lead, PromoterSummary } from "@/lib/api/types";
import { readUnlockedSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leads" };

/**
 * 3 estados por lead: aguardando pagamento; pago nesta semana (comissão cai no
 * fechamento de sexta); pago em semana passada (comissão já repassada).
 * Distinção pago×recebido pelo `week_start` do summary — criado antes da semana
 * corrente = fechamento anterior, já pago.
 */
type LeadState = "waiting" | "paid_pending" | "paid_settled";

function leadState(lead: Lead, weekStart: Date | null): LeadState {
  if (lead.status !== "paid") return "waiting";
  if (weekStart && new Date(lead.created_at) < weekStart) return "paid_settled";
  return "paid_pending";
}

export default async function LeadsPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const [leads, summary] = await Promise.all([
    djangoFetch<Lead[]>("/api/v1/collaborators/promoter/me/leads"),
    djangoFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary"),
  ]);
  const weekStart = summary.week_start ? new Date(summary.week_start) : null;

  return (
    <PageShell width="default">
      <CompactHeader
        kicker="V7M · Promotor"
        title="Seus leads"
        subtitle="Aguardando pagamento, pago (cai na próxima sexta) ou já recebido — em fechamentos anteriores."
      />

      {leads.length === 0 ? (
        <div className="auth-card space-y-4">
          <p className="text-[var(--surface-text-muted)]">
            Seus primeiros leads vão aparecer aqui. Compartilhe seu link de
            captação — cada matrícula paga é R$100 no seu Pix.
          </p>
          <Button href="/painel">Pegar meu link de captação</Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => {
            const state = leadState(l, weekStart);
            return (
              <li key={l.external_id}>
                <div className="auth-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        aria-hidden
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gold/15 font-display text-brand-gold-ink"
                      >
                        {(l.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-display text-base leading-snug">
                          {l.name || "Lead sem nome"}
                        </h2>
                        <p className="text-xs text-[var(--surface-text-muted)] mt-0.5">
                          {new Date(l.created_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    {state === "paid_settled" ? (
                      <Badge tone="ok">Recebido ✓</Badge>
                    ) : state === "paid_pending" ? (
                      <Badge tone="gold">Pago · cai sexta</Badge>
                    ) : (
                      <Badge tone="warn">Aguardando</Badge>
                    )}
                  </div>
                  {state === "waiting" && l.phone && (
                    <a
                      href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chamar ${l.name || "o lead"} no WhatsApp`}
                      className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold hover:border-brand-gold transition-colors"
                    >
                      Chamar no WhatsApp ↗
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
