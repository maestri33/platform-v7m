interface ErrorBoxProps {
  message: string | null;
  /** When true, render with the success (green) palette instead of danger. */
  success?: boolean;
}

/**
 * Inline error / success banner used across the funnel. The matrícula wizard
 * defined it locally; extracted so the student document flow can reuse the
 * same visual without duplicating markup.
 */
export function ErrorBox({ message, success = false }: ErrorBoxProps) {
  if (!message) return null;
  const tone = success
    ? "border-brand-green bg-brand-green-bg text-brand-green-dark"
    : "border-brand-danger bg-brand-danger-bg text-brand-danger";
  return (
    <div
      role="alert"
      className={`rounded-xl border p-3.5 text-[15px] font-semibold leading-relaxed ${tone}`}
    >
      {message}
    </div>
  );
}
