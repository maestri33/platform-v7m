"use client";

import { useEffect, useState } from "react";
import { LeadsManagerTab } from "@/components/dashboard/leads-manager-tab";
import { PageShell } from "@/components/ui/page-shell";
import { listHubs, listLeads, type Hub, type LeadRow } from "@/lib/api";

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [leadsData, hubsData] = await Promise.all([
        listLeads().catch(() => []),
        listHubs().catch(() => []),
      ]);
      setLeads(leadsData);
      setHubs(hubsData);
    } catch {
      setLeads([]);
      setHubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PageShell
      title="Leads de Captação"
      subtitle="Contatos captados por promotores em todos os polos, status de checkout e resgate manual de pagamentos."
    >
      <LeadsManagerTab
        leads={leads}
        hubs={hubs}
        loading={loading}
        onRefresh={loadData}
      />
    </PageShell>
  );
}

