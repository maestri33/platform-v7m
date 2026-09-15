"use client";

import { useEffect, useState } from "react";

import { Button } from "@v7m/ui";
import { Card } from "@v7m/ui";
import { ConfirmDialog } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { FileUpload } from "@v7m/ui";
import { SelectField } from "@v7m/ui";
import { LoadingState } from "@v7m/ui";
import { StatCard } from "@v7m/ui";
import { TextField } from "@v7m/ui";
import {
  createManualAdjustment,
  createUnexpectedExpense,
  getErrorMessage,
  getFinanceAudit,
  getFinanceCashflow,
  getFinanceDisputes,
  getFinanceLedger,
  getFinanceTransactions,
  resolveFinanceDispute,
  type CashflowOverview,
  type DisputeRecord,
  type FinancialAuditLogItem,
  type FinancialTransaction,
  type LedgerEntry,
} from "@/lib/api";
import { formatBRL } from "@/lib/money";

/* ─────────────────────────────────────────────────────────────────────────────
   1. VISÃO DE CAIXA E PREVISIBILIDADE (CASHFLOW COCKPIT)
───────────────────────────────────────────────────────────────────────────── */

export function CashflowCockpit() {
  const [data, setData] = useState<CashflowOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFinanceCashflow();
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) return <LoadingState label="Carregando visão de caixa e previsibilidade..." />;
  if (error && !data) return <ErrorBox message={error} tone="danger" />;

  const queue = Number(data?.pending_payouts_queue || 0);
  const liability = Number(data?.unclosed_commissions_liability || 0);
  const totalDue = Number(data?.total_obligations_due || 0);
  const revenue = Number(data?.month_accumulated_revenue || 0);
  const unexp = Number(data?.month_unexpected_expenses || 0);
  const atRisk = Number(data?.open_disputes_at_risk || 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Obrigações Totais Imediatas"
          value={formatBRL(totalDue)}
          hint="Fila ativa + Comissões não fechadas"
          tone="amber"
        />
        <StatCard
          label="Receita Acumulada no Mês"
          value={formatBRL(revenue)}
          hint="Total de entradas consolidadas via Ledger"
          tone="green"
        />
        <StatCard
          label="Comissões em Aberto (Semana)"
          value={formatBRL(liability)}
          hint="Passivo flutuante a fechar na sexta-feira"
          tone="neutral"
        />
        <StatCard
          label="Fila de Saída em Processamento"
          value={formatBRL(queue)}
          hint="PIX / Boletos enviados ou na fila Asaas"
          tone="blue"
        />
        <StatCard
          label="Custos Imprevistos no Mês"
          value={formatBRL(unexp)}
          hint="Despesas emergenciais pagas pelo Admin"
          tone={unexp > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Volume em Disputa / Risco"
          value={formatBRL(atRisk)}
          hint="Chargebacks abertos aguardando veredito"
          tone={atRisk > 0 ? "danger" : "neutral"}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-brand-ink">Previsibilidade Financeira & Controle</h3>
            <p className="text-xs text-brand-muted">
              Última consolidação: {data?.timestamp ? new Date(data.timestamp).toLocaleString("pt-BR") : "—"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={load}>
            Atualizar Indicadores
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. LEDGER CONTÁBIL IRRESTRITO
───────────────────────────────────────────────────────────────────────────── */

export function LedgerPanel() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFinanceLedger();
      setEntries(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-brand-ink">Ledger Contábil (Partidas Dobradas)</h2>
          <p className="text-[14px] text-brand-muted">
            Extrato imutável de débitos e créditos. 100% de visibilidade sem filtros ocultos.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          Recarregar
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Carregando lançamentos contábeis..." />
      ) : error ? (
        <ErrorBox message={error} tone="danger" />
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
          Nenhum lançamento registrado no plano de contas ainda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-border text-xs font-semibold text-brand-muted">
              <tr>
                <th className="pb-3">Data / Hora</th>
                <th className="pb-3">Conta Contábil</th>
                <th className="pb-3">Tipo</th>
                <th className="pb-3 text-right">Valor</th>
                <th className="pb-3">ID Transação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {entries.map((e) => {
                const isDebit = e.entry_type === "debit";
                return (
                  <tr key={e.external_id} className="hover:bg-brand-surface/50">
                    <td className="py-3 text-xs text-brand-muted">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 font-medium text-brand-ink">
                      {e.account_name} <span className="text-xs text-brand-muted">({e.account_code})</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                          isDebit ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {isDebit ? "DÉBITO" : "CRÉDITO"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-brand-ink">
                      {formatBRL(Number(e.amount))}
                    </td>
                    <td className="py-3 font-mono text-xs text-brand-muted">
                      {e.transaction_external_id.slice(0, 8)}…
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. CUSTOS IMPREVISTOS E AJUSTES MANUAIS (ADMIN SOVEREIGNTY)
───────────────────────────────────────────────────────────────────────────── */

export function SovereignActionsPanel({ onDone }: { onDone?: () => void }) {
  const [subTab, setSubTab] = useState<"unexpected" | "adjustment" | "audit">("unexpected");

  // Form Custo Imprevisto
  const [category, setCategory] = useState("infrastructure");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const [supplier, setSupplier] = useState("");
  const [method, setMethod] = useState<"pix_key" | "boleto">("pix_key");
  const [pixKey, setPixKey] = useState("");
  const [boletoLine, setBoletoLine] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  // Form Ajuste Manual
  const [adjAccount, setAdjAccount] = useState("ASSET_ASAAS");
  const [adjType, setAdjType] = useState<"debit" | "credit">("debit");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjJustification, setAdjJustification] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Auditoria
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  async function loadAudit() {
    setLoadingAudit(true);
    try {
      const res = await getFinanceAudit();
      setAuditLogs(res);
    } catch {
      // silencioso
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => {
    if (subTab === "audit") {
      loadAudit();
    }
  }, [subTab]);

  async function handleUnexpectedSubmit() {
    setError(null);
    setOk(null);
    if (!amount.trim() || Number(amount) <= 0) {
      setError("Informe um valor válido e positivo.");
      return;
    }
    if (!description.trim()) {
      setError("Informe a descrição do custo imprevisto.");
      return;
    }
    if (!justification.trim()) {
      setError("A justificativa é obrigatória para fins de auditoria.");
      return;
    }
    if (method === "pix_key" && !pixKey.trim()) {
      setError("Informe a chave PIX de destino.");
      return;
    }
    if (method === "boleto" && !boletoLine.trim()) {
      setError("Informe a linha digitável do boleto.");
      return;
    }

    setConfirmOpen(true);
  }

  async function confirmUnexpectedPay() {
    setLoading(true);
    setError(null);
    try {
      const res = await createUnexpectedExpense({
        category,
        amount,
        description,
        justification,
        supplier_name: supplier || null,
        method,
        pix_key: method === "pix_key" ? pixKey : null,
        boleto_line: method === "boleto" ? boletoLine : null,
        receipt,
      });
      setConfirmOpen(false);
      setOk(`Custo imprevisto registrado e desembolso enfileirado! ID: ${res.external_id.slice(0, 8)}…`);
      setAmount("");
      setDescription("");
      setJustification("");
      setSupplier("");
      setPixKey("");
      setBoletoLine("");
      setReceipt(null);
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustmentSubmit() {
    setError(null);
    setOk(null);
    if (!adjAmount.trim() || Number(adjAmount) <= 0) {
      setError("Informe um valor válido e positivo para o ajuste.");
      return;
    }
    if (!adjJustification.trim()) {
      setError("A justificativa é obrigatória para ajustes manuais.");
      return;
    }

    setLoading(true);
    try {
      const res = await createManualAdjustment({
        account_code: adjAccount,
        entry_type: adjType,
        amount: adjAmount,
        justification: adjJustification,
      });
      setOk(`Ajuste contábil lançado com sucesso! Ref.: ${res.external_id.slice(0, 8)}…`);
      setAdjAmount("");
      setAdjJustification("");
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2 border-b border-brand-border pb-3">
        <button
          type="button"
          onClick={() => {
            setSubTab("unexpected");
            setError(null);
            setOk(null);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            subTab === "unexpected" ? "bg-brand-blue text-white" : "bg-brand-surface text-brand-muted"
          }`}
        >
          Custo Imprevisto & Desembolso
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab("adjustment");
            setError(null);
            setOk(null);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            subTab === "adjustment" ? "bg-brand-blue text-white" : "bg-brand-surface text-brand-muted"
          }`}
        >
          Ajuste Manual de Saldo
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab("audit");
            setError(null);
            setOk(null);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            subTab === "audit" ? "bg-brand-blue text-white" : "bg-brand-surface text-brand-muted"
          }`}
        >
          Trilha de Auditoria do Admin
        </button>
      </div>

      {error ? <ErrorBox message={error} tone="danger" /> : null}
      {ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {ok}
        </div>
      ) : null}

      {subTab === "unexpected" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-extrabold text-brand-ink">Registrar e Pagar Custo Imprevisto</h3>
            <p className="text-xs text-brand-muted">
              Permite ao Admin liquidar emergencialmente despesas não previstas (servidores, jurídico, correções).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Categoria do Custo"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: "infrastructure", label: "Infraestrutura e Servidores" },
                { value: "legal", label: "Jurídico e Cartorial" },
                { value: "security_incident", label: "Incidente de Segurança / Fraude" },
                { value: "system_failure", label: "Falha de Sistema / Gateway" },
                { value: "supplier_extra", label: "Custo Adicional de Fornecedor" },
                { value: "other", label: "Outros Custos Operacionais" },
              ]}
            />
            <TextField
              label="Valor (R$)"
              placeholder="Ex: 350.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <TextField
            label="Descrição da Despesa"
            placeholder="Ex: Upgrade emergencial de memória no cluster de processamento"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            label="Justificativa da Decisão (Auditoria Obrigatória)"
            placeholder="Ex: Demanda extraordinária durante fechamento de inscrições"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Nome do Fornecedor / Favorecido"
              placeholder="Ex: Hetzner Cloud / AWS"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
            <SelectField
              label="Método de Pagamento"
              value={method}
              onChange={(e) => setMethod(e.target.value as "pix_key" | "boleto")}
              options={[
                { value: "pix_key", label: "PIX por Chave" },
                { value: "boleto", label: "Boleto Bancário (Linha Digitável)" },
              ]}
            />
          </div>

          {method === "pix_key" ? (
            <TextField
              label="Chave PIX do Destinatário"
              placeholder="CPF, CNPJ, Email ou Chave Aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          ) : (
            <TextField
              label="Linha Digitável do Boleto"
              placeholder="Ex: 34191.79001 01043.510047 91020.150008 4 900000000000"
              value={boletoLine}
              onChange={(e) => setBoletoLine(e.target.value)}
            />
          )}

          <div>
            <FileUpload
              label="Comprovante / Anexo (Opcional)"
              file={receipt}
              onChange={(f: File | null) => setReceipt(f)}
            />
          </div>

          <Button variant="primary" onClick={handleUnexpectedSubmit} disabled={loading}>
            {loading ? "Processando..." : "Confirmar e Enfileirar Pagamento"}
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            title="Confirmar Liquidação de Custo Imprevisto"
            body={`Você está emitindo um pagamento de ${formatBRL(
              Number(amount || 0)
            )} via ${method.toUpperCase()} para "${supplier || "Fornecedor"}". Esta ação é soberana e auditada.`}
            confirmLabel="Confirmar e Pagar"
            onConfirm={confirmUnexpectedPay}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      ) : null}

      {subTab === "adjustment" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-extrabold text-brand-ink">Ajuste Manual Contábil</h3>
            <p className="text-xs text-brand-muted">
              Lança correções soberanas de débito ou crédito no plano de contas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Conta de Destino"
              value={adjAccount}
              onChange={(e) => setAdjAccount(e.target.value)}
              options={[
                { value: "ASSET_ASAAS", label: "Ativo: Conta Caixa Asaas" },
                { value: "LIABILITY_PROMOTER_PAYABLE", label: "Passivo: Comissões a Pagar" },
                { value: "EQUITY_CAPITAL", label: "Patrimônio: Capital Social" },
                { value: "EXPENSE_OPERATIONAL", label: "Despesa: Operacional" },
              ]}
            />
            <SelectField
              label="Tipo de Lançamento"
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as "debit" | "credit")}
              options={[
                { value: "debit", label: "DÉBITO (Aumenta Ativo / Diminui Passivo)" },
                { value: "credit", label: "CRÉDITO (Diminui Ativo / Aumenta Passivo)" },
              ]}
            />
          </div>

          <TextField
            label="Valor do Ajuste (R$)"
            placeholder="Ex: 500.00"
            value={adjAmount}
            onChange={(e) => setAdjAmount(e.target.value)}
          />

          <TextField
            label="Justificativa Obrigatória"
            placeholder="Ex: Correção de saldo após aporte manual em conta corrente"
            value={adjJustification}
            onChange={(e) => setAdjJustification(e.target.value)}
          />

          <Button variant="primary" onClick={handleAdjustmentSubmit} disabled={loading}>
            {loading ? "Lançando..." : "Gravar Ajuste no Ledger"}
          </Button>
        </div>
      ) : null}

      {subTab === "audit" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-brand-ink">Histórico de Decisões e Auditoria</h3>
            <Button variant="secondary" size="sm" onClick={loadAudit}>
              Recarregar
            </Button>
          </div>

          {loadingAudit ? (
            <LoadingState label="Carregando trilha de auditoria..." />
          ) : auditLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-border p-6 text-center text-xs text-brand-muted">
              Nenhuma intervenção do Admin registrada até o momento.
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {auditLogs.map((log) => (
                <div key={log.external_id} className="py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-blue uppercase">{log.action}</span>
                    <span className="text-brand-muted">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-brand-ink">{log.justification}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    Alvo: {log.target_model} {log.target_external_id ? `(${log.target_external_id.slice(0, 8)}…)` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. DISPUTAS E CHARGEBACKS (VEREDITO SOBERANO)
───────────────────────────────────────────────────────────────────────────── */

export function DisputesPanel() {
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);
  const [resolution, setResolution] = useState<"absorb_loss" | "debit_promoter" | "contest_gateway">("absorb_loss");
  const [justification, setJustification] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFinanceDisputes();
      setDisputes(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolve() {
    if (!selectedDispute) return;
    if (!justification.trim()) {
      setResolveError("A justificativa do veredito é obrigatória.");
      return;
    }
    setResolving(true);
    setResolveError(null);
    try {
      await resolveFinanceDispute(selectedDispute.external_dispute_id, {
        resolution,
        justification,
      });
      setSelectedDispute(null);
      setJustification("");
      load();
    } catch (err) {
      setResolveError(getErrorMessage(err));
    } finally {
      setResolving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-brand-ink">Disputas e Chargebacks</h2>
          <p className="text-[14px] text-brand-muted">
            Instância final para julgamento e resolução de contestações bancárias.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          Recarregar
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Carregando disputas..." />
      ) : error ? (
        <ErrorBox message={error} tone="danger" />
      ) : disputes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
          Nenhuma disputa ou chargeback aberto no momento.
        </div>
      ) : (
        <div className="divide-y divide-brand-border">
          {disputes.map((d) => (
            <div key={d.external_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-ink">{formatBRL(Number(d.amount))}</span>
                  <span className="rounded bg-brand-surface px-2 py-0.5 text-xs text-brand-muted">
                    ID: {d.external_dispute_id}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      d.status === "open"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {d.status.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-muted">Motivo: {d.reason}</p>
                {d.resolution ? (
                  <p className="mt-0.5 text-xs font-medium text-brand-blue">
                    Resolução: {d.resolution} — {d.justification}
                  </p>
                ) : null}
              </div>

              {d.status === "open" ? (
                <Button variant="secondary" size="sm" onClick={() => setSelectedDispute(d)}>
                  Julgar Disputa
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {selectedDispute ? (
        <div className="mt-4 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 flex flex-col gap-3">
          <h4 className="text-sm font-bold text-brand-ink">
            Veredito para Disputa {selectedDispute.external_dispute_id} ({formatBRL(Number(selectedDispute.amount))})
          </h4>
          {resolveError ? <ErrorBox message={resolveError} tone="danger" /> : null}
          <SelectField
            label="Decisão Soberana"
            value={resolution}
            onChange={(e) => setResolution(e.target.value as "absorb_loss" | "debit_promoter" | "contest_gateway")}
            options={[
              { value: "absorb_loss", label: "Absorver Prejuízo na Plataforma (Despesa)" },
              { value: "debit_promoter", label: "Descontar / Cancelar Comissão do Promotor" },
              { value: "contest_gateway", label: "Contestar Chargeback no Gateway" },
            ]}
          />
          <TextField
            label="Justificativa do Veredito"
            placeholder="Ex: Documentação analisada e aprovada pelo jurídico"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleResolve} disabled={resolving}>
              {resolving ? "Gravando..." : "Aplicar Decisão"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedDispute(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
