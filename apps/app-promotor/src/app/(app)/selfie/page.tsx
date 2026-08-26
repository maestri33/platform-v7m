import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { readSession } from "@/lib/auth/server";

import { SelfieForm } from "./SelfieForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua selfie" };

export default async function SelfiePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

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
          5 de 5 deveres
        </span>
      </div>
      <CompactHeader
        kicker="Dossiê de Saque"
        title="Selfie & Acordo de parceria"
        subtitle="Foto ao vivo sem óculos. A biometria compara com seu documento para autenticar sua assinatura eletrônica e liberar saques."
      />
      <div className="auth-card">
        <SelfieForm />
      </div>
    </PageShell>
  );
}

