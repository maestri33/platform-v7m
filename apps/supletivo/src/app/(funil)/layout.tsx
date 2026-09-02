import type { ReactNode } from "react";

import { FunnelProvider } from "../_lead/lead-flow";

/**
 * Grupo `(funil)` — as 7 rotas do funil do lead compartilham a MESMA máquina
 * de estados: o provider mora aqui, monta uma vez e sobrevive à troca de rota
 * (estado de inputs, cooldown do OTP e modais atravessam os passos).
 */
export default function FunnelLayout({ children }: { children: ReactNode }) {
  return <FunnelProvider>{children}</FunnelProvider>;
}
