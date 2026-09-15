"use client";

import { useState } from "react";

import { PageShell } from "@v7m/ui";
import { CommissionsPanel, PayoutsPanel } from "./_components/lists";
import { ClosingPanel, ManualPaymentForm } from "./_components/money-actions";
import {
  CashflowCockpit,
  DisputesPanel,
  LedgerPanel,
  SovereignActionsPanel,
} from "./_components/sovereignty-panels";

type Tab =
  | "caixa"
  | "ledger"
  | "imprevistos"
  | "disputas"
  | "payouts"
  | "comissoes"
  | "pagamento"
  | "fechamento";

const TABS: { id: Tab; label: string }[] = [
  { id: "caixa", label: "Visão de Caixa & Previsibilidade" },
  { id: "ledger", label: "Ledger Contábil (360°)" },
  { id: "imprevistos", label: "Custos Imprevistos & Ajustes" },
  { id: "disputas", label: "Disputas & Chargebacks" },
  { id: "payouts", label: "Fila de saída" },
  { id: "comissoes", label: "Comissões" },
  { id: "pagamento", label: "Pagamento avulso" },
  { id: "fechamento", label: "Fechamento" },
];

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("caixa");
  // bump força os painéis de lista a recarregar após um pagamento.
  const [bump, setBump] = useState(0);

  return (
    <PageShell
      title="Gestão Financeira & Soberania Admin"
      subtitle="Controle absoluto de fluxo de caixa, partidas dobradas, custos imprevistos, disputas e desembolsos."
    >
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-xl px-4 py-2 text-[14px] font-bold transition ${
              tab === t.id
                ? "bg-brand-blue text-white shadow-sm"
                : "bg-white/70 text-brand-muted ring-1 ring-brand-border hover:text-brand-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "caixa" ? <CashflowCockpit /> : null}
      {tab === "ledger" ? <LedgerPanel /> : null}
      {tab === "imprevistos" ? <SovereignActionsPanel /> : null}
      {tab === "disputas" ? <DisputesPanel /> : null}
      {tab === "payouts" ? <PayoutsPanel /> : null}
      {tab === "comissoes" ? <CommissionsPanel /> : null}
      {tab === "pagamento" ? (
        <ManualPaymentForm
          onDone={() => {
            setTab("payouts");
          }}
        />
      ) : null}
      {tab === "fechamento" ? <ClosingPanel /> : null}
    </PageShell>
  );
}

