import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { DocumentUploadGate } from "@/components/painel/DocumentUploadGate";
import { OnboardingGrid } from "@/components/painel/OnboardingGrid";
import { PaymentHoldAlert } from "@/components/painel/PaymentHoldAlert";
import { djangoFetch } from "@/lib/api/client";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOnboarding, isPromoter, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { getMe, pendingStepsCount, payoutStatus, type Summary } from "@/lib/api/me";
import type { DocumentSection } from "@/lib/api/types";
import { formatBRL } from "@/lib/format";

/**
 * `/painel` — dashboard único do promotor.
 *
 * Modelo "tudo-async-até-receber" (ver .reviews/api-spec-me-unificado.md):
 *  - Candidato em onboarding cai AQUI (não mais no wizard forçado).
 *  - O painel mostra goal/link/leads (se o back já expôs) + alerta de hold
 *    + grade de etapas pendentes.
 *  - Promotor pleno (role `promoter`) vê a versão limpa do painel, sem
 *    alerta, sem grade de etapas.
 *
 * Server Component — busca via `getMe()` que tem fallback pros 3 endpoints
 * legados. O front nunca quebra se o back ainda não deployou `/me`.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  const me = await getMe(session.roles);
  const candidate = me.candidate;
  const promoter = me.promoter;
  const summary = promoter?.summary ?? null;

  // ── Candidato REJEITADO pelo polo ─────────────────────────────────────────
  // Mantém o tratamento antigo: mensagem única, sem grade, sem goal.
  if (isOnboarding(session.roles) && candidate?.status === "rejected") {
    return (
      <SingleCard>
        <SingleTitle>Cadastro não aprovado</SingleTitle>
        <SingleSub>Fale com o seu polo.</SingleSub>
        <SingleBody>
          {candidate.rejection_reason ??
            "O coordenador revisou e não aprovou por enquanto. Em muitos casos dá pra resolver e tentar de novo."}
        </SingleBody>
      </SingleCard>
    );
  }

  // ── Candidato SEM ref_url ainda (degenerate, sessão quebrada) ────────────
  if (isOnboarding(session.roles) && !promoter?.ref_url) {
    return (
      <SingleCard>
        <SingleTitle>Preparando seu link de captação…</SingleTitle>
        <SingleSub>Estamos criando sua conta de promotor.</SingleSub>
        <SingleBody>
          Em alguns segundos você já cai aqui com seu link e a meta da semana.
        </SingleBody>
      </SingleCard>
    );
  }

  // ── Decisão de renderização ──────────────────────────────────────────────
  const onboardingDone = candidate?.onboarding_complete ?? false;
  const showOnboardingGrid = isOnboarding(session.roles) && !onboardingDone;
  const showAwaitingPolo =
    isOnboarding(session.roles) && onboardingDone && candidate?.status !== "approved";

  const documentStep = candidate?.steps.documents;
  const showDocumentUploadGate =
    showOnboardingGrid &&
    Boolean(documentStep && !documentStep.done) &&
    documentStep?.status !== "pending" &&
    documentStep?.status !== "review";
  const documentInitial = showDocumentUploadGate
    ? await djangoFetch<DocumentSection>(
        "/api/v1/collaborators/candidate/document",
      ).catch(() => ({} as DocumentSection))
    : null;

  // Payout hold: o back é a fonte. Fallback: derivar do estado de onboarding.
  const hold = payoutStatus(me);
  const effectiveReason = showOnboardingGrid
    ? "onboarding_incomplete"
    : showAwaitingPolo
      ? "pending_polo_approval"
      : hold.reason; // "none" ou o que o back mandar

  // Se for promotor pleno e o back já liberou o payout, NÃO mostra alerta.
  // Se for candidato (mesmo com onboarding_done), mostra até o back confirmar.
  const showAlert =
    isOnboarding(session.roles) ||
    (isPromoter(session.roles) && effectiveReason !== "none");

  const pending = pendingStepsCount(me);

  return (
    <div className="space-y-4">
      {documentInitial && (
        <DocumentUploadGate
          initial={documentInitial}
          reason={documentStep?.reason}
        />
      )}

      {/* ── Alerta de hold / aprovado ──────────────────────────────────────── */}
      {showAlert && (
        <PaymentHoldAlert
          reason={effectiveReason as "none" | "onboarding_incomplete" | "pending_polo_approval"}
          pendingCount={pending}
          amountHeld={hold.amount}
          nextPayoutAt={hold.nextPayoutAt}
          poloWhatsapp={candidate?.hub_whatsapp ?? undefined}
        />
      )}

      {/* ── Bolsa de estudos (só para `pre_matriculado`) ───────────────────── */}
      {promoter?.pre_matriculado && summary && (
        <ScholarshipCard
          paid={summary.lifetime.total_students}
          enrollGoal={3}
          examGoal={10}
        />
      )}

      {/* ── Saudação + status ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl text-[var(--surface-text)] truncate">
          Olá, {session.name ?? me.name ?? "promotor"}
        </h1>
        {promoter && (
          <Badge tone={promoter.status === "active" ? "ok" : "danger"}>
            {promoter.status === "active" ? "Ativo" : "Suspenso"}
          </Badge>
        )}
      </div>

      {/* ── Grade de etapas (só durante onboarding) ───────────────────────── */}
      {showOnboardingGrid && candidate && (
        <OnboardingGrid steps={candidate.steps} />
      )}

      {/* ── HERO: meta da semana (alma do home) ────────────────────────────── */}
      {summary && <GoalHero summary={summary} payoutHeld={hold.held} />}

      {/* ── Recebido × Esta semana (linha compacta) ─────────────────────── */}
      {summary && <MoneyRow summary={summary} />}

      {/* ── Link de captação ──────────────────────────────────────────────── */}
      {promoter?.ref_url && (
        <div className="panel-card">
          <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)] mb-1">
            Seu link
          </p>
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
      )}

      {/* ── Sem resumo ainda (back não expôs `/me` nem summary p/ candidato):
              só mostra orientação suave. ──────────────────────────────── */}
      {!summary && isOnboarding(session.roles) && promoter?.ref_url && (
        <p className="text-xs text-[var(--surface-text-muted)]">
          Seus números da semana aparecem aqui assim que a contagem rodar
          pela primeira vez.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Subcomponentes locais
// =============================================================================

function GoalHero({
  summary,
  payoutHeld,
}: {
  summary: Summary;
  payoutHeld: boolean;
}) {
  const { week_goal, week_paid_leads, goal_reached, bonus_amount, next_closing_at } = summary;
  const paid = week_paid_leads;
  const remaining = Math.max(0, week_goal - paid);
  // Texto muted no hero: no gold hero (não-held) o fundo é --char → precisa de
  // --hero-text-muted (--muted-on-dark); no card plain (held) o fundo é --surface
  // → --surface-text-muted. Usar o token errado quebra AA num dos dois estados.
  const mutedText = payoutHeld
    ? "text-[var(--surface-text-muted)]"
    : "text-[var(--hero-text-muted)]";

  return (
    <div
      className={`rounded-[var(--radius)] border p-4 ${
        payoutHeld
          ? "border-[var(--surface-border)] bg-[var(--surface)] text-[var(--surface-text)]"
          : "border-[var(--hero-border)] bg-[var(--hero-bg)] text-[var(--hero-text)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--hero-kicker)]">
          Meta da semana
        </p>
        <p className="rounded-full bg-[var(--surface-alt)] px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[var(--surface-text-muted)]">
          fecha em{" "}
          <Countdown
            target={next_closing_at}
            urgentBelowHours={goal_reached ? undefined : 24}
          />
        </p>
      </div>
      <p className="flex items-baseline gap-2 font-display">
        <span className="text-2xl">
          {paid}
          <span className={`text-sm ${mutedText}`}> / {week_goal}</span>
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
      <p className={`mt-2 text-xs ${mutedText}`}>
        {goal_reached
          ? `Bônus de ${formatBRL(bonus_amount)} garantido.`
          : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} pra meta.`}
      </p>
    </div>
  );
}

function MoneyRow({ summary }: { summary: Summary }) {
  const { week_commission_total, lifetime, bonus_amount, goal_reached } = summary;
  const previsto = Number(week_commission_total) + (goal_reached ? Number(bonus_amount) : 0);

  // Labels estáveis: a MESMA célula mostra sempre o mesmo indicador, independente
  // do hold. Antes o hold trocava rótulo E número ("Acumulado" = valor da semana
  // vs "Recebido" = lifetime) → leitura errada de dinheiro ao entrar/sair do hold.
  // O hold é dito só pelo alerta; os números aqui são sempre verdadeiros.
  return (
    <div className="grid grid-cols-2 gap-2 text-[var(--surface-text)]">
      <div className="panel-card">
        <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">
          Recebido
        </p>
        <p className="font-display text-sm tabular-nums">
          {formatBRL(lifetime.total_received)}
        </p>
      </div>
      <div className="panel-card">
        <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">
          Esta semana
        </p>
        <p className="font-display text-sm tabular-nums">{formatBRL(previsto)}</p>
      </div>
    </div>
  );
}

function ScholarshipCard({
  paid,
  enrollGoal,
  examGoal,
}: {
  paid: number;
  enrollGoal: number;
  examGoal: number;
}) {
  const enrollRemaining = Math.max(0, enrollGoal - paid);
  const examRemaining = Math.max(0, examGoal - paid);
  const pct = Math.min(100, (paid / examGoal) * 100);
  const achieved = enrollRemaining === 0;

  return (
    <section
      className="rounded-[var(--radius)] border border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3"
      aria-label="Sua bolsa de estudos"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-ink flex items-center gap-1.5">
          <Sparkles aria-hidden className="size-3.5" /> Sua bolsa de estudos
        </p>
        <h2 className="font-display text-base text-[var(--surface-text)] mt-0.5">
          {achieved
            ? "Sua matrícula como bolsista foi conquistada"
            : `Faltam ${enrollRemaining} matrículas pagas para efetivar sua matrícula`}
        </h2>
      </div>
      <p className="text-sm text-[var(--surface-text-muted)]">
        Você já tem {paid} de {enrollGoal} indicações pagas para entrar como
        aluno. A prova final é liberada ao chegar a {examGoal}, junto com os
        documentos do curso.
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-border)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-brand-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[var(--surface-text-muted)]">
        {examRemaining > 0
          ? `Faltam ${examRemaining} indicações pagas para o requisito da prova final.`
          : "Requisito de 10 indicações pagas atingido."}
      </p>
    </section>
  );
}

function SingleCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] max-w-md mx-auto p-5">
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function SingleTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-xl text-[var(--surface-text)]">{children}</h1>
  );
}
function SingleSub({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--surface-text-muted)]">{children}</p>;
}
function SingleBody({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--surface-text)]">{children}</p>;
}

// fallback: o redirect OUTSIDE_APP_URL continua aqui p/ `staff` puro sem roles
// internas — comportamento original preservado.
export const __outside = OUTSIDE_APP_URL;
