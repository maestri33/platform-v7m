import { AuthShell } from "@/components/auth/AuthShell";
import { CheckFlow } from "@/components/auth/CheckFlow";

// Este app é o DESTINO do CTA da landing (job.v7m.org) — não é a landing.
// Quem chega já decidiu: a primeira tela é a ENTRADA (check por telefone).
export const metadata = { title: "Entrar" };

// SEM prerender estático: página estática sai com `s-maxage=31536000` e o
// Caddy/Cloudflare seguram o HTML velho por até 1 ano entre deploys. Dinâmica
// como o resto do app → sem cache compartilhado de HTML.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <AuthShell>
      <CheckFlow />
    </AuthShell>
  );
}
