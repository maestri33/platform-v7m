import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { AddressProofSection } from "./AddressProofSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprovante de residência" };

export default async function EnderecoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

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
          2 de 5 deveres
        </span>
      </div>
      <CompactHeader
        kicker="Dossiê de Saque"
        title="Comprovante de residência"
        subtitle="Envie a conta ou comprovante recente. O endereço é extraído em segundo plano para liberar seus saques."
      />
      <div className="auth-card">
        <AddressProofSection initial={me.address_proof ?? null} />
      </div>
    </PageShell>
  );
}

