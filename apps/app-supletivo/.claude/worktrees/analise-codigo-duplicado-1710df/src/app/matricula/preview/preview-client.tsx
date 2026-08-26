"use client";

import { PlatformCredentials } from "@/components/ui/platform-credentials";

import { StepAddress, StepEducation, StepRg, StepSelfie } from "../steps";

const noop = () => {};

/** Dev-only: renderiza um passo isolado com handlers no-op, pra inspeção visual. */
export function PreviewStep({ step }: { step: string }) {
  const props = { onDone: noop, onWrongStatus: noop, setBusy: noop, busy: false, setFooter: () => {} };
  if (step === "rg") return <StepRg {...props} />;
  if (step === "address") return <StepAddress {...props} />;
  if (step === "education") return <StepEducation {...props} />;
  if (step === "selfie") return <StepSelfie {...props} previewNoContract />;
  if (step === "credentials")
    return (
      <PlatformCredentials
        url="https://aluno.plataforma.com.br"
        login="joao.santos"
        password="Sup#2026v!"
        notes="Acesse pelo navegador ou pelo app da plataforma. Em caso de dúvida, fale com seu polo."
      />
    );
  return null;
}
