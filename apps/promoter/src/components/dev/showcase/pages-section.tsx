"use client";

import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { FunnelStepper } from "@/components/ui/stepper";
import { OnboardingGrid } from "@/components/painel/OnboardingGrid";
import { PaymentHoldAlert } from "@/components/painel/PaymentHoldAlert";
import { Stat } from "@/components/ui/stat";
import { formatBRL } from "@/lib/format";
import { roleLabels } from "@/lib/candidate/labels";
import { candidateToMeCandidate } from "@/lib/api/me-derive";
import {
  mockCommissions,
  mockCandidateMidFunnel,
  mockCandidateOnboardingInProgress,
  mockCandidateApproved,
  mockLeads,
  mockPainelByRole,
  mockPromoterMe,
  mockPromoterMeSuspended,
  mockPromoterMeWithScholarship,
  mockSelfieApproved,
  mockSessions,
  mockSummaryDefault,
  mockSummaryGoalReached,
  mockSummaryScholarship,
  mockTrainingMaterials,
} from "@/lib/dev/mocks";

import { ShowcaseGroup, Variant } from "./_parts";
import { ShowcaseShell } from "./index";

/** Páginas reais, renderizadas com mock data. Visual only. */
export function PagesSection({ role }: { role?: string }) {
  // Persona canônica do role selecionado (fallback promoter). O grupo "Painel
  // — persona atual" abaixo usa isso; o catálogo de estados do Painel segue
  // intacto pra QA exaustivo.
  const persona = mockPainelByRole[role ?? "promoter"] ?? mockPainelByRole.promoter;
  const personaName = mockSessions[role ?? "promoter"]?.session.name ?? persona.personaLabel;

  return (
    <ShowcaseShell
      kicker="Dev preview · Páginas"
      title="Mock das páginas reais"
      description="Renderiza cada rota com o shape real do tipo do back e os componentes do app. O ponto é QA visual, não fluxo."
    >
      {/* ── Painel — persona atual (role-aware) ──────────────────────── */}
      <ShowcaseGroup
        label={`Painel — persona atual (${persona.personaLabel})`}
        description="Mude o role no header pra ver o /painel de cada persona. O catálogo completo de estados do Painel segue no grupo abaixo."
      >
        <Variant label={persona.personaLabel} hint={persona.hint}>
          <PainelMock
            summary={persona.summary}
            promoter={persona.promoter}
            candidate={persona.candidate ? candidateToMeCandidate(persona.candidate) : null}
            showHold={persona.showHold}
            name={personaName}
          />
        </Variant>
      </ShowcaseGroup>

      {/* ── Painel ──────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Painel (/painel)" description="5 estados de hold + goal + bolsa.">
        <Variant label="Default (goal não atingida)">
          <PainelMock summary={mockSummaryDefault} promoter={mockPromoterMe} candidate={null} />
        </Variant>
        <Variant label="Goal atingida">
          <PainelMock summary={mockSummaryGoalReached} promoter={mockPromoterMe} candidate={null} />
        </Variant>
        <Variant label="Onboarding pendente (PaymentHoldAlert visível)">
          <PainelMock
            summary={mockSummaryDefault}
            promoter={mockPromoterMe}
            candidate={candidateToMeCandidate(mockCandidateOnboardingInProgress)}
            showHold="onboarding_incomplete"
          />
        </Variant>
        <Variant label="Aguardando aprovação do polo">
          <PainelMock
            summary={mockSummaryDefault}
            promoter={mockPromoterMe}
            candidate={candidateToMeCandidate(mockCandidateMidFunnel)}
            showHold="pending_polo_approval"
          />
        </Variant>
        <Variant label="Com bolsa (pre_matriculado)">
          <PainelMock
            summary={mockSummaryScholarship}
            promoter={mockPromoterMeWithScholarship}
            candidate={null}
            showHold="none"
          />
        </Variant>
        <Variant label="Candidato rejeitado">
          <div className="rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] max-w-md mx-auto p-5">
            <div className="space-y-3">
              <h1 className="font-display text-xl text-[var(--surface-text)]">Cadastro não aprovado</h1>
              <p className="text-sm text-[var(--surface-text-muted)]">Fale com o seu polo.</p>
              <p className="text-sm text-[var(--surface-text)]">
                O coordenador revisou e não aprovou por enquanto. Em muitos casos dá pra resolver e tentar de novo.
              </p>
            </div>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Leads ────────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Leads (/leads)">
        <Variant label="Vazio">
          <LeadsMock leads={[]} summary={mockSummaryDefault} />
        </Variant>
        <Variant label="5 leads (mixed: 3 paid, 2 waiting)">
          <LeadsMock leads={mockLeads} summary={mockSummaryDefault} />
        </Variant>
      </ShowcaseGroup>

      {/* ── Comissões ────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Comissões (/comissoes)">
        <Variant label="Vazio">
          <ComissoesMock commissions={[]} />
        </Variant>
        <Variant label="6 comissões (mixed: pending, paid, failed)">
          <ComissoesMock commissions={mockCommissions} />
        </Variant>
      </ShowcaseGroup>

      {/* ── Conta ────────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Conta (/conta)">
        <Variant label="Promotor, sem selfie, sem pix_validated">
          <ContaMock
            session={{ external_id: "demo-prom", name: "Bia Promotora", roles: ["promoter"] }}
            promoter={mockPromoterMe}
            selfiePhoto={null}
            pixValidated={false}
            hasDocType={false}
            address={null}
          />
        </Variant>
        <Variant label="Promotor, com selfie, pix validado">
          <ContaMock
            session={{ external_id: "demo-prom", name: "Bia Promotora", roles: ["promoter"] }}
            promoter={mockPromoterMe}
            selfiePhoto={mockSelfieApproved.photo ?? null}
            pixValidated
            hasDocType
            address={mockCandidateApproved.address}
          />
        </Variant>
        <Variant label="Candidato em onboarding, com pix validado">
          <ContaMock
            session={{ external_id: "demo-cand", name: "Ana Candidata", roles: ["candidate"] }}
            promoter={null}
            selfiePhoto={null}
            pixValidated
            hasDocType
            address={mockCandidateMidFunnel.address}
          />
        </Variant>
        <Variant label="Promotor suspenso">
          <ContaMock
            session={{ external_id: "demo-prom", name: "Bia Promotora", roles: ["promoter"] }}
            promoter={mockPromoterMeSuspended}
            selfiePhoto={null}
            pixValidated={false}
            hasDocType
            address={null}
          />
        </Variant>
      </ShowcaseGroup>

      {/* ── Treinamento ──────────────────────────────────────────────── */}
      <ShowcaseGroup label="Treinamento (/treinamento)">
        <Variant label="Tudo concluído (banner ✓)">
          <TreinamentoMock mode="all_done" />
        </Variant>
        <Variant label="Com próxima matéria obrigatória (foco)">
          <TreinamentoMock mode="focus" />
        </Variant>
        <Variant label="Metade (foco + extras)">
          <TreinamentoMock mode="halfway" />
        </Variant>
        <Variant label="Com correção em andamento (grading)">
          <TreinamentoMock mode="grading" />
        </Variant>
        <Variant label="Vazio (sem materiais ainda)">
          <TreinamentoMock mode="empty" />
        </Variant>
      </ShowcaseGroup>

      {/* ── Funnel steps — cada um em "filling" state ────────────────── */}
      <ShowcaseGroup label="Funnel: Documento (/documento)">
        <Variant label="Stage 1 — RG selecionado (preenchendo)">
          <PageShell>
            <CompactHeader kicker="V7M · Cadastro" title="Seu documento" />
            <FunnelStepper current="documents" />
            <div className="auth-card space-y-4">
              <fieldset className="space-y-2">
                <p className="label">Qual documento você vai usar?</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-brand-gold bg-brand-gold-light/10 px-4 py-3">
                    <input className="accent-gold-deep mr-2" type="radio" checked readOnly />RG
                  </label>
                  <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
                    <input className="accent-gold-deep mr-2" type="radio" />CNH
                  </label>
                </div>
              </fieldset>
              <div className="rounded-[var(--radius)] border border-dashed border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3">
                <p className="font-semibold">Primeiro envie a FRENTE do RG</p>
                <p className="text-xs text-[var(--surface-text-muted)]">
                  A foto só precisa mostrar o documento inteiro e legível.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn">Tirar foto</button>
                  <button className="btn btn-ghost">Enviar arquivo</button>
                </div>
              </div>
            </div>
          </PageShell>
        </Variant>
      </ShowcaseGroup>

      <ShowcaseGroup label="Funnel: Comprovante (/endereco)">
        <Variant label="Default (sem foto)">
          <PageShell>
            <CompactHeader
              kicker="V7M · Cadastro"
              title="Comprovante de residência"
              subtitle="Envie a conta ou comprovante. O endereço sai do documento — sem digitar CEP, rua ou número."
            />
            <FunnelStepper current="address" />
            <div className="auth-card space-y-3">
              <p className="text-sm text-brand-muted">
                Pode ser conta de luz, água, internet, telefone ou outro comprovante recente.
                Se estiver no nome de outra pessoa, a gente pergunta o vínculo depois — sem travar o cadastro.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn">Tirar foto</button>
                <button className="btn btn-ghost">Enviar arquivo</button>
              </div>
            </div>
          </PageShell>
        </Variant>
        <Variant label="Kinship fallback (no nome de outra pessoa)">
          <PageShell>
            <CompactHeader kicker="V7M · Cadastro" title="Comprovante de residência" />
            <FunnelStepper current="address" />
            <div className="auth-card space-y-4">
              <p className="text-sm text-brand-muted">
                O comprovante está no nome de outra pessoa. Isso não impede o cadastro — diga de quem é a conta e qual é o vínculo com você.
              </p>
              <input className="input" placeholder="Ex.: está no nome da minha mãe, moro com ela" />
              <button className="btn btn-xl w-full">Confirmar vínculo</button>
            </div>
          </PageShell>
        </Variant>
      </ShowcaseGroup>

      <ShowcaseGroup label="Funnel: Pix (/pix)">
        <Variant label="Validada (resumo)">
          <PageShell>
            <CompactHeader kicker="V7M · Cadastro" title="Chave Pix" />
            <FunnelStepper current="pix" />
            <div className="auth-card space-y-5">
              <div className="banner banner-ok" role="status">
                <p className="font-display">Chave validada</p>
                <p className="text-sm mt-1 opacity-90">
                  Confirmada no seu nome. É pra essa chave que as suas comissões vão, toda sexta.
                </p>
              </div>
              <a href="/painel" className="btn btn-xl w-full">Voltar pro painel</a>
            </div>
          </PageShell>
        </Variant>
      </ShowcaseGroup>

      <ShowcaseGroup label="Funnel: Escolaridade (/escolaridade)">
        <Variant label="Preenchida (resumo)">
          <PageShell>
            <CompactHeader kicker="V7M · Cadastro" title="Escolaridade" />
            <FunnelStepper current="education" />
            <div className="education-card space-y-5">
              <div className="banner banner-ok" role="status">
                <p className="font-display">Escolaridade registrada</p>
                <p className="text-sm mt-1 opacity-90">
                  Guardamos seu nível de ensino. Você pode revisar aqui ou voltar pro painel e seguir pras próximas etapas.
                </p>
              </div>
              <a href="/painel" className="btn btn-xl w-full">Voltar pro painel</a>
            </div>
          </PageShell>
        </Variant>
      </ShowcaseGroup>

      <ShowcaseGroup label="Funnel: Selfie (/selfie)">
        <Variant label="Aprovada (resumo)">
          <PageShell>
            <CompactHeader kicker="V7M · Cadastro" title="Sua selfie" />
            <FunnelStepper current="selfie" />
            <div className="auth-card space-y-3">
              <div className="banner banner-ok" role="status">
                <p className="font-display">Selfie aprovada ✓</p>
                <p className="text-sm mt-1 opacity-90">
                  Tudo certo com a sua selfie. Vamos pra próxima etapa.
                </p>
              </div>
            </div>
          </PageShell>
        </Variant>
      </ShowcaseGroup>
    </ShowcaseShell>
  );
}

