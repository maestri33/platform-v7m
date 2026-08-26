"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-render periódico do server component enquanto algo está "acontecendo do
 * lado de lá": IA corrigindo uma resposta ou backend prestes a soltar a role
 * `training` (aí o guard da página redireciona sozinho e a trava some).
 */
export function TrainingRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
