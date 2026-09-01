import { notFound } from "next/navigation";

import { Card } from "@v7m/ui";

import { AlunoPreview } from "./preview-client";

/**
 * Dev-only: ?status=awaiting_documents|documents_under_review|blood_type_pending|exam_released
 * pré-popula o mock pra inspeção visual. Sem auth, sem backend. 404 em produção.
 */
export default async function AlunoPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const status = sp.status ?? "awaiting_documents";
  if (
    !["awaiting_documents", "documents_under_review", "blood_type_pending", "exam_released"].includes(
      status,
    )
  ) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <Card as="section" pad="lg" className="bg-transparent shadow-none backdrop-blur-none">
        <AlunoPreview status={status} />
      </Card>
    </main>
  );
}