// =============================================================================
// Mock Painel
// =============================================================================

type PromoterMeLite = { status: "active" | "suspended"; ref_url: string; pre_matriculado?: boolean };

function PainelMock({
  summary,
  promoter,
  candidate,
  showHold,
  name = "Bia Promotora",
}: {
  summary: typeof mockSummaryDefault;
  promoter: PromoterMeLite;
  candidate: ReturnType<typeof candidateToMeCandidate> | null;
  showHold?: "none" | "onboarding_incomplete" | "pending_polo_approval";
  /** Nome exibido no "Olá, …" (default = persona do catálogo). */
  name?: string;
}) {
  const { week_goal, week_paid_leads, goal_reached, bonus_amount, week_commission_total, lifetime } = summary;
  const paid = week_paid_leads;
  const remaining = Math.max(0, week_goal - paid);
  const holdReason = showHold ?? (candidate ? "onboarding_incomplete" : "none");
  const pendingCount = candidate
    ? Object.values(candidate.steps).filter((s) => !s.done).length
    : 0;

  return (
    <div className="space-y-4">
      {holdReason !== "none" && (
        <PaymentHoldAlert
          reason={holdReason}
          pendingCount={pendingCount}
          amountHeld={summary.payout_hold?.amount_held ?? "0.00"}
          nextPayoutAt={summary.payout_hold?.next_payout_at ?? null}
          poloWhatsapp="5531999998888"
        />
      )}

      {/* Bolsa */}
      {promoter.pre_matriculado && (
        <section
          className="rounded-[var(--radius)] border border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3"
          aria-label="Sua bolsa de estudos"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-ink">Sua bolsa de estudos</p>
            <h2 className="font-display text-base text-[var(--surface-text)] mt-0.5">
              {lifetime.total_students >= 3
                ? "Sua matrícula como bolsista foi conquistada"
                : `Faltam ${3 - lifetime.total_students} matrículas pagas para efetivar sua matrícula`}
            </h2>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-border)]" aria-hidden>
            <div
              className="h-full rounded-full bg-brand-gold"
              style={{ width: `${Math.min(100, (lifetime.total_students / 10) * 100)}%` }}
            />
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl text-[var(--surface-text)] truncate">
          Olá, {name}
        </h1>
        <Badge tone={promoter.status === "active" ? "ok" : "danger"}>
          {promoter.status === "active" ? "Ativo" : "Suspenso"}
        </Badge>
      </div>

      {candidate && <OnboardingGrid steps={candidate.steps} />}

      {/* GoalHero */}
      <div
        className="rounded-[var(--radius)] border p-4 border-[var(--hero-border)] bg-[var(--hero-bg)] text-[var(--hero-text)]"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--hero-kicker)]">
            Meta da semana
          </p>
        </div>
        <p className="flex items-baseline gap-2 font-display">
          <span className="text-2xl">
            {paid}
            <span className="text-sm text-[var(--hero-text-muted)]"> / {week_goal}</span>
          </span>
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: week_goal }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < paid ? "bg-brand-gold" : "bg-[var(--surface-border)]"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--hero-text-muted)]">
          {goal_reached
            ? `Bônus de ${formatBRL(bonus_amount)} garantido.`
            : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} pra meta.`}
        </p>
      </div>

      {/* MoneyRow — labels estáveis (espelha painel/page.tsx) */}
      <div className="grid grid-cols-2 gap-2 text-[var(--surface-text)]">
        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">
            Recebido
          </p>
          <p className="font-display text-sm tabular-nums">
            {formatBRL(lifetime.total_received)}
          </p>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">
            Esta semana
          </p>
          <p className="font-display text-sm tabular-nums">
            {formatBRL(Number(week_commission_total) + (goal_reached ? Number(bonus_amount) : 0))}
          </p>
        </div>
      </div>

      {/* Link */}
      <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)] mb-1">Seu link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-xs text-[var(--surface-text)]">
            {promoter.ref_url}
          </code>
          <CopyButton
            value={promoter.ref_url}
            label="Copiar"
            share={{ title: "Seu link de captação V7M", text: promoter.ref_url }}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mock Leads
// =============================================================================

function LeadsMock({
  leads,
  summary,
}: {
  leads: typeof mockLeads;
  summary: typeof mockSummaryDefault;
}) {
  if (leads.length === 0) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Promotor" title="Seus leads" />
        <div className="auth-card space-y-4">
          <p className="text-[var(--surface-text-muted)]">
            Seus primeiros leads vão aparecer aqui. Compartilhe seu link de captação — cada matrícula paga é R$100 no seu Pix.
          </p>
          <a href="/painel" className="btn">Pegar meu link de captação</a>
        </div>
      </PageShell>
    );
  }
  const weekStart = summary.week_start ? new Date(summary.week_start) : null;
  function stateOf(lead: typeof leads[0]) {
    if (lead.status !== "paid") return "waiting" as const;
    if (weekStart && new Date(lead.created_at) < weekStart) return "paid_settled" as const;
    return "paid_pending" as const;
  }
  return (
    <PageShell>
      <CompactHeader kicker="V7M · Promotor" title="Seus leads" />
      <ul className="space-y-3">
        {leads.map((l) => {
          const state = stateOf(l);
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
                      <h2 className="font-display text-base leading-snug">{l.name || "Lead sem nome"}</h2>
                      <p className="text-xs text-[var(--surface-text-muted)] mt-0.5">
                        {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
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
    </PageShell>
  );
}

// =============================================================================
// Mock Comissões
// =============================================================================

function ComissoesMock({ commissions }: { commissions: typeof mockCommissions }) {
  if (commissions.length === 0) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Promotor" title="Suas comissões" />
        <div className="auth-card text-[var(--surface-text-muted)]">
          Suas comissões vão aparecer aqui depois do primeiro fechamento — toda sexta às 18h, direto na sua chave Pix. Bora buscar a primeira?
        </div>
      </PageShell>
    );
  }
  const totalPending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  return (
    <PageShell>
      <CompactHeader kicker="V7M · Promotor" title="Suas comissões" />
      <div className="auth-card grid gap-3 sm:grid-cols-2">
        <Stat label="Pendente" value={formatBRL(totalPending)} />
        <Stat label="Pago" value={formatBRL(totalPaid)} />
      </div>
      <ul className="space-y-3">
        {commissions.map((c) => (
          <li key={c.external_id}>
            <div className="auth-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg">{formatBRL(c.amount)}</p>
                  <p className="text-xs text-[var(--surface-text-muted)]">
                    {c.source === "lead" || c.source === "enrollment" ? "Matrícula paga" : "Bônus da meta"} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge tone={c.status === "paid" ? "ok" : c.status === "failed" ? "danger" : "muted"}>
                  {c.status === "paid" ? "Paga" : c.status === "failed" ? "Falhou" : "Pendente"}
                </Badge>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

// =============================================================================
// Mock Conta
// =============================================================================

function ContaMock({
  session,
  promoter,
  selfiePhoto,
  pixValidated,
  hasDocType,
  address,
}: {
  session: { name: string | null; external_id: string; roles: string[] };
  promoter: PromoterMeLite | null;
  selfiePhoto: string | null;
  pixValidated: boolean;
  hasDocType: boolean;
  address: { city: string | null; state: string | null } | null;
}) {
  const labels = roleLabels(session.roles);
  const initials = (session.name ?? "V7M").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return (
    <PageShell>
      <CompactHeader kicker="V7M · Você" title="Sua conta" />
      <div className="auth-card flex items-center gap-4">
        {selfiePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selfiePhoto} alt="Sua selfie" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--gold-grad)] font-display text-lg text-[var(--surface-text)]"
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-lg truncate">{session.name ?? "—"}</p>
          <p className="text-sm text-[var(--surface-text-muted)] flex flex-wrap items-center gap-2">
            {promoter && (
              <Badge tone={promoter.status === "active" ? "ok" : "danger"}>
                {promoter.status === "active" ? "Ativo" : "Suspenso"}
              </Badge>
            )}
            <span>
              {labels.join(" · ") || "—"}
              {selfiePhoto ? " · assinatura verificada ✓" : ""}
            </span>
          </p>
        </div>
      </div>
      <div className="auth-card divide-y divide-[var(--surface-border)]">
        {hasDocType && (
          <ContaRow label="Documento">RG · verificado ✓</ContaRow>
        )}
        {address?.city && (
          <ContaRow label="Endereço">{address.city}{address.state ? ` / ${address.state}` : ""}</ContaRow>
        )}
        {pixValidated && <ContaRow label="Chave Pix">validada ✓</ContaRow>}
        <ContaRow label="Papéis ativos">{labels.join(" · ") || "—"}</ContaRow>
        <div className="pt-3">
          <button className="inline-flex items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:border-danger hover:text-danger">
            Sair
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function ContaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-[var(--surface-text-muted)] text-right">{children}</p>
    </div>
  );
}

// =============================================================================
// Mock Treinamento
// =============================================================================

function TreinamentoMock({ mode }: { mode: "all_done" | "focus" | "halfway" | "grading" | "empty" }) {
  const materials = mockTrainingMaterials;
  const blocking = materials.filter((m) => m.blocking);
  const done = materials.filter((m) => m.submission_status === "approved");
  const pendingBlocking = blocking.filter((m) => m.submission_status !== "approved");
  const extras = materials.filter((m) => !m.blocking && m.submission_status !== "approved");
  const focus = pendingBlocking[0] ?? null;
  const isGrading = (m: typeof materials[0]) => m.submission_status === "pending";
  const allBlockingDone = blocking.length > 0 && pendingBlocking.length === 0;
  const pct = blocking.length > 0 ? Math.round((done.length / blocking.length) * 100) : 0;

  if (mode === "empty") {
    return (
      <PageShell>
        <CompactHeader
          kicker="V7M · Treinamento obrigatório"
          title="Enquanto isso está aqui, o resto fica trancado"
        />
        <div className="h-2 overflow-hidden rounded-full bg-brand-border" role="progressbar" aria-valuemin={0} aria-valuemax={0} aria-valuenow={0} aria-label="Matérias obrigatórias concluídas">
          <div className="h-full rounded-full bg-brand-gold transition-[width]" style={{ width: "0%" }} />
        </div>
        <p className="mt-2 text-xs text-[var(--surface-text-muted)]">0 de 0 matérias obrigatórias concluídas</p>
        <div className="auth-card text-[var(--surface-text-muted)]">
          Suas matérias estão sendo preparadas — assim que chegarem, aparecem aqui sozinhas. Você não precisa fazer nada por enquanto.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Treinamento obrigatório"
        title="Enquanto isso está aqui, o resto fica trancado"
        subtitle="Você só acessa o painel depois de concluir as matérias obrigatórias. A IA corrige na hora."
      />
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-border" role="progressbar" aria-valuemin={0} aria-valuemax={blocking.length} aria-valuenow={done.length} aria-label="Matérias obrigatórias concluídas">
          <div className="h-full rounded-full bg-brand-gold transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--surface-text-muted)]">
          {done.length} de {blocking.length} matérias obrigatórias concluídas
        </p>
      </div>

      <div className="space-y-6">
        {allBlockingDone ? (
          <div className="banner banner-ok" role="status">
            <p className="font-display">✓ Treinamento concluído</p>
            <p className="text-sm mt-1 opacity-90">Liberando seu painel…</p>
          </div>
        ) : focus ? (
          <div className="auth-card border-brand-gold/50 space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-gold-ink">
              Próxima matéria obrigatória
            </p>
            <h2 className="font-display text-lg">{focus.title}</h2>
            {isGrading(focus) ? (
              <p className="flex items-center gap-2 text-sm font-medium text-brand-gold-ink" role="status">
                <span className="spinner" aria-hidden /> Resposta recebida ✓ — nossa IA está avaliando…
              </p>
            ) : (
              <a href={`/treinamento/${focus.material_external_id}`} className="btn btn-xl w-full">
                Abrir e responder
              </a>
            )}
          </div>
        ) : null}

        {(mode === "halfway" || mode === "focus") && extras.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--surface-text-muted)]">
              Extra · opcional
            </p>
            <ul className="space-y-2">
              {extras.map((m) => (
                <li key={m.material_external_id}>
                  <a
                    href={`/treinamento/${m.material_external_id}`}
                    className="card card-interactive flex items-center gap-3 py-3"
                  >
                    <span className="flex-1 text-sm font-semibold">{m.title}</span>
                    <span className="text-xs font-bold text-brand-gold-ink">Abrir</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {done.length > 0 && (
          <details className="group" open={mode === "all_done" || mode === "halfway"}>
            <summary className="auth-card flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-brand-ok">
              <span>✓ {done.length} matéria{done.length === 1 ? "" : "s"} concluída{done.length === 1 ? "" : "s"}</span>
              <span className="text-xs font-normal text-[var(--surface-text-muted)]">
                <span className="group-open:hidden">ver</span>
                <span className="hidden group-open:inline">ocultar</span>
              </span>
            </summary>
            <ul className="mt-2 space-y-1.5">
              {done.map((m) => (
                <li
                  key={m.material_external_id}
                  className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-brand-ok/8 px-3 py-2 text-sm"
                >
                  <span aria-hidden className="text-brand-ok">
                    <CheckCircle2 size={14} />
                  </span>
                  {m.title}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </PageShell>
  );
}
