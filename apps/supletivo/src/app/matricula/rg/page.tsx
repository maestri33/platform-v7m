"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { InlineSpinner } from "@v7m/ui";
import { getAccessToken } from "@/lib/session";

/**
 * `/matricula/rg` — endereço próprio do passo do documento (Victor 2026-07-28).
 *
 * O wizard vive todo em `/matricula` e escolhe a seção pelo `status` que o servidor manda,
 * então esta rota não duplica a tela: ela existe pra ser LINKÁVEL. É pra onde o aviso de
 * documento reprovado aponta (no WhatsApp, no e-mail, no painel do polo) e é onde a flag
 * `blocked` deságua — o servidor mantém o status em `rg` enquanto o documento não passa,
 * então cair em `/matricula` já abre o passo certo.
 *
 * Sem sessão vai pra "/" pela mesma régua do wizard: o funil é o único caminho de entrada.
 */
export default function MatriculaRgPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAccessToken() ? "/matricula" : "/");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-10 text-center">
      <InlineSpinner className="size-9" />
      <p className="text-base font-semibold text-brand-ink">Abrindo seu documento…</p>
    </div>
  );
}
