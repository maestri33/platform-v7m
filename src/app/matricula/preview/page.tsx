import { notFound } from "next/navigation";

import { AwaitingRelease } from "../page";

/**
 * Dev-only visual proof that the wizard's FINAL screen (awaiting_release) renders.
 * Mocked state — no auth, no backend. Reproduces the awaiting branch of the real
 * MatriculaPage (full-green stepper + terminal card). 404s in production.
 */
const STEPS = ["Documento", "Endereço", "Estudos", "Selfie"];

export default function MatriculaPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-7">
        <span className="text-sm font-bold text-brand-blue">← Painel</span>

        <header className="flex flex-col gap-4">
          <h1 className="text-[26px] font-extrabold leading-tight text-brand-ink">
            Matrícula enviada
          </h1>
          <ol className="flex gap-2" aria-label="Etapas da matrícula">
            {STEPS.map((label) => (
              <li key={label} className="flex flex-1 flex-col gap-1.5">
                <span className="h-1.5 rounded-full bg-brand-green" />
                <span className="text-center text-[11px] font-bold text-brand-green">
                  ✓ {label}
                </span>
              </li>
            ))}
          </ol>
        </header>

        <section className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-[0_8px_24px_rgba(11,27,59,0.06)]">
          <AwaitingRelease completed={false} />
        </section>
      </div>
    </main>
  );
}
