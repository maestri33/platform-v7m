import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * `/perfil` é uma rota legada do wizard forçado. Hoje o candidato entra no
 * `/painel` (dashboard com grid de etapas) e cada tile leva à rota
 * correspondente da etapa. Esta rota agora apenas redireciona pro painel.
 */
export default async function PerfilPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // Mantemos o fetch para não regredir em qualquer side-effect do back;
  // o destino é sempre /painel no modelo novo.
  await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me").catch(
    () => null,
  );
  redirect("/painel");
}
