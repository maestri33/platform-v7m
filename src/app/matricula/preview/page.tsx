import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";

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
      <div className="flex w-full max-w-md flex-col gap-7">
        <BackLink tone="onLight">Painel</BackLink>

        <header className="flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold leading-tight text-brand-ink sm:text-[26px]">
            {step ? "Complete sua matrícula" : "Matrícula enviada"}
          </h1>
          <Stepper current={STEPS.length} labels={STEPS} ariaLabel="Etapas da matrícula" />
        </header>

        <Card as="section">
          {step ? <PreviewStep step={step} /> : <AwaitingRelease completed={false} poll={false} />}
        </Card>
      </div>
    </main>
  );
}
