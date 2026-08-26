import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Preparando seu pagamento — Supletivo Brasil",
};

/** Passo 7 do funil — timeline do checkout até a entrega no gateway. */
export default function CheckoutPage() {
  return <FunnelScreen />;
}
