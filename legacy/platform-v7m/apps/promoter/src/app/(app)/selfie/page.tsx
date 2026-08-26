import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { SelfieForm } from "./SelfieForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua selfie" };

export default async function SelfiePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // Página livre — o SelfieForm já trata a foto via SWR + a status
  // banner, e o back devolve 409 com `expected_status` se o candidato
  // tentar enviar antes da hora. O `wrongStatusHref` no form
  // navega pro destino certo. Não pré-validamos nada aqui.
  await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me").catch(
    () => null,
  );

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Sua selfie"
        subtitle="Foto ao vivo, sem óculos escuros. A IA confere a vivacidade e compara com o rosto do documento. Se reprovar, ela te explica como refazer."
      />
      <FunnelStepper current="selfie" />
      <div className="auth-card">
        <SelfieForm />
      </div>
    </PageShell>
  );
}
