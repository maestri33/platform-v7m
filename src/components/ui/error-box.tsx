type Tone = "danger" | "success" | "neutral";

interface ErrorBoxProps {
  message: string | null;
  /** When true, render with the success (green) palette. Shorthand for tone="success". */
  success?: boolean;
  /**
   * Visual palette: "danger" (default — red alert), "success" (green), or
   * "neutral" (the muted info-note used across the funnel for non-error copy).
   * `success` is kept for back-compat and wins when both are set.
   */
  tone?: Tone;
}

const TONE: Record<Tone, string> = {
  danger: "border-brand-danger bg-brand-danger-bg text-brand-danger",
  success: "border-brand-green bg-brand-green-bg text-brand-green-dark",
  neutral: "border-brand-border bg-brand-bg text-brand-muted",
};

/**
 * Inline banner used across the funnel. The matrícula wizard defined it locally;
 * extracted so every danger banner shares one markup. `tone="neutral"` covers
 * the muted info-notes (não-erro) that were hand-rolled in painel/matrícula/etc.
 * Danger/success keep role="alert"; neutral is just an info note (no alert role).
 */
export function ErrorBox({ message, success = false, tone }: ErrorBoxProps) {
  if (!message) return null;
  const resolved: Tone = success ? "success" : (tone ?? "danger");
  const isAlert = resolved !== "neutral";
  return (
    <div
      role={isAlert ? "alert" : undefined}
      className={`rounded-xl border p-3.5 text-[15px] font-semibold leading-relaxed ${TONE[resolved]}`}
    >
      {message}
    </div>
  );
}
