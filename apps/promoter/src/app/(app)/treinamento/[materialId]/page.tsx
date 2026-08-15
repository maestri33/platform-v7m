import { redirect, notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { ContentBlock, TrainingMaterial } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { SubmissionForm } from "./SubmissionForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Treinamento" };

type Props = {
  params: Promise<{ materialId: string }>;
};

/** Só URL absoluta http(s) vira mídia embutida — o resto vira link/nada. */
function isHttpUrl(u: string | null | undefined): u is string {
  return typeof u === "string" && /^https?:\/\//i.test(u);
}

/** Um bloco genérico de `content_blocks[]` — texto, imagem, vídeo ou link. */
function Block({ block }: { block: ContentBlock }) {
  if (block.text) {
    return <p className="whitespace-pre-line text-sm leading-relaxed">{block.text}</p>;
  }
  if (isHttpUrl(block.url)) {
    if (block.type === "image") {
      // eslint-disable-next-line @next/next/no-img-element -- mídia externa da aula, domínio desconhecido em build
      return <img src={block.url} alt={block.label ?? "Imagem da aula"} className="rounded-[var(--radius-sm)] max-w-full" />;
    }
    if (block.type === "video") {
      return <video src={block.url} controls className="w-full rounded-[var(--radius-sm)]" />;
    }
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-gold-ink underline hover:text-brand-gold-deep-ink text-sm"
      >
        {block.label ?? "Abrir material"}
      </a>
    );
  }
  return null;
}

export default async function MaterialPage({ params }: Props) {
  const { materialId } = await params;
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("training")) redirect("/painel");

  const materials = await djangoFetch<TrainingMaterial[]>(
    "/api/v1/collaborators/training/materials",
  );
  const material = materials.find((m) => m.material_external_id === materialId);
  if (!material) notFound();

  return (
    <PageShell>
      <CompactHeader kicker="V7M · Treinamento" title={material.title} />
      <div>
        <Badge tone={material.blocking ? "warn" : "muted"}>
          {material.blocking ? "Obrigatória" : "Extra · opcional"}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* A aula: texto + mídia + blocos genéricos */}
        {(material.text_content ||
          isHttpUrl(material.photo) ||
          isHttpUrl(material.video) ||
          (material.content_blocks?.length ?? 0) > 0) && (
          <div className="auth-card space-y-4">
            {material.text_content && (
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {material.text_content}
              </p>
            )}
            {isHttpUrl(material.photo) && (
              // eslint-disable-next-line @next/next/no-img-element -- mídia externa da aula, domínio desconhecido em build
              <img
                src={material.photo}
                alt={`Imagem da matéria ${material.title}`}
                className="rounded-[var(--radius-sm)] max-w-full"
              />
            )}
            {isHttpUrl(material.video) && (
              <video src={material.video} controls className="w-full rounded-[var(--radius-sm)]" />
            )}
            {material.content_blocks?.map((b, i) => <Block key={i} block={b} />)}
          </div>
        )}

        {/* A pergunta, em destaque, logo acima da resposta */}
        {material.question && (
          <div className="auth-card border-brand-gold/50 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-gold-ink">
              Responda com suas palavras
            </p>
            <p className="whitespace-pre-line text-sm font-semibold leading-relaxed">
              {material.question}
            </p>
          </div>
        )}

        <div className="auth-card">
          <SubmissionForm
            materialExternalId={material.material_external_id}
            submissionStatus={material.submission_status ?? null}
            justification={material.justification ?? null}
          />
        </div>
      </div>
    </PageShell>
  );
}
