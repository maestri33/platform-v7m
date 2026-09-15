"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@v7m/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@v7m/ui";
import { EscolaridadeForm } from "./EscolaridadeForm";
import { ArrowLeft, GraduationCap } from "lucide-react";

export default function EscolaridadeOnboardingPage() {
  return (
    <PageShell
      title="Nível de Escolaridade"
      description="Informe seu histórico escolar ou acadêmico para o registro cadastral do promotor."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <GraduationCap className="size-3.5" />
          <span>4 de 5 Deveres</span>
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
            <CardTitle className="text-base">Declaração de Escolaridade</CardTitle>
            <CardDescription>
              Dados para fins de enquadramento de cursos de capacitação e trilhas formativas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EscolaridadeForm />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
