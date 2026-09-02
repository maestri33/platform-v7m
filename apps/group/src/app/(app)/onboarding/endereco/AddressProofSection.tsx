"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiCollaborators, type AddressProofBlock } from "@/lib/api-collaborators";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate-funnel";
import { compressImage, MAX_UPLOAD_BYTES, FILE_TOO_LARGE_MSG } from "@/lib/images/compress";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Upload, Camera, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

type Props = {
  initial: AddressProofBlock | null | undefined;
};

export function AddressProofSection({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [relation, setRelation] = React.useState(initial?.kinship_relation || "");
  const [needsKinship, setNeedsKinship] = React.useState(Boolean(initial?.needs_kinship));
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

        const me = await apiCollaborators.uploadAddressProof(file);
        if (me.address_proof?.needs_kinship) {
          setNeedsKinship(true);
          return;
        }

        router.push(NEXT_STAGE.address);
      } catch (err: unknown) {
        const errObj = err as { code?: string; extra?: { expected_status?: string }; message?: string };
        const redirectTo = wrongStatusHref(errObj.code, errObj.extra?.expected_status, "/onboarding/endereco");
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }
        setError(errObj.message || "Não conseguimos receber o comprovante. Tente novamente.");
      }
    });
  }

  function handleKinshipSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!relation.trim() || pending) return;
    setError(null);

    startTransition(async () => {
      try {
        const me = await apiCollaborators.submitAddressProofKinship(relation.trim());
        if (me.address_proof?.needs_kinship) {
          setError("Por favor, descreva com mais clareza de quem é a conta e seu parentesco/vínculo.");
          return;
        }
        router.push(NEXT_STAGE.address);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao confirmar vínculo de parentesco.";
        setError(msg);
      }
    });
  }

  if (needsKinship) {
    return (
      <form onSubmit={handleKinshipSubmit} className="space-y-4">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-1.5">
          <p className="font-bold text-sm text-amber-700">Comprovante em nome de terceiros</p>
          <p className="text-xs text-brand-muted">
            O documento enviado não está no seu nome direto. Isso é perfeitamente normal! Apenas informe o grau de parentesco ou vínculo com o titular.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            De quem é o comprovante e qual o vínculo?
          </label>
          <input
            type="text"
            required
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            placeholder="Ex.: Conta de luz no nome da minha mãe (moramos juntos)"
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-700">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={pending || !relation.trim()} className="w-full">
          {pending ? <Spinner /> : "Confirmar e Prosseguir"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-sm text-brand-muted">
        <p>
          Envie uma conta de água, energia, internet, gás ou extrato bancário recente (últimos 90 dias).
        </p>
        <p className="text-xs">
          Se a conta estiver em nome de seus pais, cônjuge ou responsável, você poderá indicar o vínculo sem problemas.
        </p>
      </div>

      {initial?.status === "rejected" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-1">
          <p className="font-bold text-xs text-red-700">Comprovante anterior rejeitado</p>
          <p className="text-xs text-red-600">
            {initial.reason || "A imagem estava cortada ou ilegível. Por favor, envie uma nova foto nítida."}
          </p>
        </div>
      )}

      {/* Caixa de Upload */}
      <div className="rounded-2xl border-2 border-dashed border-brand-border bg-slate-50/50 p-6 text-center space-y-4">
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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="size-4 mr-2" />
            Escolher Arquivo / PDF
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Camera className="size-4 mr-2" />
            Tirar Foto do Comprovante
          </Button>
        </div>
      </div>

      {pending && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-blue py-2">
          <Spinner />
          <span>Enviando e validando comprovante…</span>
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
