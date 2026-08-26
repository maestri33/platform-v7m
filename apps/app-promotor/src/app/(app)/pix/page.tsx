import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { stageCompleted } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { PixForm } from "./PixForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua chave Pix" };

export default async function PixPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

  // Chave já validada (etapa passou) → resumo sem form.
  if (stageCompleted("pix", me)) {
    return (
      <PageShell>
        <div className="flex items-center justify-between pb-1">
          <Link
            href="/painel"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Voltar ao painel</span>
          </Link>
          <span className="text-[11px] font-medium text-brand-ok">
            Validada ✓
          </span>
        </div>
        <CompactHeader kicker="Dossiê de Saque" title="Chave Pix" />
        <div className="auth-card space-y-5">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Chave Pix validada ✓</p>
            <p className="text-sm mt-1 opacity-90">
              Confirmada no seu nome. É para essa chave que as suas comissões acumuladas serão transferidas toda sexta-feira às 18h.
            </p>
          </div>
          <Button href="/painel" size="xl" className="w-full">
            Voltar ao painel
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/painel"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Voltar ao painel</span>
        </Link>
        <span className="text-[11px] font-medium text-brand-gold-ink dark:text-brand-gold-light">
          3 de 5 deveres
        </span>
      </div>
      <CompactHeader
        kicker="Dossiê de Saque"
        title="Chave Pix para recebimento"
        subtitle="É onde você recebe suas comissões toda sexta às 18h. Digite sua chave — identificamos o tipo automaticamente."
      />
      <div className="auth-card">
        <PixForm />
      </div>
    </PageShell>
  );
}

