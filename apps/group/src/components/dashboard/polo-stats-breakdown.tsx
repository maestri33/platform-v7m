"use client";

import { Card } from "@v7m/ui";
import type { Hub, LeadRow } from "@/lib/api";

interface PoloStatsBreakdownProps {
  hubs: Hub[] | null;
  leads: LeadRow[] | null;
}

export function PoloStatsBreakdown({ hubs, leads }: PoloStatsBreakdownProps) {
  if (!hubs || hubs.length === 0) return null;

  const totalLeads = leads?.length ?? 0;

  // Calcula leads por polo
  const hubStats = hubs.map((hub) => {
    const hubLeads = (leads ?? []).filter((l) => {
      const hId = l.hub_external_id || l.hub_id || l.hub;
      return hId === hub.external_id;
    });

    const paidLeads = hubLeads.filter((l) => {
      const status = String(l.status || "").toLowerCase();
      return status === "paid" || status === "pago";
    });

    const percentOfTotal = totalLeads > 0 ? Math.round((hubLeads.length / totalLeads) * 100) : 0;
    const conversionRate =
      hubLeads.length > 0 ? Math.round((paidLeads.length / hubLeads.length) * 100) : 0;

    return {
      hub,
      count: hubLeads.length,
      paidCount: paidLeads.length,
      percentOfTotal,
      conversionRate,
    };
  });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-brand-ink">Distribuição e Conversão por Polo</h3>
          <p className="text-xs text-brand-muted">
            Volume de leads captados e índice de conversão em cada polo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hubStats.map(({ hub, count, paidCount, percentOfTotal, conversionRate }) => (
          <div
            key={hub.external_id}
            className="flex flex-col justify-between rounded-xl border border-brand-border bg-slate-50/70 p-3.5"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-brand-ink">{hub.brand}</span>
                <div className="flex items-center gap-1.5">
                  {conversionRate > 0 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {conversionRate}% conversão
                    </span>
                  )}
                  {hub.is_default && (
                    <span className="rounded bg-brand-green-bg px-1.5 py-0.5 text-[10px] font-bold text-brand-green-dark">
                      Padrão
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-brand-muted">
                {count} leads ({paidCount} pagos)
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-brand-muted">Participação no funil</span>
                <span className="text-brand-ink">{percentOfTotal}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-blue transition-all"
                  style={{ width: `${Math.max(percentOfTotal, 4)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
