import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { candidateStageHref, stageHref } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * Resolvedor de etapa — destino único de todo `WRONG_STATUS` (409) do wizard.
 *
 * O front não adivinha mais para onde mandar o candidato: busca o `candidate/me`
 * fresco e aplica o `candidateStageHref`, que é o único lugar que conhece as
 * regras completas (pendências do backend, comprovante recusado, pix validado).
 *
 * `from` é a rota que tomou o 409. Se a resolução apontar pra ela de novo, seria
 * laço — nesse caso caímos no painel, que sabe explicar o estado em vez de
 * repetir a mesma tela.
 *
 * `redirect()` lança NEXT_REDIRECT: por isso o fetch usa `.catch(() => null)`
 * em vez de try/catch (que engoliria o redirect).
 */
export default async function ContinuarPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; expected?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const { from, expected } = await searchParams;
  const me = await djangoFetch<CandidateMe>(
    "/api/v1/collaborators/candidate/me",
  ).catch(() => null);

  // Sem o `me` não há resolução confiável — o painel trata o estado.
  if (!me) redirect("/painel");

  const target = candidateStageHref(me);
  // Só rota interna; nunca redireciona pra fora com base na URL.
  if (!target.startsWith("/")) redirect("/painel");

  if (from && target === from) {
    // O backend insiste numa etapa que a própria tela recusou: usa a dica do
    // `expected_status` se ela levar a outro lugar; senão, painel.
    const fallback = expected ? stageHref(expected) : "/painel";
    redirect(fallback !== from ? fallback : "/painel");
  }

  redirect(target);
}
