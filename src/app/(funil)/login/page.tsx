import type { Metadata } from "next";

import { FunnelScreen } from "../../_lead/funnel-screen";

export const metadata: Metadata = {
  title: "Confirme seu código — Supletivo Brasil",
};

/**
 * Passo 2 do funil — OTP do WhatsApp. Substitui o login antigo (v1): o funil
 * v2 é o único caminho de entrada (DOCUMENTACAO, "martelo batido"). O
 * `?relogin=1` que /matricula e /provas usavam será re-suportado na fiação da
 * tela 2 (o mock atual não re-autentica).
 */
export default function LoginPage() {
  return <FunnelScreen />;
}
