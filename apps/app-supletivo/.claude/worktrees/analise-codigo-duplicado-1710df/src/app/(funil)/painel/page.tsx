import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Sua vaga te espera — Supletivo Brasil",
};

/** Retorno do lead — vaga reservada + pagamento já preparado. Substitui o
 * /painel v1 (que era pós-pagamento; esse mundo agora vive no app.v7m.org). */
export default function PainelPage() {
  return <FunnelScreen />;
}
