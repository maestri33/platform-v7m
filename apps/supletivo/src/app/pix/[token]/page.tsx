import type { Metadata } from "next";

import { PixCheckout } from "./pix-checkout";

/**
 * Página PIX PRÓPRIA — destino do link curto `/lead/checkout/<token>` (issue #158).
 *
 * O PIX da matrícula é um **QR Code estático** do Asaas (`/v3/pix/qrCodes/static`): mais barato
 * que a fatura gerenciada, mas SEM página de pagamento hospedada. Antes desta rota o link que o
 * lead recebia no WhatsApp não tinha para onde redirecionar e devolvia 503 para sempre.
 *
 * Aqui o `token` do link curto é a única credencial: a rota é pública porque o lead abre o link
 * direto do WhatsApp, sem sessão. O backend (`GET /api/v1/clients/lead/pix/<token>`) devolve só
 * valor + copia-e-cola + PNG + pago/não pago — nenhum dado pessoal.
 */
export const metadata: Metadata = {
  title: "Pague sua matrícula com PIX — Supletivo Brasil",
  description: "Escaneie o QR Code ou copie o código PIX para concluir sua matrícula.",
  robots: { index: false, follow: false },
};

export default async function PixPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PixCheckout token={token} />;
}
