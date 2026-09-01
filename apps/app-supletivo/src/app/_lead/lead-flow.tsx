"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";

import { LoadingOverlay } from "@v7m/ui";
import { getSession } from "@/lib/session";

import { ROUTE_SCREENS } from "./flow-data";
import { LeadModal } from "./lead-modal";
import { Switcher } from "./switcher";
import { useLeadFlow, type FlowActions, type FlowState } from "./use-lead-flow";

/**
 * Provider do funil do lead — vive no layout do grupo `(funil)`, então monta
 * UMA vez e sobrevive à navegação entre os passos (/ → /login → /cpf → …).
 * A máquina de estados (use-lead-flow) segue dona de inputs/fases/modais;
 * a URL virou a fonte de verdade de QUAL passo está na tela.
 */
const FunnelCtx = createContext<{ s: FlowState; act: FlowActions } | null>(null);

export function useFunnel(): { s: FlowState; act: FlowActions } {
  const ctx = useContext(FunnelCtx);
  if (!ctx) {
    throw new Error(
      "useFunnel fora do <FunnelProvider> — a tela precisa estar sob o layout do grupo (funil).",
    );
  }
  return ctx;
}

// Sincronizar URL → tela ANTES do paint (sem frame fantasma da tela inicial ao
// recarregar em /login). No servidor, useLayoutEffect não roda — cai no useEffect.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function FunnelProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const push = useCallback((route: string) => router.push(route), [router]);
  const { s, act } = useLeadFlow(push);

  // URL → máquina: cobre voltar/avançar do navegador e link direto. O eco do
  // nosso próprio push é inofensivo (syncFromRoute é no-op quando já alinhado).
  useIsomorphicLayoutEffect(() => {
    const screen = ROUTE_SCREENS[pathname];
    if (screen) act.syncFromRoute(screen);
  }, [pathname, act]);

  // Guarda de ENTRADA: rota funda sem a sessão da tela 1 → começa do começo.
  // Só no mount — dali em diante quem manda é a máquina (e, na tela 2+, o
  // next-step do backend). Roda depois do boot() do hook (mesmo ciclo de efeitos).
  //
  // `?relogin=1` (/matricula e /provas devolvem pra cá quando o JWT morre): a sessão do
  // aparelho ainda guarda o telefone, então em vez de pedir que a pessoa digite de novo o
  // número que ela acabou de usar, o código sai sozinho. Lido de `window.location` — e não de
  // `useSearchParams` — pra não arrastar o layout inteiro do funil pra dentro de um Suspense.
  useEffect(() => {
    const screen = ROUTE_SCREENS[pathname];
    if (!screen || screen === "check") return;
    const phone = getSession()?.phone;
    if (!phone) {
      router.replace("/");
      return;
    }
    if (screen === "login" && new URLSearchParams(window.location.search).get("relogin") === "1") {
      act.startRelogin(phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarda de entrada, não de navegação
  }, []);

  // Toda espera ganha o véu: blur na tela inteira + loop centralizado + o que
  // está acontecendo — ninguém fica perdido olhando spinner pequeno no canto.
  const veilMsg = s.checking
    ? "Verificando seu número…"
    : s.otpBusy
      ? "Conferindo seu código…"
      : s.cpfChecking
        ? "Confirmando seu CPF…"
        : s.emailPhase === "processing"
          ? "Verificando seu e-mail…"
          : null;

  return (
    <FunnelCtx.Provider value={{ s, act }}>
      {children}

      <LoadingOverlay show={!!veilMsg} message={veilMsg ?? undefined} />
      {s.modalKind && <LeadModal kind={s.modalKind} act={act} />}
      <Switcher s={s} act={act} />
    </FunnelCtx.Provider>
  );
}
