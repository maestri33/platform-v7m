"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-[var(--gutter)] py-10">
      <div className="app-bg grain" aria-hidden />
      <PageShell width="narrow">
        <CompactHeader
          kicker="V7M · Erro"
          title="Algo deu errado"
          subtitle="A gente já registrou. Tenta de novo — se persistir, abre o app de novo e entra de novo na sua conta."
        />
        {error.digest && (
          <p className="text-xs text-[var(--surface-text-muted)]/70">ref: {error.digest}</p>
        )}
        <Button type="button" onClick={reset} size="xl" className="w-full">
          Tentar de novo
        </Button>
      </PageShell>
    </div>
  );
}
