"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBox } from "@/components/ui/error-box";
import { FileUpload } from "@/components/ui/file-upload";
import { SelectField } from "@/components/ui/select-field";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { TextField } from "@/components/ui/text-field";
import {
  createManualPayment,
  getClosingHealth,
  getErrorMessage,
  runClosing,
  type ClosingHealth,
  type ManualPaymentInput,
  type ManualPaymentOut,
} from "@/lib/api";
import { formatBRL } from "@/lib/money";

/* ───────────────────────── pagamento avulso ───────────────────────── */

type Kind = "pix" | "boleto";

/** Form de pagamento avulso PIX/boleto — MONEY-SAFE: confirma num modal antes de enfileirar. */
export function ManualPaymentForm({ onDone }: { onDone?: () => void }) {
  const [kind, setKind] = useState<Kind>("pix");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [boletoLine, setBoletoLine] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function validate(): string | null {
    if (kind === "pix") {
      if (!amount.trim() || !Number.isFinite(Number(amount))) return "Informe o valor (em reais) do PIX.";
      if (!pixKey.trim()) return "Informe a chave PIX do destinatário.";
    } else {
      if (!boletoLine.trim()) return "Informe a linha digitável do boleto.";
    }
    return null;
  }

  function onSubmit() {
    setError(null);
    setOk(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setConfirmOpen(true);
  }

  function buildInput(): ManualPaymentInput {
    return {
      kind,
      amount: amount.trim() || null,
      description: description.trim() || null,
      supplier_name: supplier.trim() || null,
      pix_key: kind === "pix" ? pixKey.trim() || null : null,
      boleto_line: kind === "boleto" ? boletoLine.trim() || null : null,
      receipt,
    };
  }

  async function confirmPay() {
    const out: ManualPaymentOut = await createManualPayment(buildInput());
    setConfirmOpen(false);
    setOk(`Pagamento enfileirado (${out.method}, ${out.status}). Ref.: ${out.external_id.slice(0, 8)}…`);
    // limpa o form
    setAmount("");
    setDescription("");
    setSupplier("");
    setPixKey("");
    setBoletoLine("");
    setReceipt(null);
    onDone?.();
  }

  const valueLabel = amount.trim() && Number.isFinite(Number(amount)) ? formatBRL(Number(amount)) : "valor a definir";
  const dest = kind === "pix" ? `chave ${pixKey || "—"}` : "boleto (linha digitável)";

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-brand-ink">Pagamento avulso</h2>
        <p className="text-[14px] leading-relaxed text-brand-muted">
          PIX ou boleto a um terceiro pela conta Asaas. Move dinheiro de verdade — você confirma antes.
        </p>
      </div>

      <SelectField
        label="Tipo"
        value={kind}
        onChange={(e) => setKind(e.target.value as Kind)}
        options={[
          { value: "pix", label: "PIX" },
          { value: "boleto", label: "Boleto" },
        ]}
        placeholder=""
      />

      <TextField
        label={kind === "pix" ? "Valor (R$)" : "Valor (R$) — opcional no boleto"}
        inputMode="decimal"
        placeholder="50.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <TextField
        label="Nome do beneficiário"
        placeholder="Quem vai receber"
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
      />

      <TextField
        label="Descrição (opcional)"
        placeholder="Referência do pagamento"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {kind === "pix" ? (
        <TextField
          label="Chave PIX"
          placeholder="CPF, e-mail, telefone ou aleatória"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
        />
      ) : (
        <TextField
          label="Linha digitável do boleto"
          placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
          value={boletoLine}
          onChange={(e) => setBoletoLine(e.target.value)}
        />
      )}

      <FileUpload label="Comprovante (opcional)" file={receipt} onChange={setReceipt} />

      <ErrorBox message={error} />
      <ErrorBox message={ok} success />

      <Button onClick={onSubmit}>Revisar e pagar</Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar pagamento real"
        tone="danger"
        confirmLabel={amount.trim() ? `Pagar ${valueLabel}` : "Enfileirar pagamento"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmPay}
        body={
          <>
            Você vai enfileirar um pagamento <strong>REAL</strong> de{" "}
            <strong>{valueLabel}</strong> via <strong>{kind.toUpperCase()}</strong> para{" "}
            <strong>{supplier || "beneficiário não informado"}</strong> ({dest}).
            <br />
            Isso move dinheiro de verdade na conta Asaas. Confere antes de seguir.
          </>
        }
      />
    </Card>
  );
}

/* ───────────────────────── adiantar fechamento ───────────────────── */

