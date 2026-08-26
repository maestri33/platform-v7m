import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { stageCompleted } from "@/lib/candidate/funnel";
import { isEducationAssistantConfigured } from "@/lib/education/assistant-config";
import { readSession } from "@/lib/auth/server";

import { EscolaridadeForm } from "./EscolaridadeForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Escolaridade" };

export default async function EscolaridadePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const educationComplete = stageCompleted("education", me);

  // Escolaridade já gravada (etapa passou) → resumo sem form.
  if (educationComplete) {
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
            Registrada ✓
          </span>
        </div>
        <CompactHeader kicker="Dossiê de Saque" title="Escolaridade" />
        <div className="education-card space-y-5">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Escolaridade registrada ✓</p>
            <p className="text-sm mt-1 opacity-90">
              Seu nível de ensino foi registrado no seu cadastro.
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
          4 de 5 deveres
        </span>
      </div>
      <CompactHeader
        kicker="Dossiê de Saque"
        title="Escolaridade"
        subtitle="Informe a última série ou formação concluída. Cidade e escola são opcionais."
      />
      <div className="education-card">
        <EscolaridadeForm assistantEnabled={isEducationAssistantConfigured()} />
      </div>
    </PageShell>
  );
}

