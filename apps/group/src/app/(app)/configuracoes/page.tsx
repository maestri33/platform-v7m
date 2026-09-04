"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBox } from "@/components/ui/error-box";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";
import {
  getClosingHealth,
  getErrorMessage,
  getFinanceBalance,
  getPlatformSetup,
  runBootstrapSeed,
  testIntegrationLive,
  updatePlatformSetup,
  type ClosingHealth,
  type FinanceBalance,
  type LiveTestResult,
  type PlatformSetup,
} from "@/lib/api";
import { maskBrPhone, onlyDigits } from "@/lib/phone";
import { maskCpf } from "@/lib/cpf";
import { formatBRL } from "@/lib/money";

type ConfigTab = "boss" | "pricing" | "commissions" | "integrations" | "balances";

const TABS: { id: ConfigTab; label: string; icon: string }[] = [
  { id: "boss", label: "Boss & Bootstrap", icon: "M16 21v-2a4 4 0 0 0-8 0v2 M12 7a4 4 0 1 0 0 0.01" },
  { id: "pricing", label: "Preços do Curso", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { id: "commissions", label: "Comissões & Metas", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "integrations", label: "Chaves & Conexões", icon: "M9 3v6M15 3v6M4 9h16v4a6 6 0 0 1-12 0V9z" },
  { id: "balances", label: "Saldos & Liquidez", icon: "M3 6h18M3 12h18M3 18h18" },
];

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<ConfigTab>("boss");
  const [setup, setSetup] = useState<PlatformSetup | null>(null);
  const [balance, setBalance] = useState<FinanceBalance | null>(null);
  const [closing, setClosing] = useState<ClosingHealth | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [bossForm, setBossForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    pix_key: "",
    default_brand: "standard",
  });

  const [pricingForm, setPricingForm] = useState({
    price_pix: "97",
    price_card_reais: "97.00",
    promo_price_pix: "47",
    promo_price_card_reais: "47.00",
    promoter_student_min_leads: 3,
    promoter_student_target_leads: 10,
    card_installments: 12,
    description: "Matrícula Supletivo",
  });

  const [commissionsForm, setCommissionsForm] = useState({
    commission_direct: "1",
    commission_bonus_flat: "5",
    commission_bonus_threshold: 5,
    commission_coordinator: "1",
    commission_closing_weekday: 4,
    commission_closing_hour: 18,
  });

  const [integrationsForm, setIntegrationsForm] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, LiveTestResult>>({});
  const [testingInteg, setTestingInteg] = useState<string | null>(null);

  // Seed confirmation modal
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [seedOutput, setSeedOutput] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [setupData, balData, closeData] = await Promise.all([
        getPlatformSetup(),
        getFinanceBalance().catch(() => null),
        getClosingHealth().catch(() => null),
      ]);

      setSetup(setupData);
      setBalance(balData);
      setClosing(closeData);

      // Populate forms
      if (setupData.boss) {
        setBossForm({
          name: setupData.boss.name || "",
          cpf: setupData.boss.cpf || "",
          phone: setupData.boss.phone || "",
          email: setupData.boss.email || "",
          pix_key: setupData.boss.pix_key || "",
          default_brand: setupData.boss.default_brand || "standard",
        });
      }

      if (setupData.pricing) {
        setPricingForm({
          price_pix: setupData.pricing.price_pix || "97",
          price_card_reais: setupData.pricing.price_card_reais || "97.00",
          promo_price_pix: setupData.pricing.promo_price_pix || "47",
          promo_price_card_reais: setupData.pricing.promo_price_card_reais || "47.00",
          promoter_student_min_leads: setupData.pricing.promoter_student_min_leads ?? 3,
          promoter_student_target_leads: setupData.pricing.promoter_student_target_leads ?? 10,
          card_installments: setupData.pricing.card_installments || 12,
          description: setupData.pricing.description || "Matrícula Supletivo",
        });
      }

      if (setupData.commissions) {
        setCommissionsForm({
          commission_direct: setupData.commissions.commission_direct || "1",
          commission_bonus_flat: setupData.commissions.commission_bonus_flat || "5",
          commission_bonus_threshold: setupData.commissions.commission_bonus_threshold || 5,
          commission_coordinator: setupData.commissions.commission_coordinator || "1",
          commission_closing_weekday: setupData.commissions.commission_closing_weekday ?? 4,
          commission_closing_hour: setupData.commissions.commission_closing_hour ?? 18,
        });
      }

      if (setupData.integrations) {
        const rawMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(setupData.integrations)) {
          rawMap[k] = v.value || "";
        }
        setIntegrationsForm(rawMap);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveSection(section: ConfigTab) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let payload = {};

      if (section === "boss") {
        payload = {
          boss: {
            ...bossForm,
            cpf: onlyDigits(bossForm.cpf),
            phone: onlyDigits(bossForm.phone),
          },
        };
      } else if (section === "pricing") {
        const cardCents = Math.round(Number(pricingForm.price_card_reais || 0) * 100);
        const promoCardCents = Math.round(Number(pricingForm.promo_price_card_reais || 0) * 100);
        payload = {
          pricing: {
            price_pix: pricingForm.price_pix,
            price_card_cents: cardCents,
            promo_price_pix: pricingForm.promo_price_pix,
            promo_price_card_cents: promoCardCents,
            promoter_student_min_leads: Number(pricingForm.promoter_student_min_leads),
            promoter_student_target_leads: Number(pricingForm.promoter_student_target_leads),
            card_installments: Number(pricingForm.card_installments),
            description: pricingForm.description,
          },
        };
      } else if (section === "commissions") {
        payload = {
          commissions: {
            commission_direct: commissionsForm.commission_direct,
            commission_bonus_flat: commissionsForm.commission_bonus_flat,
            commission_bonus_threshold: Number(commissionsForm.commission_bonus_threshold),
            commission_coordinator: commissionsForm.commission_coordinator,
            commission_closing_weekday: Number(commissionsForm.commission_closing_weekday),
            commission_closing_hour: Number(commissionsForm.commission_closing_hour),
          },
        };
      } else if (section === "integrations") {
        payload = {
          integrations: integrationsForm,
        };
      }

      const updated = await updatePlatformSetup(payload);
      setSetup(updated);
      setSuccess("Configurações salvas e aplicadas com sucesso!");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRunSeed() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setSeedOutput(null);
    try {
      const res = await runBootstrapSeed();
      setSetup(res.config);
      setSeedOutput(res.output);
      setSuccess("Seed / Bootstrap executado com sucesso!");
      setConfirmSeed(false);
      loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestIntegration(name: string) {
    setTestingInteg(name);
    try {
      const res = await testIntegrationLive(name);
      setTestResults((prev) => ({ ...prev, [name]: res }));
    } catch (err: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          name,
          success: false,
          latency_ms: 0,
          details: {},
          error: getErrorMessage(err),
        },
      }));
    } finally {
      setTestingInteg(null);
    }
  }

  return (
    <PageShell
      title="Configurações da Plataforma"
      subtitle="Gerencie parâmetros operacionais, preços, comissões, credenciais e execute o bootstrap do sistema."
    >
      {/* Navigation tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-brand-border/60 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
              setSuccess(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              tab === t.id
                ? "bg-brand-blue text-white shadow-xs"
                : "bg-white/80 text-brand-muted ring-1 ring-brand-border hover:text-brand-ink hover:bg-white"
            }`}
          >
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <ErrorBox message={error} />
      {success && <ErrorBox message={success} success />}
      {seedOutput && (
        <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="mb-1 text-xs font-black uppercase text-emerald-800">Resultado do Bootstrap:</p>
          <pre className="text-xs text-emerald-950 font-mono whitespace-pre-wrap">{seedOutput}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {/* ── TAB 1: BOSS & BOOTSTRAP ── */}
          {tab === "boss" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-brand-ink">Conta-Mãe (Boss / Superuser)</h2>
                    <p className="text-xs text-brand-muted">
                      Configuração da conta principal que detém papel de Staff, Promotor e Coordenador padrão.
                    </p>
                  </div>
                  {setup?.boss.is_configured ? (
                    <StatusPill status="active" tone="green" label="Boss Configurado" />
                  ) : (
                    <StatusPill status="neutral" tone="amber" label="Pendente de Seed" />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Nome Completo"
                    placeholder="Nome do Boss"
                    value={bossForm.name}
                    onChange={(e) => setBossForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <TextField
                    label="CPF (11 dígitos)"
                    placeholder="000.000.000-00"
                    value={maskCpf(bossForm.cpf)}
                    onChange={(e) => setBossForm((p) => ({ ...p, cpf: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="WhatsApp / Telefone de Login"
                    placeholder="(00) 00000-0000"
                    value={maskBrPhone(bossForm.phone)}
                    onChange={(e) => setBossForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <TextField
                    label="E-mail"
                    placeholder="boss@v7m.org"
                    value={bossForm.email}
                    onChange={(e) => setBossForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Chave PIX (Destino dos Payouts do Boss)"
                    placeholder="CPF, Telefone, E-mail ou Chave Aleatória"
                    value={bossForm.pix_key}
                    onChange={(e) => setBossForm((p) => ({ ...p, pix_key: e.target.value }))}
                  />
                  <TextField
                    label="Marca do Polo Padrão (Fallback)"
                    placeholder="standard"
                    value={bossForm.default_brand}
                    onChange={(e) => setBossForm((p) => ({ ...p, default_brand: e.target.value }))}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-3">
                  <Button onClick={() => handleSaveSection("boss")} loading={saving}>
                    Salvar Dados do Boss
                  </Button>
                </div>
              </Card>

              {/* Card de Ação de Seed */}
              <Card className="flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-brand-ink">Execução de Bootstrap</h3>
                  <p className="mt-1 text-xs text-brand-muted leading-relaxed">
                    O bootstrap (seed_defaults) é <strong>idempotente</strong>. Ele garante que a conta do Boss,
                    o polo padrão e a linha de promotor de captação estejam perfeitamente sincronizados no banco de dados.
                  </p>
                </div>

                <div className="rounded-2xl border border-brand-border bg-slate-50 p-4 text-xs flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Boss no Banco:</span>
                    <strong className="text-brand-ink">{setup?.boss.is_configured ? "Sim" : "Não"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Polo Padrão:</span>
                    <strong className="text-brand-ink">{setup?.boss.default_brand}</strong>
                  </div>
                  {setup?.boss.external_id && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-brand-muted">External ID:</span>
                      <span className="font-mono text-[11px] text-brand-blue truncate">{setup.boss.external_id}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setConfirmSeed(true)}
                  loading={saving}
                  className="w-full bg-brand-blue-bg text-brand-blue hover:bg-brand-blue hover:text-white"
                >
                  Executar Bootstrap / Seeds
                </Button>
              </Card>
            </div>
          )}

          {/* ── TAB 2: PREÇOS & MATRÍCULA ── */}
          {tab === "pricing" && (
            <Card className="flex flex-col gap-5 max-w-3xl">
              <div className="border-b border-brand-border/60 pb-3">
                <h2 className="text-base font-extrabold text-brand-ink">Preços do Curso & Bolsa do Promotor Estudante</h2>
                <p className="text-xs text-brand-muted">
                  Defina os valores de matrícula (padrão e promocionais para PIX e Cartão) e as metas para gratuidade do promotor estudante.
                </p>
              </div>

              {/* Tabela de Preço Padrão */}
              <div className="rounded-xl border border-brand-border bg-slate-50/70 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-brand-ink">
                    💳 1. Tabela Padrão de Matrícula
                  </span>
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    Valor Regular
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Preço Padrão - PIX (R$)"
                    placeholder="97"
                    value={pricingForm.price_pix}
                    onChange={(e) => setPricingForm((p) => ({ ...p, price_pix: e.target.value }))}
                  />
                  <TextField
                    label="Preço Padrão - Cartão de Crédito (R$)"
                    placeholder="97.00"
                    value={pricingForm.price_card_reais}
                    onChange={(e) => setPricingForm((p) => ({ ...p, price_card_reais: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tabela de Preço Promocional */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                    🔥 2. Tabela Promocional (Oferta Especial)
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Desconto de Campanha
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Preço Promocional - PIX (R$)"
                    placeholder="47"
                    value={pricingForm.promo_price_pix}
                    onChange={(e) => setPricingForm((p) => ({ ...p, promo_price_pix: e.target.value }))}
                  />
                  <TextField
                    label="Preço Promocional - Cartão de Crédito (R$)"
                    placeholder="47.00"
                    value={pricingForm.promo_price_card_reais}
                    onChange={(e) => setPricingForm((p) => ({ ...p, promo_price_card_reais: e.target.value }))}
                  />
                </div>
              </div>

              {/* Bolsa Promotor Estudante (100% Gratuito) */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    🎓 3. Bolsa Promotor Estudante (100% Grátis)
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Sem Cobrança em Dinheiro
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-900">
                  O promotor que quiser fazer supletivo <strong>não paga nada</strong>. Ele ganha liberação imediata ao indicar os primeiros alunos e quita 100% o curso ao atingir a meta total de formandos.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Alunos para Liberar Matrícula (Mínimo)"
                    placeholder="3"
                    value={String(pricingForm.promoter_student_min_leads)}
                    onChange={(e) => setPricingForm((p) => ({ ...p, promoter_student_min_leads: Number(e.target.value) || 3 }))}
                  />
                  <TextField
                    label="Alunos para Quitar 100% o Curso (Meta Total)"
                    placeholder="10"
                    value={String(pricingForm.promoter_student_target_leads)}
                    onChange={(e) => setPricingForm((p) => ({ ...p, promoter_student_target_leads: Number(e.target.value) || 10 }))}
                  />
                </div>
              </div>

              {/* Condições de Parcelamento e Fatura */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Máximo de Parcelas no Cartão"
                  placeholder="12"
                  value={String(pricingForm.card_installments)}
                  onChange={(e) => setPricingForm((p) => ({ ...p, card_installments: Number(e.target.value) || 12 }))}
                />
                <TextField
                  label="Descrição da Cobrança na Fatura / Checkout"
                  placeholder="Matrícula Supletivo"
                  value={pricingForm.description}
                  onChange={(e) => setPricingForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="mt-2 flex">
                <Button onClick={() => handleSaveSection("pricing")} loading={saving}>
                  Salvar Preços & Regras da Bolsa
                </Button>
              </div>
            </Card>
          )}

          {/* ── TAB 3: COMISSÕES & METAS ── */}
          {tab === "commissions" && (
            <Card className="flex flex-col gap-5 max-w-3xl">
              <div className="border-b border-brand-border/60 pb-3">
                <h2 className="text-base font-extrabold text-brand-ink">Regras de Comissionamento e Metas</h2>
                <p className="text-xs text-brand-muted">
                  Configure o valor das comissões por indicação, metas de bônus semanal e cronograma de fechamento.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Comissão Direta por Lead Pago (R$)"
                  placeholder="1.00"
                  value={commissionsForm.commission_direct}
                  onChange={(e) => setCommissionsForm((p) => ({ ...p, commission_direct: e.target.value }))}
                />
                <TextField
                  label="Bônus Flat por Meta Atingida (R$)"
                  placeholder="5.00"
                  value={commissionsForm.commission_bonus_flat}
                  onChange={(e) => setCommissionsForm((p) => ({ ...p, commission_bonus_flat: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Meta Semanal de Indicações (Threshold)"
                  placeholder="5"
                  value={String(commissionsForm.commission_bonus_threshold)}
                  onChange={(e) => setCommissionsForm((p) => ({ ...p, commission_bonus_threshold: Number(e.target.value) || 5 }))}
                />
                <TextField
                  label="Comissão do Coordenador de Polo por Formando (R$)"
                  placeholder="1.00"
                  value={commissionsForm.commission_coordinator}
                  onChange={(e) => setCommissionsForm((p) => ({ ...p, commission_coordinator: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Dia do Fechamento Semanal"
                  value={String(commissionsForm.commission_closing_weekday)}
                  onChange={(e) => setCommissionsForm((p) => ({ ...p, commission_closing_weekday: Number(e.target.value) }))}
                  options={[
                    { value: "0", label: "Segunda-feira" },
                    { value: "1", label: "Terça-feira" },
                    { value: "2", label: "Quarta-feira" },
                    { value: "3", label: "Quinta-feira" },
                    { value: "4", label: "Sexta-feira (Padrão)" },
                  ]}
                  placeholder=""
                />
                <TextField
                  label="Hora do Fechamento (0 a 23h)"
                  placeholder="18"
                  value={String(commissionsForm.commission_closing_hour)}
                  onChange={(e) => setCommissionsForm((p) => ({ ...p, commission_closing_hour: Number(e.target.value) || 18 }))}
                />
              </div>

              <div className="mt-2 flex">
                <Button onClick={() => handleSaveSection("commissions")} loading={saving}>
                  Salvar Regras de Comissão
                </Button>
              </div>
            </Card>
          )}

          {/* ── TAB 4: CHAVES & INTEGRAÇÕES ── */}
          {tab === "integrations" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-extrabold text-brand-ink">Chaves de API & Conexões Externas</h2>
                <p className="text-xs text-brand-muted">
                  Altere chaves de integração, credenciais de gateways bancários, instâncias de WhatsApp e teste a conexão ao vivo.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Asaas */}
                <IntegrationSettingBox
                  title="Asaas (Gateway Principal & Payouts)"
                  description="Emissão de Pix, cartão e execução de saques semanais."
                  serviceName="asaas"
                  keys={[
                    { key: "ASAAS_API_KEY", label: "API Key (Secret)", isSecret: true },
                    { key: "ASAAS_BASE_URL", label: "Base URL", isSecret: false, placeholder: "https://api.asaas.com/v3" },
                    { key: "ASAAS_WEBHOOK_SECRET", label: "Webhook Secret", isSecret: true },
                  ]}
                  form={integrationsForm}
                  setForm={setIntegrationsForm}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  onTest={() => handleTestIntegration("asaas")}
                  testing={testingInteg === "asaas"}
                  testResult={testResults["asaas"]}
                />

                {/* WhatsApp & Evolution */}
                <IntegrationSettingBox
                  title="Evolution API / WhatsApp"
                  description="Disparo de OTP, notificações, áudios e mensagens pelo WhatsApp."
                  serviceName="whatsapp"
                  keys={[
                    { key: "EVOLUTION_SERVER_URL", label: "Evolution Server URL", isSecret: false },
                    { key: "EVOLUTION_API_KEY", label: "API Key", isSecret: true },
                    { key: "EVOLUTION_INSTANCE", label: "Nome da Instância", isSecret: false },
                  ]}
                  form={integrationsForm}
                  setForm={setIntegrationsForm}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  onTest={() => handleTestIntegration("whatsapp")}
                  testing={testingInteg === "whatsapp"}
                  testResult={testResults["whatsapp"]}
                />

                {/* Notify Server */}
                <IntegrationSettingBox
                  title="Notify Server"
                  description="Microserviço de templates, webhooks e auditoria de mensagens."
                  serviceName="notify"
                  keys={[
                    { key: "NOTIFY_SERVER_URL", label: "Notify Server URL", isSecret: false, placeholder: "http://notify-web:8000" },
                    { key: "NOTIFY_API_KEY", label: "Notify API Key", isSecret: true },
                  ]}
                  form={integrationsForm}
                  setForm={setIntegrationsForm}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  onTest={() => handleTestIntegration("notify")}
                  testing={testingInteg === "notify"}
                  testResult={testResults["notify"]}
                />

                {/* IA Providers & OmniRoute */}
                <IntegrationSettingBox
                  title="OmniRoute (Roteador de Modelos de IA)"
                  description="Proxy OpenAI unificado (Gemini, MiniMax, Claude, GPT) com failover automático."
                  serviceName="ai"
                  keys={[
                    { key: "OMNIROUTE_BASE_URL", label: "OmniRoute Base URL", isSecret: false, placeholder: "http://10.0.1.135/v1" },
                    { key: "OMNIROUTE_API_KEY", label: "OmniRoute API Key", isSecret: true },
                    { key: "GEMINI_API_KEY", label: "Google Gemini API Key (Fallback)", isSecret: true },
                    { key: "MINIMAX_API_KEY", label: "MiniMax API Key (Fallback)", isSecret: true },
                    { key: "GOOGLE_VISION_API_KEY", label: "Google Vision API Key (OCR)", isSecret: true },
                  ]}
                  form={integrationsForm}
                  setForm={setIntegrationsForm}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  onTest={() => handleTestIntegration("ai")}
                  testing={testingInteg === "ai"}
                  testResult={testResults["ai"]}
                />

                {/* CPFHub */}
                <IntegrationSettingBox
                  title="CPFHub.io"
                  description="Consulta e validação automática de dados de CPF."
                  serviceName="cpf"
                  keys={[
                    { key: "CPFHUB_API_KEY", label: "CPFHub API Key", isSecret: true },
                    { key: "CPFHUB_BASE_URL", label: "Base URL", isSecret: false, placeholder: "https://cpfhub.io" },
                  ]}
                  form={integrationsForm}
                  setForm={setIntegrationsForm}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  onTest={() => handleTestIntegration("cpf")}
                  testing={testingInteg === "cpf"}
                  testResult={testResults["cpf"]}
                />

                {/* InfinitePay */}
                <IntegrationSettingBox
                  title="InfinitePay (Gateway Secundário)"
                  description="Checkout de cartão de crédito e links rápidos de pagamento."
                  serviceName="infinitepay"
                  keys={[
                    { key: "INFINITEPAY_HANDLE", label: "InfinitePay Handle", isSecret: false },
                    { key: "INFINITEPAY_BASE_URL", label: "Base URL", isSecret: false, placeholder: "https://api.infinitepay.io" },
                  ]}
                  form={integrationsForm}
                  setForm={setIntegrationsForm}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  onTest={() => handleTestIntegration("infinitepay")}
                  testing={testingInteg === "infinitepay"}
                  testResult={testResults["infinitepay"]}
                />
              </div>

              <div className="mt-2 flex">
                <Button onClick={() => handleSaveSection("integrations")} loading={saving}>
                  Salvar Chaves de Integração
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB 5: SALDOS & LIQUIDEZ ── */}
          {tab === "balances" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Saldo Disponível Asaas"
                  value={balance?.balance != null ? formatBRL(Number(balance.balance)) : "—"}
                  tone={balance?.balance != null && Number(balance.balance) > 0 ? "green" : "neutral"}
                />
                <StatCard
                  label="Obrigações Estimadas da Semana"
                  value={closing ? formatBRL(closing.obrigacao_estimada) : "—"}
                  tone="neutral"
                />
                <StatCard
                  label="Cobertura de Liquidez"
                  value={closing?.suficiente === true ? "Suficiente" : closing?.suficiente === false ? "Déficit" : "Apurando"}
                  tone={closing?.suficiente === true ? "green" : closing?.suficiente === false ? "danger" : "neutral"}
                  hint={closing?.deficit && Number(closing.deficit) > 0 ? `Déficit de ${formatBRL(closing.deficit)}` : undefined}
                />
              </div>

              <Card className="flex flex-col gap-4">
                <h3 className="text-base font-extrabold text-brand-ink">Diagnóstico Financeiro Completo</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-brand-border bg-slate-50 p-3">
                    <span className="text-brand-muted font-bold">Saldo Bruto em Conta:</span>
                    <p className="text-lg font-black text-brand-ink mt-1">
                      {balance?.balance != null ? formatBRL(Number(balance.balance)) : "Não reportado"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-brand-border bg-slate-50 p-3">
                    <span className="text-brand-muted font-bold">Obrigação de Comissões e Fila:</span>
                    <p className="text-lg font-black text-brand-ink mt-1">
                      {closing ? formatBRL(closing.obrigacao_estimada) : "R$ 0,00"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleTestIntegration("asaas")}
                    loading={testingInteg === "asaas"}
                  >
                    Recarregar Saldo ao Vivo
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação de Seed */}
      <ConfirmDialog
        open={confirmSeed}
        title="Executar Bootstrap / Seeds?"
        tone="danger"
        confirmLabel="Sim, executar Bootstrap"
        onCancel={() => setConfirmSeed(false)}
        onConfirm={handleRunSeed}
        body={
          <>
            Você vai rodar o <strong>seed_defaults</strong> com os dados de Boss, polo e valores salvos.
            <br />
            Esta operação é <strong>idempotente</strong> e atualizará a conta do superusuário e os papéis no banco.
          </>
        }
      />
    </PageShell>
  );
}

function IntegrationSettingBox({
  title,
  description,
  serviceName,
  keys,
  form,
  setForm,
  showSecrets,
  setShowSecrets,
  onTest,
  testing,
  testResult,
}: {
  title: string;
  description: string;
  serviceName: string;
  keys: { key: string; label: string; isSecret: boolean; placeholder?: string }[];
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showSecrets: Record<string, boolean>;
  setShowSecrets: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onTest: () => void;
  testing: boolean;
  testResult?: LiveTestResult;
}) {
  return (
    <Card className="flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
          <h3 className="text-sm font-extrabold text-brand-ink">{title}</h3>
          {testResult ? (
            <StatusPill
              status={testResult.success ? "active" : "failed"}
              tone={testResult.success ? "green" : "danger"}
              label={testResult.success ? `Online (${testResult.latency_ms}ms)` : "Falha no Teste"}
            />
          ) : (
            <StatusPill status="neutral" label="Não testado" />
          )}
        </div>
        <p className="mt-1 text-xs text-brand-muted">{description}</p>

        <div className="mt-3 flex flex-col gap-2.5">
          {keys.map((k) => {
            const isVisible = !!showSecrets[k.key];
            return (
              <div key={k.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-brand-ink">{k.label}</label>
                  {k.isSecret && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecrets((p) => ({ ...p, [k.key]: !p[k.key] }))
                      }
                      className="text-[10px] font-semibold text-brand-blue hover:underline"
                    >
                      {isVisible ? "Ocultar" : "Mostrar"}
                    </button>
                  )}
                </div>
                <input
                  type={k.isSecret && !isVisible ? "password" : "text"}
                  placeholder={k.placeholder || "Configuração..."}
                  value={form[k.key] || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((p) => ({ ...p, [k.key]: v }));
                  }}
                  className="w-full rounded-xl border border-brand-border bg-slate-50 px-3 py-1.5 text-xs font-mono text-brand-ink focus:border-brand-blue focus:bg-white focus:outline-none"
                />
              </div>
            );
          })}
        </div>

        {testResult && (
          <div className={`mt-3 rounded-xl p-2.5 text-xs ${testResult.success ? "bg-emerald-50 text-emerald-950 border border-emerald-200" : "bg-rose-50 text-rose-950 border border-rose-200"}`}>
            <p className="font-bold">
              {testResult.success ? "Conexão estabelecida com sucesso!" : `Erro: ${testResult.error || "Falha na conexão"}`}
            </p>
            {testResult.latency_ms > 0 && (
              <p className="text-[11px] opacity-80 mt-0.5">Latência: {testResult.latency_ms} ms</p>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-brand-border/40">
        <button
          type="button"
          disabled={testing}
          onClick={onTest}
          className="cursor-pointer text-xs font-bold text-brand-blue hover:underline disabled:opacity-50"
        >
          {testing ? "Testando conexão..." : "Testar Conexão Imediata →"}
        </button>
      </div>
    </Card>
  );
}
