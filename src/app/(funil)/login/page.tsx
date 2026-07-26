import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Confirme seu código — Supletivo Brasil",
};

/**
 * Passo 2 do funil — OTP do WhatsApp. Substitui o login antigo (v1): o funil
 * v2 é o único caminho de entrada (DOCUMENTACAO, "martelo batido").
 *
 * `?relogin=1` (usado por /matricula e /provas quando o JWT morre) é atendido pelo
 * FunnelProvider: com a sessão do aparelho em mãos, o código sai sozinho e o gate de role do
 * funil não se aplica — quem volta de lá já passou do lead. Depois do OTP, o destino sai das
 * roles (DOCUMENTACAO §17-18), sem passar por hub nenhum.
 */
export default function LoginPage() {
  return <FunnelScreen />;
}
