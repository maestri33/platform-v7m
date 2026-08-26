import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { OutsideApp } from "@/components/auth/OutsideApp";
import { AppShell } from "@/components/layout/AppShell";
import { isOutsider } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/server";

// Shell ÚNICO, contexto promotor. A trava de training é aplicada DENTRO do
// AppShell (TrainingGate) — aqui NÃO usamos readUnlockedSession porque o próprio
// /treinamento vive sob este layout e entraria em loop de redirect.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/");

  // Sessão sem nenhuma role interna → conta do app do cliente (Supletivo).
  // Tela de transição + redirect externo, sem shell.
  if (isOutsider(session.roles)) return <OutsideApp />;

  return (
    <AppShell session={session}>
      {children}
    </AppShell>
  );
}
