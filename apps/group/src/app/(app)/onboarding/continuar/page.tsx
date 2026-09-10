"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import { candidateStageHref, stageHref } from "@/lib/candidate-funnel";
import { Spinner } from "@v7m/ui";

export default function ContinuarOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const expected = searchParams.get("expected");

  const { data: me, isLoading } = useQuery({
    queryKey: ["candidate-me"],
    queryFn: () => apiCollaborators.getCandidateMe(),
  });

  React.useEffect(() => {
    if (isLoading) return;
    if (!me) {
      router.push("/onboarding");
      return;
    }

    const target = candidateStageHref(me);
    if (!target.startsWith("/")) {
      router.push("/vendas");
      return;
    }

    if (from && target === from) {
      const fallback = expected ? stageHref(expected) : "/onboarding";
      router.push(fallback !== from ? fallback : "/onboarding");
      return;
    }

    router.push(target);
  }, [me, isLoading, from, expected, router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Spinner />
      <p className="text-xs text-brand-muted font-medium">
        Identificando sua próxima etapa de ativação…
      </p>
    </div>
  );
}
