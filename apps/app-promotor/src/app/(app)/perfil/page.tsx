import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { candidateStageHref } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  redirect(candidateStageHref(me));
}
