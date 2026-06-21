import Link from "next/link";

import { formatBRL } from "@/lib/money";
import { withParams } from "@/lib/nav";
import { getPricing } from "@/lib/pricing-server";

interface PlanosPageProps {
  searchParams: Promise<{ phone?: string; ref?: string }>;
}

export default async function PlanosPage({ searchParams }: PlanosPageProps) {
  const sp = await searchParams;
  const phone = sp.phone ?? "";
  const ref = sp.ref ?? "";
  const pricing = await getPricing();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-3xl flex-col gap-7">
        <header className="flex flex-col gap-3">
          <Link href={withParams("/", { ref })} className="text-sm font-bold text-white/85">
            ← Voltar
          </Link>
          <h1 className="text-[28px] font-extrabold leading-tight text-white">
            Escolha como pagar
          </h1>
          <p className="text-base leading-relaxed text-white/70">
            Conclua sua matrícula no Supletivo Brasil. Selecione a forma de pagamento para
            continuar o cadastro.
          </p>
        </header>

        {pricing ? (
          <div className="grid gap-4 md:grid-cols-2">
            {/* PIX — recommended */}
            <Link
              href={withParams("/register", { phone, pm: "pix", ref })}
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
              <span className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-green px-5 font-bold text-white transition group-hover:bg-brand-green-dark">
                Escolher Pix
              </span>
            </Link>

            {/* Card — installments */}
            <Link
              href={withParams("/register", { phone, pm: "card", ref })}
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
              <span className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-brand-blue px-5 font-bold text-brand-blue transition group-hover:bg-brand-blue/5">
                Escolher cartão
              </span>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-danger bg-brand-danger-bg p-5 text-[15px] font-semibold text-brand-danger">
            Não foi possível carregar os valores agora. Atualize a página e tente novamente.
          </div>
        )}
      </div>
    </main>
  );
}
