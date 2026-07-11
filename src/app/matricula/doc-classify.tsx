"use client";

/**
 * Classificação RÁPIDA da foto do documento ANTES de enviar (IA→OmniRoute, síncrona). Só reconhece
 * (é doc? rg/cnh? inteiro/frente/verso?), NÃO valida — a validação minuciosa segue assíncrona no
 * upload. Aqui escolhemos o COMPONENTE certo pelo resultado (generative UI, mas sem chat — fluxo
 * direto, decisão do Victor 2026-07-11).
 *
 * Regras (audience="student" no funil do aluno):
 *  - não é documento / IA indefinida → pede confirmação manual do tipo (erro da IA nunca bloqueia)
 *  - CNH + aluno → REJEITA (aluno exige RG); promotor aceitaria (audience="promoter")
 *  - RG (ou tipo confirmado) → segue pro upload do slot certo
 */
import { type DocClassify } from "@/lib/api";

export type ClassifyAudience = "student" | "promoter";

export type ClassifyVerdict =
  | { kind: "accept"; docType: "rg" | "cnh"; completeness: "front" | "back" | "full" | null }
  | { kind: "reject_cnh" } // CNH mas o funil exige RG (aluno)
  | { kind: "not_document" } // não é documento
  | { kind: "confirm" }; // IA em dúvida → a pessoa diz o tipo

/** A regra de negócio pura (testável): resultado da IA + público → veredito de UI. */
export function classifyVerdict(
  c: DocClassify,
  audience: ClassifyAudience,
): ClassifyVerdict {
  // IA não decidiu (is_document null ou sem doc_type) → confirmar com a pessoa; nunca bloquear.
  if (c.is_document === null) return { kind: "confirm" };
  if (c.is_document === false) return { kind: "not_document" };
  if (!c.doc_type) return { kind: "confirm" };
  // CNH só é aceita fora do funil do aluno.
  if (c.doc_type === "cnh" && audience === "student") return { kind: "reject_cnh" };
  return { kind: "accept", docType: c.doc_type, completeness: c.completeness };
}

const DOC_LABEL: Record<string, string> = { rg: "RG", cnh: "CNH" };
const COMPLETE_LABEL: Record<string, string> = {
  front: "frente",
  back: "verso",
  full: "documento inteiro",
};

/** Painel do resultado da classificação — botões diretos, sem chat. */
export function ClassifyResult({
  verdict,
  onAccept,
  onRetry,
  busy,
}: {
  verdict: ClassifyVerdict;
  /** confirmou o tipo (accept ou confirm-manual) → segue pro upload */
  onAccept: () => void;
  /** trocar a foto */
  onRetry: () => void;
  busy?: boolean;
}) {
  if (verdict.kind === "accept") {
    const doc = DOC_LABEL[verdict.docType] ?? verdict.docType;
    const part = verdict.completeness ? COMPLETE_LABEL[verdict.completeness] : null;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-brand-green-bg px-3.5 py-2.5 text-[14px] font-bold text-brand-green-dark">
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
          Reconhecemos seu {doc}
          {part ? ` (${part})` : ""}
        </div>
        <p className="text-[14px] leading-relaxed text-brand-muted">
          Confirme para enviar — depois nossa verificação confere os dados.
        </p>
      </div>
    );
  }

  if (verdict.kind === "reject_cnh") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-brand-ink">Isso parece uma CNH.</p>
        <p className="text-[15px] leading-relaxed text-brand-muted">
          Para a matrícula, precisamos do seu <b>RG</b> (a carteira de identidade). Envie uma foto
          do RG, por favor.
        </p>
      </div>
    );
  }

  if (verdict.kind === "not_document") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-brand-ink">
          Não reconhecemos um documento nessa foto.
        </p>
        <p className="text-[15px] leading-relaxed text-brand-muted">
          Tire uma foto nítida do seu RG, com o documento preenchendo a tela e sem reflexo.
        </p>
      </div>
    );
  }

  // confirm — IA em dúvida
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-brand-ink">Confirme o documento</p>
      <p className="text-[15px] leading-relaxed text-brand-muted">
        Não deu para reconhecer automaticamente. Esta foto é do seu <b>RG</b>? Se for, confirme;
        senão, envie uma nova foto.
      </p>
    </div>
  );
}
