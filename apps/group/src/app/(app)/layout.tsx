"use client";

import { AdminLayout } from "@/components/ui/admin-nav";
import { LoadingState } from "@/components/ui/spinner";
import { useRequireStaff } from "@/lib/use-require-staff";

/**
 * Layout de todo o admin autenticado. Roda o guard (token + superuser via
 * confirmStaff) UMA vez e, enquanto confirma, segura o conteúdo num loading —
 * assim nenhuma tela filha pisca dados antes de a permissão ser confirmada.
 * Aprovado → envolve no AdminLayout (nav lateral + conteúdo).
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const phase = useRequireStaff();

  if (phase !== "ok") {
    return <LoadingState label="Confirmando seu acesso…" />;
  }
  return <AdminLayout>{children}</AdminLayout>;
}

