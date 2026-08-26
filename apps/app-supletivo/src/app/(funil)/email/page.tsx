import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Seu e-mail — Supletivo Brasil",
};

/** Passo 5 do funil — e-mail (canal de acesso e confirmações). */
export default function EmailPage() {
  return <FunnelScreen />;
}
