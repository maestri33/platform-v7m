import { LeadFlow } from "./_lead/lead-flow";

interface LeadPageProps {
  /** `?ref=<promotor>` relaciona o lead ao promotor que indicou (selo + backend). */
  searchParams: Promise<{ ref?: string }>;
}

/**
 * Funil do lead (lead.supletivo.net.br) — protótipo navegável portado do
 * projeto de design. Substitui o check antigo (`check-client.tsx`, mantido
 * como referência da integração real) enquanto a API se molda ao novo funil.
 */
export default async function LeadPage({ searchParams }: LeadPageProps) {
  const sp = await searchParams;
  return <LeadFlow referral={sp.ref ?? ""} />;
}
