import Link from "next/link";

import { BackLink } from "@/components/ui/back-link";
import { BrandDots } from "@/components/ui/brand-dots";
import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/ui/error-box";
import { IconBadge } from "@/components/ui/icon-badge";
import { formatBRL } from "@/lib/money";
import { withParams } from "@/lib/nav";
import { getPricing } from "@/lib/pricing-server";

interface PlanosPageProps {
  searchParams: Promise<{ phone?: string; ref?: string }>;
}

export default async function PlanosPage({ searchParams }: PlanosPageProps) {
  const sp = await searchParams;
  const ref = sp.ref ?? "";
  const pricing = await getPricing();

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-8">
      <div className="m-auto flex w-full max-w-3xl flex-col gap-7">
        <header className="flex flex-col items-center gap-3 text-center">
          <BackLink href={withParams("/", { ref })}>Voltar</BackLink>
          <IconBadge>
            <svg
              className="size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
              <circle cx="16.5" cy="14.5" r="1" />
            </svg>
          </IconBadge>
          <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-[28px]">
            Como você prefere pagar?
          </h1>
          <BrandDots size="sm" center />
          <p className="text-base leading-relaxed text-white/70">
            Falta só isso pra garantir sua vaga. Escolhe o jeito que fica melhor pra você.
          </p>
        </header>

        {pricing ? (
          <div className="grid gap-4 md:grid-cols-2">
            {/* PIX — recommended */}
            <Link
              href={withParams("/register", { pm: "pix", ref })}
              className="group relative flex flex-col gap-4 rounded-3xl border-2 border-brand-green bg-white p-6 shadow-[0_8px_24px_rgba(11,27,59,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,156,59,0.18)]"
            >
              <span className="absolute -top-3 left-6 rounded-full bg-brand-green px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                Melhor preço
              </span>
              <h2 className="text-xl font-extrabold text-brand-ink">Pix à vista</h2>
              <p className="text-4xl font-extrabold text-brand-green">{formatBRL(pricing.pix)}</p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Pagamento único, aprovação na hora. O jeito mais econômico de garantir sua vaga.
              </p>
              <Button as="span" className="mt-2 group-hover:bg-[#006a27]">
                Escolher Pix
              </Button>
            </Link>

            {/* Card — installments */}
            <Link
              href={withParams("/register", { pm: "card", ref })}
              className="group flex flex-col gap-4 rounded-3xl border border-brand-border bg-white p-6 shadow-[0_8px_24px_rgba(11,27,59,0.06)] transition hover:-translate-y-0.5 hover:border-brand-blue-bright hover:shadow-[0_12px_32px_rgba(11,27,59,0.12)]"
            >
              <h2 className="text-xl font-extrabold text-brand-ink">Cartão de crédito</h2>
              <p className="text-4xl font-extrabold text-brand-blue">
                {pricing.card.installments}×{" "}
                <span className="text-2xl">de {formatBRL(pricing.card.installment)}</span>
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Parcele em até {pricing.card.installments}×. Total de {formatBRL(pricing.card.total)}{" "}
                no cartão.
              </p>
              <Button as="span" variant="secondary" className="mt-2 group-hover:bg-brand-blue/5">
                Escolher cartão
              </Button>
            </Link>
          </div>
        ) : (
          <ErrorBox message="Não foi possível carregar os valores agora. Atualize a página e tente novamente." />
        )}
      </div>
    </main>
  );
}
