"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { SECTIONS } from "@/components/dev/section-nav";

import { ShowcaseGroup, VariantRow } from "./_parts";

const SECTION_DESCRIPTIONS: Record<string, string> = {
  overview: "Índice de tudo o que está no showcase. Use o nav horizontal pra pular.",
  components:
    "Primitivos de UI (Button, Field, Badge, Card…) em todos os tamanhos, tons e estados.",
  forms:
    "Forms completos (CEP, Pix, Documento, Selfie, Escolaridade) em todos os estados — visual only, sem submit.",
  pages:
    "Mock de cada página real (Painel, Leads, Comissões, Conta, Treinamento, etc.) com mock data realista.",
  states:
    "Loading, empty, error, success, 404 — cada estado em pelo menos 1 componente.",
  auth: "Os 3 estágios do CheckFlow (check, register, otp) renderizados de forma estática pra QA visual.",
};

const WHATS_NEW = [
  "PIX ambíguo (11 dígitos): painel de escolha CPF/celular pra evitar validar chave de outra pessoa.",
  "PixForm: status 'success' antes do redirect (a chave validada também pinta a home).",
  "Selfie rejeitada: mantém o form aberto + link WhatsApp do polo (caminho alternativo, não único).",
  "Painel: 'Acumulado / Libera' quando há payout hold; 'Recebido / Previsto' quando livre.",
  "DocForm: classify server-side — frente/verso checados antes do upload final.",
  "CopyButton: fallback execCommand sem HTTPS (Safari antigo, contexto inseguro).",
  "Auth: hint de CPF/celular detectado no campo de telefone + WHO do Pix reaproveitado.",
];

/** Primeira seção: índice + callout do que mudou recentemente. */
export function OverviewSection() {
  return (
    <Container className="space-y-6">
      <header className="space-y-1">
        <p className="kicker text-brand-gold-ink">Dev preview · V7M Promotor</p>
        <h1 className="page-title text-[var(--surface-text)]">
          Showcase de UI
        </h1>
        <p className="text-sm text-[var(--surface-text-muted)]">
          Todas as variantes, estados e formas de cada componente, form e página —
          sem precisar de login, mock de backend, ou navegar pelo funil inteiro.
        </p>
      </header>

      {/* Índice de seções */}
      <ShowcaseGroup label="Seções" description="Use o nav no topo ou clique pra abrir.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dev-preview?section=${s.id}`}
                className="card card-interactive block"
              >
                <p className="font-display text-base text-[var(--surface-text)]">
                  {s.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--surface-text-muted)]">
                  {SECTION_DESCRIPTIONS[s.id] ?? s.hint}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </ShowcaseGroup>

      {/* What's new */}
      <ShowcaseGroup
        label="O que mudou nas últimas 4 rodadas de polish"
        description="Notas para a revisão: cada item é uma decisão visual nova do app."
      >
        <ul className="space-y-2 text-sm text-[var(--surface-text)]">
          {WHATS_NEW.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 leading-relaxed text-[var(--surface-text)]"
            >
              <span
                aria-hidden
                className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-brand-gold"
              />
              {item}
            </li>
          ))}
        </ul>
      </ShowcaseGroup>

      {/* Roles — pra QA alternar a casca */}
      <ShowcaseGroup label="Roles disponíveis" description="Troca o AppShell renderizado.">
        <VariantRow label="Candidato">
          <RoleLink section="pages" role="candidate" label="Candidato em onboarding" />
        </VariantRow>
        <VariantRow label="Promotor pleno">
          <RoleLink section="pages" role="promoter" label="Bia Promotora" />
        </VariantRow>
        <VariantRow label="Coordenador">
          <RoleLink section="pages" role="coordinator" label="Cau Coordenador" />
        </VariantRow>
        <VariantRow label="Training travado">
          <RoleLink section="pages" role="training" label="Dudu Trainee (LMS)" />
        </VariantRow>
        <VariantRow label="Outsider">
          <RoleLink section="auth" role="outsider" label="Visitante (AuthShell)" />
        </VariantRow>
      </ShowcaseGroup>

      <p className="flex items-center gap-1.5 text-xs text-[var(--surface-text-muted)]">
        <Sparkles aria-hidden className="size-3.5 text-brand-gold-ink" />
        Use o painel de tema no canto inferior direito pra alternar light/dark em
        qualquer seção.
      </p>
    </Container>
  );
}

function RoleLink({
  section,
  role,
  label,
}: {
  section: string;
  role: string;
  label: string;
}) {
  return (
    <Link
      href={`/dev-preview?section=${section}&role=${role}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--surface-text)] transition-colors hover:border-brand-gold"
    >
      {label} <span className="text-brand-gold-ink">→</span>
    </Link>
  );
}
