"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import { PageShell } from "@v7m/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@v7m/ui";
import { AddressProofSection } from "./AddressProofSection";
import { ArrowLeft, Home } from "lucide-react";

export default function EnderecoOnboardingPage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ["candidate-me"],
    queryFn: () => apiCollaborators.getCandidateMe(),
  });

  return (
    <PageShell
      title="Comprovante de Residência"
      description="Envie um comprovante de residência atualizado para validação do domicílio de pagamento."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Home className="size-3.5" />
          <span>2 de 5 Deveres</span>
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
            <CardTitle className="text-base">Upload do Comprovante de Endereço</CardTitle>
            <CardDescription>
              Aceitamos contas de consumo recente em seu nome ou no nome de familiares/cônjuge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressProofSection initial={me?.address_proof} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
