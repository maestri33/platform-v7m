"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandDots } from "@/components/ui/brand-dots";
import { ErrorBox } from "@/components/ui/error-box";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { getErrorMessage, initPlatformBootstrap } from "@/lib/api";
import { isValidBrPhone, maskBrPhone, onlyDigits } from "@/lib/phone";
import { isValidCpf, maskCpf } from "@/lib/cpf";
import { saveLogin } from "@/lib/session";

type WizardStep = "boss" | "pricing" | "commissions" | "integrations" | "review";

const STEPS: { id: WizardStep; label: string; number: number }[] = [
  { id: "boss", label: "Conta Master", number: 1 },
  { id: "pricing", label: "Preços & Bolsa", number: 2 },
  { id: "commissions", label: "Comissões", number: 3 },
  { id: "integrations", label: "Chaves", number: 4 },
  { id: "review", label: "Inicializar", number: 5 },
];

const DRAFT_STORAGE_KEY = "v7m.setup.draft.v1";

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("boss");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state - Boss
  const [boss, setBoss] = useState({
    cpf: "111.444.777-35",
    phone: "(11) 97777-7777",
    password: "",
    confirmPassword: "",
  });

  // Form state - Pricing & Bolsa Promotor Estudante
  const [pricing, setPricing] = useState({
    price_pix: "97",
    price_card_reais: "97.00",
    promo_price_pix: "47",
    promo_price_card_reais: "47.00",
    promoter_student_min_leads: "3",
    promoter_student_target_leads: "10",
    card_installments: "12",
    description: "Matrícula Supletivo V7M",
  });

  // Form state - Commissions
  const [commissions, setCommissions] = useState({
    commission_direct: "1",
    commission_bonus_flat: "5",
    commission_bonus_threshold: "5",
    commission_coordinator: "1",
    commission_closing_weekday: "4",
    commission_closing_hour: "18",
  });

  // Form state - Integrations
  const [integrations, setIntegrations] = useState({
    ASAAS_API_KEY: "",
    NOTIFY_SERVER_URL: "http://notify-web:8000",
    NOTIFY_API_KEY: "",
    OMNIROUTE_BASE_URL: "https://ai.v7m.live/v1",
    OMNIROUTE_API_KEY: "",
  });

  // ── PERSISTÊNCIA AUTOMÁTICA EM SESSION STORAGE (NÃO PERDE AO DAR F5) ──
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boss) setBoss((p) => ({ ...p, ...parsed.boss }));
        if (parsed.pricing) setPricing((p) => ({ ...p, ...parsed.pricing }));
        if (parsed.commissions) setCommissions((p) => ({ ...p, ...parsed.commissions }));
        if (parsed.integrations) setIntegrations((p) => ({ ...p, ...parsed.integrations }));
        if (parsed.currentStep && STEPS.some((s) => s.id === parsed.currentStep)) {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch {
      // Ignora erro de parse
    }
  }, []);

  useEffect(() => {
    try {
      const draft = {
        boss,
        pricing,
        commissions,
        integrations,
        currentStep,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignora quota cheia
    }
  }, [boss, pricing, commissions, integrations, currentStep]);

  // Validações em tempo real
  const cleanCpf = onlyDigits(boss.cpf);
  const isCpfValid = cleanCpf.length === 11 && isValidCpf(cleanCpf);

  const cleanPhone = onlyDigits(boss.phone);
  const isPhoneValid = (cleanPhone.length === 10 || cleanPhone.length === 11) && isValidBrPhone(cleanPhone);

  const hasPassword = boss.password.trim().length >= 4;
  const isPasswordMatch = hasPassword && boss.password === boss.confirmPassword;
  const isPasswordMismatch = boss.confirmPassword.length > 0 && boss.password !== boss.confirmPassword;

  function validateBoss(): boolean {
    if (!isCpfValid) {
      setError("Informe um CPF válido com 11 dígitos.");
      return false;
    }
    if (!isPhoneValid) {
      setError("Informe um celular com WhatsApp válido (DDD + número).");
      return false;
    }
    if (!hasPassword) {
      setError("Defina uma senha master de contingência com pelo menos 4 caracteres.");
      return false;
    }
    if (boss.password !== boss.confirmPassword) {
      setError("As senhas não coincidem. Digite a mesma senha no campo de confirmação.");
      return false;
    }
    return true;
  }

  function handleNext() {
    setError(null);
    if (currentStep === "boss") {
      if (!validateBoss()) return;
      setCurrentStep("pricing");
    } else if (currentStep === "pricing") {
      setCurrentStep("commissions");
    } else if (currentStep === "commissions") {
      setCurrentStep("integrations");
    } else if (currentStep === "integrations") {
      setCurrentStep("review");
    }
  }

  function handleBack() {
    setError(null);
    if (currentStep === "pricing") setCurrentStep("boss");
    else if (currentStep === "commissions") setCurrentStep("pricing");
    else if (currentStep === "integrations") setCurrentStep("commissions");
    else if (currentStep === "review") setCurrentStep("integrations");
  }

  async function handleFinishBootstrap() {
    setError(null);
    setLoading(true);
    setLoadingText("Gravando configurações e inicializando banco de dados...");

    try {
      const cardCents = Math.round(Number(pricing.price_card_reais || 0) * 100);
      const promoCardCents = Math.round(Number(pricing.promo_price_card_reais || 0) * 100);

      const payload = {
        boss: {
          cpf: cleanCpf,
          phone: cleanPhone,
          password: boss.password.trim() || undefined,
          default_brand: "standard",
          email: "admin@v7m.org",
          pix_key: cleanCpf,
        },
        pricing: {
          price_pix: pricing.price_pix,
          price_card_cents: cardCents,
          promo_price_pix: pricing.promo_price_pix,
          promo_price_card_cents: promoCardCents,
          promoter_student_min_leads: Number(pricing.promoter_student_min_leads) || 3,
          promoter_student_target_leads: Number(pricing.promoter_student_target_leads) || 10,
          card_installments: Number(pricing.card_installments) || 12,
          description: pricing.description,
        },
        commissions: {
          commission_direct: commissions.commission_direct,
          commission_bonus_flat: commissions.commission_bonus_flat,
          commission_bonus_threshold: Number(commissions.commission_bonus_threshold) || 5,
          commission_coordinator: commissions.commission_coordinator,
          commission_closing_weekday: Number(commissions.commission_closing_weekday) || 4,
          commission_closing_hour: Number(commissions.commission_closing_hour) || 18,
        },
        integrations: Object.fromEntries(
          Object.entries(integrations).filter(([, v]) => v.trim().length > 0),
        ),
      };

      const res = await initPlatformBootstrap(payload);
      if (res.access_token) {
        // Limpa o rascunho persistido pois o setup foi finalizado com sucesso
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        saveLogin({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
          token_type: res.token_type,
        });
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (
        msg.includes("ALREADY_BOOTSTRAPPED") ||
        msg.toLowerCase().includes("já foi inicializada")
      ) {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        window.location.href = "/login";
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingText(null);
    }
  }

  return (
    <Card className="flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 border-b border-brand-border/60 pb-6 text-center">
        <BrandDots size="sm" center />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-brand-ink">
            Setup Inicial da Plataforma
          </h1>
          <span className="rounded-full bg-brand-green-bg px-2.5 py-0.5 text-xs font-black text-brand-green-dark">
            First Run
          </span>
        </div>
        <p className="max-w-lg text-xs leading-relaxed text-brand-muted">
          Configure a conta-mãe do administrador, valores de matrícula, regras da bolsa do promotor e comissões da plataforma.
        </p>

        {/* Step Indicator Interativo */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto py-1 w-full justify-center">
          {STEPS.map((s, idx) => {
            const isCurrent = currentStep === s.id;
            const isPassed = STEPS.findIndex((x) => x.id === currentStep) > idx;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCurrentStep(s.id);
                  }}
                  className="flex items-center gap-2 group cursor-pointer bg-transparent border-0 p-1 rounded-md hover:bg-slate-50 transition"
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                      isCurrent
                        ? "bg-brand-blue text-white shadow-xs"
                        : isPassed
                          ? "bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                    }`}
                  >
                    {isPassed ? "✓" : s.number}
                  </div>
                  <span
                    className={`text-xs font-bold whitespace-nowrap transition ${
                      isCurrent
                        ? "text-brand-ink"
                        : "text-brand-muted group-hover:text-brand-ink"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <span className="text-slate-300">›</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ErrorBox message={error} />

      {/* ── STEP 1: CONTA MASTER / BOSS ── */}
      {currentStep === "boss" && (
        <div className="flex flex-col gap-5">
          <div className="border-b border-brand-border/40 pb-3">
            <h2 className="text-base font-extrabold text-brand-ink">
              1. Conta Master do Administrador
            </h2>
            <p className="text-xs text-brand-muted">
              Informe seu CPF, WhatsApp e a senha master de contingência para acesso seguro à administração.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <TextField
              label="CPF do Administrador"
              placeholder="000.000.000-00"
              hint={cleanCpf.length > 0 ? (isCpfValid ? "CPF Válido ✓" : "11 dígitos necessários") : undefined}
              value={maskCpf(boss.cpf)}
              onChange={(e) => setBoss((p) => ({ ...p, cpf: e.target.value }))}
            />

            <TextField
              label="Celular / WhatsApp de Acesso"
              placeholder="(11) 99999-9999"
              hint={cleanPhone.length > 0 ? (isPhoneValid ? "WhatsApp Válido ✓" : "DDD + 9 dígitos necessários") : undefined}
              value={maskBrPhone(boss.phone)}
              onChange={(e) => setBoss((p) => ({ ...p, phone: e.target.value }))}
            />

            <div className="rounded-xl border border-brand-border bg-slate-50/70 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-brand-ink">
                  🔒 Senha Master de Contingência
                </span>
                {isPasswordMatch && (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Senhas coincidem ✓
                  </span>
                )}
                {isPasswordMismatch && (
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                    Senhas diferentes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Senha Master de Contingência"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha de administrador"
                  value={boss.password}
                  onChange={(e) => setBoss((p) => ({ ...p, password: e.target.value }))}
                />

                <TextField
                  label="Confirmar Senha Master"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a senha de administrador"
                  value={boss.confirmPassword}
                  onChange={(e) => setBoss((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-brand-muted">
                Permite acesso direto de contingência na tela de login caso a comunicação OTP por WhatsApp esteja fora do ar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: PREÇOS & BOLSA DO PROMOTOR ── */}
      {currentStep === "pricing" && (
        <div className="flex flex-col gap-5">
          <div className="border-b border-brand-border/40 pb-3">
            <h2 className="text-base font-extrabold text-brand-ink">
              2. Preços do Curso & Bolsa do Promotor Estudante
            </h2>
            <p className="text-xs text-brand-muted">
              Configure os valores de matrícula (padrão e promocionais) e as metas para gratuidade do promotor estudante.
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
                value={pricing.price_pix}
                onChange={(e) => setPricing((p) => ({ ...p, price_pix: e.target.value }))}
              />
              <TextField
                label="Preço Padrão - Cartão de Crédito (R$)"
                placeholder="97.00"
                value={pricing.price_card_reais}
                onChange={(e) => setPricing((p) => ({ ...p, price_card_reais: e.target.value }))}
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
                value={pricing.promo_price_pix}
                onChange={(e) => setPricing((p) => ({ ...p, promo_price_pix: e.target.value }))}
              />
              <TextField
                label="Preço Promocional - Cartão de Crédito (R$)"
                placeholder="47.00"
                value={pricing.promo_price_card_reais}
                onChange={(e) => setPricing((p) => ({ ...p, promo_price_card_reais: e.target.value }))}
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
                value={pricing.promoter_student_min_leads}
                onChange={(e) => setPricing((p) => ({ ...p, promoter_student_min_leads: e.target.value }))}
              />
              <TextField
                label="Alunos para Quitar 100% o Curso (Meta Total)"
                placeholder="10"
                value={pricing.promoter_student_target_leads}
                onChange={(e) => setPricing((p) => ({ ...p, promoter_student_target_leads: e.target.value }))}
              />
            </div>
          </div>

          {/* Condições de Parcelamento e Fatura */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Máximo de Parcelas no Cartão"
              placeholder="12"
              value={pricing.card_installments}
              onChange={(e) => setPricing((p) => ({ ...p, card_installments: e.target.value }))}
            />
            <TextField
              label="Descrição na Fatura / Checkout"
              placeholder="Matrícula Supletivo V7M"
              value={pricing.description}
              onChange={(e) => setPricing((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* ── STEP 3: REGRAS DE COMISSÃO ── */}
      {currentStep === "commissions" && (
        <div className="flex flex-col gap-4">
          <div className="border-b border-brand-border/40 pb-3">
            <h2 className="text-base font-extrabold text-brand-ink">
              3. Comissões & Metas Semanais
            </h2>
            <p className="text-xs text-brand-muted">
              Configure as regras de repasse para promotores, bônus semanal e taxas de polo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Comissão Direta por Lead Pago (R$)"
              placeholder="1.00"
              value={commissions.commission_direct}
              onChange={(e) => setCommissions((p) => ({ ...p, commission_direct: e.target.value }))}
            />
            <TextField
              label="Bônus Flat por Meta (R$)"
              placeholder="5.00"
              value={commissions.commission_bonus_flat}
              onChange={(e) => setCommissions((p) => ({ ...p, commission_bonus_flat: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Meta de Indicações para Bônus"
              placeholder="5"
              value={commissions.commission_bonus_threshold}
              onChange={(e) => setCommissions((p) => ({ ...p, commission_bonus_threshold: e.target.value }))}
            />
            <TextField
              label="Comissão do Coordenador de Polo (R$)"
              placeholder="1.00"
              value={commissions.commission_coordinator}
              onChange={(e) => setCommissions((p) => ({ ...p, commission_coordinator: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Dia do Fechamento Semanal"
              value={commissions.commission_closing_weekday}
              onChange={(e) => setCommissions((p) => ({ ...p, commission_closing_weekday: e.target.value }))}
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
              label="Hora do Fechamento (0-23h)"
              placeholder="18"
              value={commissions.commission_closing_hour}
              onChange={(e) => setCommissions((p) => ({ ...p, commission_closing_hour: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* ── STEP 4: INTEGRAÇÕES & CHAVES ── */}
      {currentStep === "integrations" && (
        <div className="flex flex-col gap-4">
          <div className="border-b border-brand-border/40 pb-3">
            <h2 className="text-base font-extrabold text-brand-ink">
              4. Chaves de Integração & Mensageria (Opcional no Setup)
            </h2>
            <p className="text-xs text-brand-muted">
              Você pode preencher agora ou configurar posteriormente em Configurações &gt; Chaves.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Asaas */}
            <TextField
              label="Asaas API Key (Gateway Pagamentos/Pix)"
              placeholder="$aact_..."
              value={integrations.ASAAS_API_KEY}
              onChange={(e) => setIntegrations((p) => ({ ...p, ASAAS_API_KEY: e.target.value }))}
            />

            {/* Notify Server (Microserviço Dedicado de WhatsApp e E-mail) */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                  ⚡ Notify Server (Relay WhatsApp & E-mail)
                </span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  Evolution v2 + GO Integrado
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-900">
                O <strong>notify-server</strong> gerencia o disparo resiliente de OTP, WhatsApp (Evolution v2 com fallback para GO), templates de eventos, áudios TTS e e-mails.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Notify Server URL"
                  placeholder="http://notify-web:8000"
                  value={integrations.NOTIFY_SERVER_URL}
                  onChange={(e) => setIntegrations((p) => ({ ...p, NOTIFY_SERVER_URL: e.target.value }))}
                />
                <TextField
                  label="Notify API Key"
                  placeholder="Chave da Conta no Notify"
                  value={integrations.NOTIFY_API_KEY}
                  onChange={(e) => setIntegrations((p) => ({ ...p, NOTIFY_API_KEY: e.target.value }))}
                />
              </div>
            </div>

            {/* OmniRoute Gateway */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-950">
                  🧠 OmniRoute (Roteador de Modelos de IA)
                </span>
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                  Proxy OpenAI / Multi-LLM
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-purple-900">
                O <strong>OmniRoute</strong> unifica o acesso a múltiplos modelos (Gemini, MiniMax, Claude, GPT) com failover automático e roteamento inteligente.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="OmniRoute Base URL"
                  placeholder="https://ai.v7m.live/v1"
                  value={integrations.OMNIROUTE_BASE_URL}
                  onChange={(e) => setIntegrations((p) => ({ ...p, OMNIROUTE_BASE_URL: e.target.value }))}
                />
                <TextField
                  label="OmniRoute API Key"
                  placeholder="sk-omniroute-..."
                  value={integrations.OMNIROUTE_API_KEY}
                  onChange={(e) => setIntegrations((p) => ({ ...p, OMNIROUTE_API_KEY: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 5: REVISÃO & INICIALIZAÇÃO ── */}
      {currentStep === "review" && (
        <div className="flex flex-col gap-4">
          <div className="border-b border-brand-border/40 pb-3">
            <h2 className="text-base font-extrabold text-brand-ink">
              5. Revisão & Inicialização
            </h2>
            <p className="text-xs text-brand-muted">
              Confira os parâmetros configurados antes de disparar o bootstrap da plataforma.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-border bg-slate-50 p-4 text-xs">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-brand-muted">Administrador Master:</dt>
                <dd className="font-extrabold text-brand-ink">{maskCpf(boss.cpf)} • {maskBrPhone(boss.phone)}</dd>
              </div>
              <div>
                <dt className="text-brand-muted">Senha Master:</dt>
                <dd className="font-extrabold text-brand-ink">•••••••• (Definida)</dd>
              </div>
              <div>
                <dt className="text-brand-muted">Preço Padrão (PIX / Cartão):</dt>
                <dd className="font-extrabold text-brand-ink">R$ {pricing.price_pix},00 / R$ {pricing.price_card_reais}</dd>
              </div>
              <div>
                <dt className="text-brand-muted">Preço Promo (PIX / Cartão):</dt>
                <dd className="font-extrabold text-amber-700">R$ {pricing.promo_price_pix},00 / R$ {pricing.promo_price_card_reais}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-brand-muted">Bolsa Promotor Estudante (100% Grátis):</dt>
                <dd className="font-extrabold text-emerald-700">
                  Libera matrícula com {pricing.promoter_student_min_leads} alunos • Quita 100% o curso com {pricing.promoter_student_target_leads} alunos
                </dd>
              </div>
              <div>
                <dt className="text-brand-muted">Comissão Direta / Bônus:</dt>
                <dd className="font-extrabold text-brand-ink">R$ {commissions.commission_direct},00 / R$ {commissions.commission_bonus_flat},00</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
            ⚠️ <strong>Atenção:</strong> Ao inicializar, a conta de superusuário será criada e a rota de setup
            será <strong>permanentemente desativada</strong>.
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t border-brand-border/60 pt-4">
        {currentStep !== "boss" ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="cursor-pointer text-xs font-bold text-brand-muted hover:text-brand-ink disabled:opacity-50"
          >
            ← Voltar
          </button>
        ) : (
          <div />
        )}

        {currentStep !== "review" ? (
          <Button onClick={handleNext}>
            Avançar →
          </Button>
        ) : (
          <Button
            onClick={handleFinishBootstrap}
            loading={loading}
            className="bg-brand-green hover:bg-brand-green-dark text-white font-black px-6"
          >
            {loadingText || "Inicializar Plataforma V7M"}
          </Button>
        )}
      </div>
    </Card>
  );
}
