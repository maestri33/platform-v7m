"use client";

import { StepAddress, StepEducation, StepRg, StepSelfie } from "../steps";

const noop = () => {};

/** Dev-only: renderiza um passo isolado com handlers no-op, pra inspeção visual. */
export function PreviewStep({ step }: { step: string }) {
  const props = { onDone: noop, onWrongStatus: noop, setBusy: noop, busy: false };
  if (step === "rg") return <StepRg {...props} />;
  if (step === "address") return <StepAddress {...props} />;
  if (step === "education") return <StepEducation {...props} />;
  if (step === "selfie") return <StepSelfie {...props} previewNoContract />;
  return null;
}
