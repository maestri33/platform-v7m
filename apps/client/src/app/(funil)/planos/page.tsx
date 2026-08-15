import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Escolha como pagar — Supletivo Brasil",
};

/** Passo 6 do funil — planos (Pix / Cartão). Substitui o /planos v1. */
export default function PlanosPage() {
  return <FunnelScreen />;
}
