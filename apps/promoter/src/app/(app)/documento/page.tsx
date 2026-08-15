import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { DocumentSection } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { DocForm } from "./DocForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu documento" };

export default async function DocumentoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // O candidato chega aqui a partir do tile do `/painel` (não mais do
  // wizard forçado). O DocForm trata o caso "já concluído" via seu próprio
  // estado (slot captured). Não redirecionamos — o usuário pode revisar
  // e reenviar se quiser.
  const doc = await djangoFetch<DocumentSection>(
    "/api/v1/collaborators/candidate/document",
  ).catch(() => ({}) as DocumentSection);

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Seu documento"
        subtitle="Escolha RG ou CNH. A gente confirma se a foto é de um documento e segue; leitura e conferências continuam em segundo plano."
      />
      <FunnelStepper current="documents" />
      <div className="auth-card">
        <DocForm initial={doc} />
      </div>
    </PageShell>
  );
}
