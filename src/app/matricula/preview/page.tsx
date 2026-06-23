import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";

import { AwaitingRelease } from "../page";
import { PreviewStep } from "./preview-client";

/**
 * Dev-only visual proof of the wizard screens. `?step=rg|address|education|selfie`
 * renders that step's form with no-op handlers; without it, the terminal
 * awaiting_release screen. No auth, no backend. 404s in production.
 */
const STEPS = ["Documento", "Endereço", "Estudos", "Selfie"];

export default async function MatriculaPreview({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const step = sp.step;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-7">
        <span className="text-sm font-bold text-brand-blue">← Painel</span>

        <header className="flex flex-col gap-4">
          <h1 className="text-[26px] font-extrabold leading-tight text-brand-ink">
            {step ? "Complete sua matrícula" : "Matrícula enviada"}
          </h1>
          <ol className="flex gap-2" aria-label="Etapas da matrícula">
            {STEPS.map((label) => (
              <li key={label} className="flex flex-1 flex-col gap-1.5">
                <span className="h-1.5 rounded-full bg-brand-green" />
                <span className="text-center text-[11px] font-bold text-brand-green">✓ {label}</span>
              </li>
            ))}
          </ol>
        </header>

        <Card as="section">
          {step ? <PreviewStep step={step} /> : <AwaitingRelease completed={false} />}
        </Card>
      </div>
    </main>
  );
}
