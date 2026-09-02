"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PixForm } from "./PixForm";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function PixOnboardingPage() {
  return (
    <PageShell
      title="Chave PIX para Comissões"
      description="Cadastre a chave PIX onde você receberá seus pagamentos semanais de comissão."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <KeyRound className="size-3.5" />
          <span>3 de 5 Deveres</span>
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
            <CardTitle className="text-base">Cadastro de Conta / Chave PIX</CardTitle>
            <CardDescription>
              A chave precisa pertencer obrigatoriamente ao mesmo CPF cadastrado no portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PixForm />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
