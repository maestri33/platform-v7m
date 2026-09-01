"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiCollaborators, type DocumentSection } from "@/lib/api-collaborators";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate-funnel";
import {
  IdentityDocumentCapture,
  type IdentityDocType,
  type IdentityUploadMode,
  type IdentitySlot,
} from "@v7m/ui";
import { ArrowRight } from "lucide-react";

type Props = {
  initial?: DocumentSection;
};

export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [docType, setDocType] = React.useState<IdentityDocType>(
    initial?.doc_type === "cnh" ? "cnh" : "rg"
  );
  const [rgFrontSent, setRgFrontSent] = React.useState(
    initial?.analysis_status !== "rejected" && Boolean(initial?.has_front || initial?.front_photo)
  );
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = (selectedFile: File, mode: IdentityUploadMode, slot: IdentitySlot) => {
    if (!selectedFile || pending) return;
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const uploadSlot =
          docType === "rg" && mode === "full" ? "rg_full" : slot;

        await apiCollaborators.uploadDocumentPhoto(uploadSlot, selectedFile);

        if (uploadSlot === "rg_front") {
          setRgFrontSent(true);
          setFile(null);
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
    });
  };

  React.useEffect(() => {
    if (initial?.doc_type === "rg" || initial?.doc_type === "cnh") {
      setDocType(initial.doc_type);
    }
  }, [initial?.doc_type]);

  return (
    <div className="space-y-6">
      <IdentityDocumentCapture
        allowedTypes={["rg", "cnh"]}
        docType={docType}
        onDocTypeChange={setDocType}
        hasFrontSent={rgFrontSent}
        file={file}
        onFileChange={setFile}
        onClassify={async (f) => {
          return await apiCollaborators.classifyDocument(f);
        }}
        onSubmit={handleSubmit}
        isSubmitting={pending}
        error={error}
        onClearError={() => setError(null)}
        notice={notice}
        showSubmitButton={true}
        submitButtonLabel={rgFrontSent ? "Concluir Envio do RG" : "Continuar"}
      />

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
