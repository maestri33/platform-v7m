"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Trava de treinamento no client. Se a sessão está travada (role `training`) e a
 * pessoa não está no LMS, manda pro /treinamento. Cobre TODA a casca (promotor e
 * coordenação) sem precisar editar cada página.
 *
 * O gate DURO é o backend (não serve dados de promotor com token travado); aqui é
 * UX — impede circular pela casca enquanto o treino obrigatório (curso inicial ou
 * atualização/recado) não termina. Exceção: as próprias rotas do LMS.
 */
export function TrainingGate({ locked }: { locked: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const redirecting = locked && !pathname.startsWith("/treinamento");

  useEffect(() => {
    if (redirecting) router.replace("/treinamento");
  }, [redirecting, router]);

  // Cobre a tela enquanto redireciona, pra não piscar o conteúdo da página
  // travada antes do replace. z-50 fica acima do header (z-40).
  if (!redirecting) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] px-6 text-center"
    >
      <p className="text-[var(--surface-text-muted)]">
        Treinamento obrigatório — levando você para as matérias…
      </p>
    </div>
  );
}
