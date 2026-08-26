import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { ContentBlock, TrainingMaterial } from "@/lib/api/types";
import { mediaProxyUrl } from "@/lib/media";
import { readSession } from "@/lib/auth/server";

import { SubmissionForm } from "./SubmissionForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Treinamento" };

type Props = {
  params: Promise<{ materialId: string }>;
};

/**
 * Um bloco genérico de `content_blocks[]` — texto, imagem, vídeo ou link.
 *
 * Toda mídia passa pelo proxy de mesma origem (`mediaProxyUrl`): a CSP não
 * libera host externo e o backend devolve tanto URL absoluta quanto caminho
 * relativo (`/media/…`) — o proxy resolve os dois.
 */
function Block({ block }: { block: ContentBlock }) {
  if (block.text) {
    return <p className="whitespace-pre-line text-sm leading-relaxed">{block.text}</p>;
  }
  const proxied = mediaProxyUrl(block.url);
  if (!proxied) return null;
  if (block.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- mídia da aula servida pelo proxy, sem dimensões conhecidas em build
    return <img src={proxied} alt={block.label ?? "Imagem da aula"} className="rounded-[var(--radius-sm)] max-w-full" />;
  }
  if (block.type === "video") {
    return <video src={proxied} controls className="w-full rounded-[var(--radius-sm)]" />;
  }
  return (
    <a
      href={proxied}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-gold-ink underline hover:text-brand-gold-dark text-sm"
    >
      {block.label ?? "Abrir material"}
    </a>
  );
}

export default async function MaterialPage({ params }: Props) {
  const { materialId } = await params;
  const session = await readSession();
  if (!session) redirect("/");

  const materials = await djangoFetch<TrainingMaterial[]>(
    "/api/v1/collaborators/training/materials",
  ).catch(() => []);
  const material = materials.find((m) => m.material_external_id === materialId);
  if (!material) notFound();

  const photoSrc = mediaProxyUrl(material.photo);
  const videoSrc = mediaProxyUrl(material.video);

  return (
    <PageShell>
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/treinamento"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Voltar às matérias</span>
        </Link>
        <Badge tone={material.blocking ? "warn" : "muted"}>
          {material.blocking ? "Obrigatória" : "Extra · opcional"}
        </Badge>
      </div>
      <CompactHeader kicker="V7M · Capacitação" title={material.title} />


      <div className="space-y-4">
        {/* A aula: texto + mídia + blocos genéricos */}
        {(material.text_content ||
          photoSrc ||
          videoSrc ||
          (material.content_blocks?.length ?? 0) > 0) && (
          <div className="auth-card space-y-4">
            {material.text_content && (
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {material.text_content}
              </p>
            )}
            {photoSrc && (
              // eslint-disable-next-line @next/next/no-img-element -- mídia da aula servida pelo proxy, sem dimensões conhecidas em build
              <img
                src={photoSrc}
                alt={`Imagem da matéria ${material.title}`}
                className="rounded-[var(--radius-sm)] max-w-full"
              />
            )}
            {videoSrc && (
              <video src={videoSrc} controls className="w-full rounded-[var(--radius-sm)]" />
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
