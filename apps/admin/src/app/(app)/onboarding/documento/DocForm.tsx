"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiCollaborators, type DocumentSection, type ClassifyResult } from "@/lib/api-collaborators";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate-funnel";
import { compressImage, MAX_UPLOAD_BYTES, FILE_TOO_LARGE_MSG } from "@/lib/images/compress";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Upload, Camera, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

type DocType = "rg" | "cnh";

type Props = {
  initial?: DocumentSection;
};

export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [docType, setDocType] = React.useState<DocType | null>(
    initial?.doc_type === "rg" || initial?.doc_type === "cnh" ? initial.doc_type : null
  );
  const [rgFrontSent, setRgFrontSent] = React.useState(
    initial?.analysis_status !== "rejected" && Boolean(initial?.has_front || initial?.front_photo)
  );
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [heldFile, setHeldFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const slot = docType === "rg" ? (rgFrontSent ? "rg_back" : "rg_front") : "cnh_full";
  const prompt =
    docType === "rg"
      ? rgFrontSent
        ? "Agora envie o VERSO do RG"
        : "Primeiro envie a FRENTE do RG"
      : "Envie a CNH aberta ou o PDF da CNH Digital";

  async function confirmDocument(file: File) {
    try {
      const classification = await apiCollaborators.classifyDocument(file);
      if (classification.is_document === false) {
        return {
          proceed: false,
          classification,
          reason: "Essa imagem não parece ser um documento oficial. Confira a foto ou envie assim mesmo.",
        };
      }
      if (docType === "rg") {
        const expectedSide = rgFrontSent ? "back" : "front";
        const detectedSide = classification.completeness;
        if ((detectedSide === "front" || detectedSide === "back") && detectedSide !== expectedSide) {
          const detectedObject = detectedSide === "front" ? "a FRENTE" : "o VERSO";
          const expectedRequest = expectedSide === "front" ? "da FRENTE" : "do VERSO";
          return {
            proceed: false,
            classification,
            reason: `Essa foto parece ser ${detectedObject} do RG. Agora precisamos ${expectedRequest}.`,
          };
        }
      }
      return { proceed: true, classification };
    } catch {
      return { proceed: true, classification: null };
    }
  }

  function handleFileSelected(rawFile: File) {
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
          setHeldFile(file);
          setError(decision.reason ?? "Confira a foto e tente novamente.");
          return;
        }

        await sendPhoto(file, decision.classification);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar o documento.";
        setError(msg);
      }
    });
  }

  async function sendPhoto(file: File, classification: ClassifyResult | null) {
    const uploadSlot =
      docType === "rg" && classification?.completeness === "full" ? "rg_full" : slot;

    try {
      await apiCollaborators.uploadDocumentPhoto(uploadSlot, file);

      if (uploadSlot === "rg_front") {
        setRgFrontSent(true);
        setNotice("Frente do RG recebida com sucesso! Agora envie o verso.");
        return;
      }

      router.push(NEXT_STAGE.documents);
    } catch (err: unknown) {
      const errObj = err as { code?: string; extra?: { expected_status?: string }; message?: string };
      const redirectTo = wrongStatusHref(errObj.code, errObj.extra?.expected_status, "/onboarding/documento");
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      setError(errObj.message || "Não conseguimos processar essa foto. Tente novamente.");
    }
  }

  function handleSendAnyway() {
    if (!heldFile || pending) return;
    const file = heldFile;
    setError(null);
    setHeldFile(null);
    startTransition(async () => {
      try {
        await sendPhoto(file, null);
      } catch {
        setError("Erro ao enviar a foto. Tente novamente.");
      }
    });
  }

  React.useEffect(() => {
    if (initial?.doc_type === "rg" || initial?.doc_type === "cnh") {
      setDocType(initial.doc_type);
    }
  }, [initial?.doc_type]);

  return (
    <div className="space-y-6">
      {/* Seleção do Tipo de Documento */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Qual documento você vai apresentar?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["rg", "cnh"] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={pending || rgFrontSent}
              onClick={() => {
                setDocType(type);
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-bold transition ${
                docType === type
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue ring-2 ring-brand-blue/20"
                  : "border-brand-border bg-white text-brand-ink hover:bg-slate-50"
              }`}
            >
              <span>{type.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Caixa de Upload */}
      <div className="rounded-2xl border-2 border-dashed border-brand-border bg-slate-50/50 p-6 text-center space-y-4">
        <div className="space-y-1">
          <p className="font-bold text-sm text-brand-ink">
            {docType ? prompt : "Escolha RG ou CNH para continuar"}
          </p>
          <p className="text-xs text-brand-muted max-w-sm mx-auto">
            Certifique-se de que o documento esteja bem iluminado, sem reflexos e com todas as bordas visíveis.
          </p>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
          }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={!docType || pending}
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="size-4 mr-2" />
            Escolher Arquivo / Galeria
          </Button>
          <Button
            type="button"
            disabled={!docType || pending}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Camera className="size-4 mr-2" />
            Tirar Foto Agora
          </Button>
        </div>
      </div>

      {/* Feedback & Loading */}
      {pending && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-blue py-2">
          <Spinner />
          <span>Processando e enviando imagem…</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-700">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {heldFile && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendAnyway}
              disabled={pending}
              className="w-full text-xs"
            >
              Enviar assim mesmo
            </Button>
          )}
        </div>
      )}

      <div className="pt-2 flex justify-between items-center text-xs">
        <Link
          href="/onboarding"
          className="text-brand-muted hover:text-brand-ink transition underline"
        >
          Voltar ao resumo
        </Link>
        <Link
          href="/vendas"
          className="text-brand-blue font-semibold hover:underline inline-flex items-center gap-1"
        >
          Ir ao Painel de Vendas <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