/** Saúde + botão de adiantar o fechamento semanal + SIMULADOR EM MEMÓRIA. */
export function ClosingPanel() {
  const [health, setHealth] = useState<ClosingHealth | null>(null);
  const [simulation, setSimulation] = useState<import("@/lib/api").ClosingSimulation | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getClosingHealth()
      .then(setHealth)
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }

  async function handleSimulate() {
    setSimLoading(true);
    setError(null);
    try {
      const { getClosingSimulation } = await import("@/lib/api");
      const sim = await getClosingSimulation();
      setSimulation(sim);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSimLoading(false);
    }
  }

  useEffect(load, []);

  async function confirmRun() {
    const out = await runClosing();
    setConfirmOpen(false);
    setResult(summarizeClosing(out));
    load();
    handleSimulate();
  }

  const suf = health?.suficiente;
  const tone = suf === true ? "green" : suf === false ? "danger" : "neutral";

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-brand-ink">Fechamento da semana</h2>
          <p className="text-[14px] leading-relaxed text-brand-muted">
            Adiante o fechamento (em vez de esperar a sexta 18h) ou faça uma simulação prévia sem tocar no banco de dados.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : health ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Obrigação estimada" value={formatBRL(health.obrigacao_estimada)} tone="neutral" />
            <StatCard
              label="Saldo Asaas"
              value={health.saldo != null ? formatBRL(health.saldo) : "—"}
              tone={tone}
            />
            <StatCard
              label="Cobertura"
              value={suf === true ? "Suficiente" : suf === false ? "Insuficiente" : "Indefinido"}
              tone={tone}
              hint={health.deficit && Number(health.deficit) > 0 ? `Déficit ${formatBRL(health.deficit)}` : undefined}
            />
          </div>
        ) : null}

        <ErrorBox message={error} />
        {result ? <ErrorBox message={result} success /> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSimulate} loading={simLoading} variant="secondary" className="border-brand-border text-brand-ink">
            Simular Fechamento em Memória
          </Button>
          <Button onClick={() => setConfirmOpen(true)} className="bg-brand-blue hover:bg-brand-blue/90">
            Adiantar fechamento da semana
          </Button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          title="Adiantar o fechamento agora?"
          tone="danger"
          confirmLabel="Adiantar fechamento"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmRun}
          body={
            <>
              Isso roda o <strong>fechamento da semana corrente AGORA</strong> e paga os beneficiários
              (comissões + fila) — move dinheiro <strong>real</strong> na conta Asaas.
              <br />É idempotente: quem já fechou nesta semana é pulado. Mesmo assim, confirme que é a hora.
            </>
          }
        />
      </Card>

      {/* PAINEL DE RESULTADO DA SIMULAÇÃO */}
      {simulation && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-3">
            <div>
              <h3 className="text-base font-black text-brand-ink">
                Simulação da Semana ({simulation.week_of} até {simulation.friday})
              </h3>
              <p className="text-xs text-brand-muted">
                Cálculo em memória projetando bônus por meta (≥{simulation.bonus_threshold} leads: +R${simulation.bonus_amount}) e validação de chaves PIX.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-brand-ink">
                Total Obrigação: <strong>{formatBRL(simulation.total_obligation)}</strong>
              </span>
              {simulation.awaiting_pix_count > 0 && (
                <span className="rounded-xl bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  {simulation.awaiting_pix_count} sem Chave PIX
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-brand-border bg-slate-50 p-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-brand-muted">Comissões Pendentes</span>
              <span className="font-black text-lg text-brand-ink">{simulation.commissions_count}</span>
            </div>
            <div className="rounded-xl border border-brand-border bg-slate-50 p-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-brand-muted">Bônus Conquistados</span>
              <span className="font-black text-lg text-brand-gold">{simulation.bonuses_count}</span>
            </div>
            <div className="rounded-xl border border-brand-border bg-slate-50 p-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-brand-muted">Beneficiários</span>
              <span className="font-black text-lg text-brand-blue">{simulation.beneficiaries_count}</span>
            </div>
            <div className="rounded-xl border border-brand-border bg-slate-50 p-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-brand-muted">Sem Chave PIX</span>
              <span className="font-black text-lg text-rose-600">{simulation.awaiting_pix_count}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-brand-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-border bg-slate-50 font-bold text-brand-muted uppercase">
                <tr>
                  <th className="px-3 py-2.5">Beneficiário</th>
                  <th className="px-3 py-2.5">Papel</th>
                  <th className="px-3 py-2.5">Leads da Semana</th>
                  <th className="px-3 py-2.5">Bônus Meta</th>
                  <th className="px-3 py-2.5">Chave PIX</th>
                  <th className="px-3 py-2.5 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {simulation.beneficiaries.map((b) => (
                  <tr key={b.user_external_id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-brand-ink">{b.name}</p>
                      <p className="text-[10px] text-brand-muted">{b.phone || b.cpf || b.user_external_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px]">
                        {b.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold">{b.leads_count}</td>
                    <td className="px-3 py-2.5">
                      {b.bonus_earned ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          ★ Bônus (+R${simulation.bonus_amount})
                        </span>
                      ) : (
                        <span className="text-brand-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {b.has_pix ? (
                        <span className="text-emerald-700">{b.pix_key}</span>
                      ) : (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">
                          Aguardando PIX
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-brand-ink">
                      {formatBRL(b.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Resume o retorno do fechamento (shape solto) numa frase amigável, sem dump de JSON. */
function summarizeClosing(out: unknown): string {
  if (out && typeof out === "object") {
    const o = out as Record<string, unknown>;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(o)) {
      if (v != null && (typeof v === "number" || typeof v === "string" || typeof v === "boolean")) {
        parts.push(`${k.replace(/_/g, " ")}: ${v}`);
      }
    }
    if (parts.length) return `Fechamento concluído. ${parts.slice(0, 6).join(" · ")}`;
  }
  return "Fechamento concluído.";
}
