import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { stageCompleted } from "@/lib/candidate/funnel";
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

  // Página livre — candidato entra aqui pelo tile. Se já preencheu,
  // mostra resumo; senão, o form (que também detecta sozinho no fim).
  if (educationComplete) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Cadastro" title="Escolaridade" />
        <FunnelStepper current={me.status} />
        <div className="education-card space-y-5">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Escolaridade registrada</p>
            <p className="text-sm mt-1 opacity-90">
              Guardamos seu nível de ensino. Você pode revisar aqui ou voltar
              pro painel e seguir pras próximas etapas.
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
        title="Escolaridade"
        subtitle="Informe a última série, se concluiu ou parou no meio e em que ano. Cidade e escola são opcionais."
      />
      <FunnelStepper current="education" />
      <div className="education-card">
        <EscolaridadeForm />
      </div>
    </PageShell>
  );
}
