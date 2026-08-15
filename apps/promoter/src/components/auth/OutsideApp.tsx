"use client";

import { useEffect } from "react";
import Image from "next/image";

import { OUTSIDE_APP_URL } from "@/lib/auth/roles";

/**
 * Tela de transição pra sessão sem nenhuma role interna (candidate/training/
 * promoter): a conta é do app do cliente (Supletivo). Mostra 1 tela de contexto
 * e redireciona sozinha — o botão cobre quem bloqueou o redirect.
 */
const REDIRECT_MS = 4000;

export function OutsideApp() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.replace(OUTSIDE_APP_URL);
    }, REDIRECT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-char px-6 text-center">
      <div className="mb-5 h-14 w-14 rounded-2xl bg-white p-2">
        <Image src="/icon.svg" alt="V7M" width={40} height={40} className="h-full w-full object-contain" />
      </div>
      <h1 className="font-display text-xl text-white">Esse acesso é de outro app</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-brand-muted-on-dark">
        Sua conta não tem papel de candidato, treinamento ou promotor por aqui —
        essa área é do Supletivo. Vamos te levar pra lá.
      </p>
      <a href={OUTSIDE_APP_URL} className="btn mt-6">
        Ir para app.supletivo.net.br ↗
      </a>
    </div>
  );
}
