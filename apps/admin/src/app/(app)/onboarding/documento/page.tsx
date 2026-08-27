"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DocForm } from "./DocForm";
import { ArrowLeft, FileText } from "lucide-react";

export default function DocumentoOnboardingPage() {
  const { data: doc, isLoading } = useQuery({
    queryKey: ["candidate-document"],
    queryFn: () => apiCollaborators.getCandidateDocument(),
  });

  return (
    <PageShell
      title="Documento Oficial de Identificação"
      description="Envie a foto do seu RG ou CNH para comprovação de identidade e liberação dos saques."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <FileText className="size-3.5" />
          <span>1 de 5 Deveres</span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-ink transition"
        >
          <ArrowLeft className="size-3.5" />
          <span>Voltar para as etapas</span>
        </Link>

        <Card className="shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload de Documento (RG / CNH)</CardTitle>
            <CardDescription>
              Tire uma foto nítida do documento original ou envie o arquivo digital em PDF/imagem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocForm initial={doc} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
