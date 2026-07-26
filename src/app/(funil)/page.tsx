import { FunnelScreen } from "../_lead/funnel-screen";

/**
 * Passo 1 do funil — o check do WhatsApp (`/`). O `?ref=` do promotor é lido
 * no cliente (URL → cookie de 60d, lead-ref.ts) — a atribuição sobrevive a
 * recarga e a volta por link limpo. Título/descrição vêm do layout raiz.
 */
export default function CheckPage() {
  return <FunnelScreen />;
}
