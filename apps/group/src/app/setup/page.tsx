"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBootstrapStatus } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { Spinner } from "@/components/ui/spinner";
import { SetupWizard } from "./setup-wizard";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [setupRequired, setSetupRequired] = useState(true);

  useEffect(() => {
    // 1. Se já estiver logado com sessão ativa -> vai para o dashboard
    if (getAccessToken()) {
      router.replace("/dashboard");
      return;
    }

    // 2. Verifica se a plataforma já foi inicializada no backend
    let mounted = true;
    getBootstrapStatus()
      .then((status) => {
        if (!mounted) return;
        if (status.bootstrapped) {
          // Hard-lock estrito: plataforma já configurada -> tranca acesso ao setup e vai para /login
          setSetupRequired(false);
          router.replace("/login");
        } else {
          setSetupRequired(true);
          setChecking(false);
        }
      })
      .catch(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-xs font-bold text-brand-muted">Verificando estado da plataforma...</p>
        </div>
      </main>
    );
  }

  if (!setupRequired) {
    return null;
  }

  return (
    <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <SetupWizard />
    </main>
  );
}
