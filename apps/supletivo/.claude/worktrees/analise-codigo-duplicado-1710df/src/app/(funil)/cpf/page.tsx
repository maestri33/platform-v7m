import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Confirme seu CPF — Supletivo Brasil",
};

/** Passos 3 e 4 do funil — CPF + pergaminho da identidade (mesma rota: o reveal
 * não é um lugar aonde se chega por link, é consequência do CPF confirmado). */
export default function CpfPage() {
  return <FunnelScreen />;
}
