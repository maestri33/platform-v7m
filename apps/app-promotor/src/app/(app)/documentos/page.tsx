import { redirect } from "next/navigation";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOutsider, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, PromoterMe } from "@/lib/api/types";
import { DocumentosClient } from "./DocumentosClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Central de Documentos · Promotor",
  description: "Resolução e gestão dos 6 documentos do promotor para liberação de repasses via PIX.",
};

export default async function DocumentosPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  if (isOutsider(session.roles)) {
    redirect(OUTSIDE_APP_URL);
  }

  // Fetch candidate and promoter data in parallel
  const [candidateMe, promoterMe] = await Promise.all([
    djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me").catch(() => null),
    djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me").catch(() => null),
  ]);

  return (
    <main className="px-[var(--gutter)] py-5">
      <DocumentosClient
        initialCandidate={candidateMe}
        initialPromoter={promoterMe}
        userName={session.name}
      />
    </main>
  );
}
