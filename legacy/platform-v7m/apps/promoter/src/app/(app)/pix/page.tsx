import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FunnelStepper } from "@/components/ui/stepper";
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

  // Página livre — candidato entra aqui pelo tile do painel. Se a chave já
  // está validada, mostra resumo; senão, mostra o form (o form também
  // detecta sozinho e mostra "Chave validada ✓" depois do submit).
  if (stageCompleted("pix", me)) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Cadastro" title="Chave Pix" />
        <FunnelStepper current="pix" />
        <div className="auth-card space-y-5">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Chave validada</p>
            <p className="text-sm mt-1 opacity-90">
              Confirmada no seu nome. É pra essa chave que as suas comissões
              vão, toda sexta.
            </p>
          </div>
          <Button href="/painel" size="xl" className="w-full">
            Voltar pro painel
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Chave Pix"
        subtitle="É pra onde vão suas comissões. Cole ou digite sua chave — a gente reconhece o tipo sozinho e confirma que ela é sua."
      />
      <FunnelStepper current="pix" />
      <div className="auth-card">
        <PixForm />
      </div>
    </PageShell>
  );
}
