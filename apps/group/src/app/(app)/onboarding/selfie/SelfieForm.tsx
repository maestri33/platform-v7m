"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiCollaborators } from "@/lib/api-collaborators";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate-funnel";
import { compressImage, MAX_UPLOAD_BYTES, FILE_TOO_LARGE_MSG } from "@/lib/images/compress";
import { Button } from "@v7m/ui";
import { Spinner } from "@v7m/ui";
import { AgreementSheet } from "./AgreementSheet";
import { Camera, Upload, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export function SelfieForm() {
  const router = useRouter();
  const [agreed, setAgreed] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileSelected(rawFile: File) {
    if (pending) return;
    setError(null);

    startTransition(async () => {
      try {
        const file = await compressImage(rawFile);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(FILE_TOO_LARGE_MSG);
          return;
        }

        await apiCollaborators.uploadCandidateSelfie(file);
        router.push(NEXT_STAGE.selfie);
      } catch (err: unknown) {
        const errObj = err as { code?: string; extra?: { expected_status?: string }; message?: string };
        const redirectTo = wrongStatusHref(errObj.code, errObj.extra?.expected_status, "/onboarding/selfie");
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }
        setError(errObj.message || "Não foi possível enviar a selfie. Tire uma foto com boa iluminação e sem óculos escuros.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!agreed && <AgreementSheet onAccept={() => setAgreed(true)} />}

      <div className="space-y-2 text-sm text-brand-muted">
        <p>
          Tire uma selfie frontal do seu rosto para a assinatura eletrônica do termo de parceria e validação de liveness.
        </p>
        <ul className="text-xs list-disc list-inside space-y-1 text-brand-ink/80 pt-1">
          <li>Fique em um ambiente bem iluminado</li>
          <li>Remova óculos escuros, chapéus ou bonés</li>
          <li>Mantenha uma expressão neutra e olhe diretamente para a câmera</li>
        </ul>
      </div>

      {/* Caixa de Upload */}
      <div className="rounded-2xl border-2 border-dashed border-brand-border bg-slate-50/50 p-6 text-center space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
          }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            disabled={pending}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Camera className="size-4 mr-2" />
            Abrir Câmera Frontal
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="size-4 mr-2" />
            Carregar Foto da Galeria
          </Button>
        </div>
      </div>

      {pending && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-blue py-2">
          <Spinner />
          <span>Validando biometria e registrando assinatura…</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
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
