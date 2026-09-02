import { redirect } from "next/navigation";

interface RegisterPageProps {
  searchParams: Promise<{ ref?: string }>;
}

/**
 * `/register` aposentado (funil v2: a conta nasce no passo do TELEFONE, em `/`).
 * A rota fica de pé só como redirecionamento — link antigo circulando em
 * WhatsApp/anúncio continua abrindo o funil, e o `?ref=` atravessa junto
 * (a atribuição do promotor não pode morrer num redirect).
 */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const sp = await searchParams;
  const ref = sp.ref?.trim();
  redirect(ref ? `/?ref=${encodeURIComponent(ref)}` : "/");
}
