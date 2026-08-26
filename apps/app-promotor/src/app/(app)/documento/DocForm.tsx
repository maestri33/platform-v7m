"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


import { FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { UploadActions } from "@/components/ui/upload-actions";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import {
  compressImage,
  FILE_TOO_LARGE_MSG,
  MAX_UPLOAD_BYTES,
} from "@/lib/images/compress";
import type { DocumentSection } from "@/lib/api/types";

type Props = { initial: DocumentSection };
type DocType = "rg" | "cnh";

type ClassifyResult = {
  is_document?: boolean | null;
  doc_type?: string | null;
  completeness?: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
};

/** Veredito da conferência prévia: seguir, ou segurar com motivo (e escape). */
type ClassifyDecision = {
  proceed: boolean;
  classification: ClassifyResult | null;
  reason?: string;
  notice?: string | null;
};

export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [docType, setDocType] = useState<DocType | null>(
    initial.doc_type === "rg" || initial.doc_type === "cnh" ? initial.doc_type : null,
  );
  const [rgFrontSent, setRgFrontSent] = useState(
    initial.analysis_status !== "rejected" && Boolean(initial.has_front || initial.front_photo),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Foto segurada por um aviso da conferência — habilita "Enviar assim mesmo".
  const [heldFile, setHeldFile] = useState<File | null>(null);

  const slot = docType === "rg" ? (rgFrontSent ? "rg_back" : "rg_front") : "cnh_full";
  const prompt =
    docType === "rg"
      ? rgFrontSent
        ? "Agora envie o VERSO do RG"
        : "Primeiro envie a FRENTE do RG"
      : "Envie a CNH aberta ou um PDF da CNH Digital";

  /**
   * Confere a foto ANTES de subir — mas nunca prende ninguém.
   *
   * A conferência é um ajudante, não um portão: se ela falhar, responder fora
   * do formato ou ficar em dúvida, o envio segue (o backend continua sendo a
   * autoridade). Só um veredito NEGATIVO e confiante segura a foto, e mesmo
   * assim a pessoa pode insistir com "Enviar assim mesmo" — antes, seis
   * caminhos diferentes abortavam em silêncio e um serviço instável travava o
   * cadastro na primeira etapa.
   */
  async function confirmDocument(file: File): Promise<ClassifyDecision> {
    let classification: ClassifyResult;
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const response = await fetch("/api/me/document/classify", { method: "POST", body });
      if (!response.ok) return { proceed: true, classification: null };
      classification = (await response.json()) as ClassifyResult;
    } catch {
      // Conferência fora do ar/resposta ilegível → deixa enviar.
      return { proceed: true, classification: null };
    }

    // Só bloqueia com "não" explícito; ausente/nulo = não sei = deixa passar.
    if (classification.is_document === false) {
      return {
        proceed: false,
        classification,
        reason:
          "Essa imagem não parece ser um documento. Confira a foto — se estiver certa, você pode enviar assim mesmo.",
      };
    }
    if (docType === "rg") {
      const expectedSide = rgFrontSent ? "back" : "front";
      const detectedSide = classification.completeness;
      // Só reclama quando reconheceu o OUTRO lado; "não sei" não bloqueia.
      if (
        (detectedSide === "front" || detectedSide === "back") &&
        detectedSide !== expectedSide
      ) {
        const detectedObject = detectedSide === "front" ? "a FRENTE" : "o VERSO";
        const expectedRequest = expectedSide === "front" ? "da FRENTE" : "do VERSO";
        return {
          proceed: false,
          classification,
          reason: `Essa foto parece ser ${detectedObject} do RG. Agora precisamos ${expectedRequest}.`,
        };
      }
    }
    if (classification.is_legible === false) {
      return {
        proceed: false,
        classification,
        reason:
          classification.reason ??
          "O documento parece pouco legível. Tire outra com boa luz e sem cortes — ou envie assim mesmo.",
      };
    }
    // Tipo divergente é só aviso: o promotor pode usar RG ou CNH, e quem define
    // o tipo pro backend é o slot do upload.
    const notice =
      classification.doc_type && classification.doc_type !== docType
        ? `Reconhecemos a foto como ${classification.doc_type.toUpperCase()}. Se você escolheu ${docType?.toUpperCase()} por engano, dá pra corrigir depois.`
        : null;
    return { proceed: true, classification, notice };
  }

  function onUpload(rawFile: File) {
    if (!docType || pending) return;
    setError(null);
    setNotice(null);
    setHeldFile(null);
    startTransition(async () => {
      try {
        const file = await compressImage(rawFile);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(FILE_TOO_LARGE_MSG);
          return;
        }
        const decision = await confirmDocument(file);
        if (!decision.proceed) {
          // Guarda a foto: o aviso vem com escape "Enviar assim mesmo".
          setHeldFile(file);
          setError(decision.reason ?? "Confira a foto e tente novamente.");
          return;
        }
        if (decision.notice) setNotice(decision.notice);
        await sendPhoto(file, decision.classification);
      } catch {
        setError("A conexão oscilou. Tente novamente — a etapa pode ser retomada sem recomeçar.");
      }
    });
  }

  /** Envia a foto já conferida (ou forçada pelo "Enviar assim mesmo"). */
  async function sendPhoto(file: File, classification: ClassifyResult | null) {
        const uploadSlot =
          docType === "rg" && classification?.completeness === "full" ? "rg_full" : slot;

        const body = new FormData();
        body.append("slot", uploadSlot);
        body.append("photo", file, file.name);
        const response = await fetch("/api/me/document/photo", { method: "POST", body });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await response.json();
        if (!response.ok) {
          const redirectTo = wrongStatusHref(data.code, data.expected_status, "/documento");
          if (redirectTo) {
            router.push(redirectTo);
            return;
          }
          setError(data.detail ?? "Não conseguimos receber essa foto. Tente novamente.");
          return;
        }

        if (uploadSlot === "rg_front") {
          setRgFrontSent(true);
          setNotice("Frente recebida. A leitura continua em segundo plano.");
          return;
        }
        router.push(NEXT_STAGE.documents);
  }

  /** Escape do aviso: a pessoa confirma que a foto está certa e envia mesmo. */
  function onSendAnyway() {
    const file = heldFile;
    if (!file || pending) return;
    setError(null);
    setHeldFile(null);
    startTransition(async () => {
      try {
        await sendPhoto(file, null);
      } catch {
        setError("A conexão oscilou. Tente novamente — a etapa pode ser retomada sem recomeçar.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {pending && <LoadingOverlay label="Recebendo foto…" logo />}
      <fieldset className="space-y-2" disabled={pending || rgFrontSent}>
        <legend className="label">Qual documento você vai usar?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["rg", "cnh"] as const).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border px-4 py-3 ${
                docType === type
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-[var(--surface-border)] bg-[var(--surface)]"
              }`}
            >
              <input
                className="accent-gold-deep mr-2"
                type="radio"
                name="doc_type"
                value={type}
                checked={docType === type}
                onChange={() => {
                  setDocType(type);
                  setError(null);
                }}
              />
              {type.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-[var(--radius)] border border-dashed border-brand-gold-dark/45 bg-[var(--surface)] p-4 space-y-3">
        <p className="font-semibold">{docType ? prompt : "Escolha RG ou CNH para continuar"}</p>
        <p className="text-xs text-[var(--surface-text-muted)]">
          A foto só precisa mostrar o documento inteiro e legível. A conferência detalhada não prende você nesta tela.
        </p>
        <UploadActions
          disabled={!docType || pending}
          pending={pending}
          onFile={onUpload}
        />
      </div>

      {notice && <div className="banner banner-ok" role="status">{notice}</div>}
      <FieldError>{error}</FieldError>

      {heldFile && (

        // A conferência é ajudante, não juiz: se a pessoa garante que a foto
        // está certa, ela envia — quem decide de verdade é a análise do backend.
        <button
          type="button"
          onClick={onSendAnyway}
          disabled={pending}
          className="w-full rounded-full border border-[var(--surface-border)] px-4 py-3 text-sm font-semibold text-[var(--surface-text)] transition-colors hover:border-brand-gold disabled:opacity-50"
        >
          Enviar assim mesmo
        </button>
      )}

      <div className="pt-2 text-center">
        <Link
          href="/painel"
          className="text-xs text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] underline"
        >
          Fazer isso depois e voltar ao painel
        </Link>
      </div>
    </div>
  );
}

