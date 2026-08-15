import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
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

  // Página livre — candidato entra aqui pelo tile do painel. O
  // AddressProofSection cuida do upload + kinship fallback. O back lê
  // o endereço via OCR do comprovante (não há edição manual de CEP/rua
  // aqui — esse é o fluxo de outra página, fora do escopo desta task).
  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Comprovante de residência"
        subtitle="Envie a conta ou comprovante. O endereço sai do documento — sem digitar CEP, rua ou número."
      />
      <FunnelStepper current="address" />
      <div className="auth-card">
        <AddressProofSection initial={me.address_proof ?? null} />
      </div>
    </PageShell>
  );
}
