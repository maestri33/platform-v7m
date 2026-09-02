"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SelfieForm } from "./SelfieForm";
import { ArrowLeft, Camera } from "lucide-react";

export default function SelfieOnboardingPage() {
  return (
    <PageShell
      title="Selfie & Assinatura Eletrônica"
      description="Tire uma selfie para validação biométrica e assinatura digital do termo de parceria."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Camera className="size-3.5" />
          <span>5 de 5 Deveres</span>
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
            <CardTitle className="text-base">Captura de Selfie Biométrica</CardTitle>
            <CardDescription>
              A foto será associada à data, horário e IP para a segurança dos seus repasses semanais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SelfieForm />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
