"use client";

import { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * One box per digit. Gap-free model: typed digits always append at the first
 * empty box (focus is redirected there), Backspace removes the last digit.
 * Paste and iOS SMS autofill ("one-time-code") distribute across the boxes.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  invalid = false,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function focusActive(current: string) {
    refs.current[Math.min(current.length, length - 1)]?.focus();
  }

  function append(raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return;
    const next = (value + digits).slice(0, length);
    onChange(next);
    requestAnimationFrame(() => focusActive(next));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = value.slice(0, -1);
      onChange(next);
      requestAnimationFrame(() => focusActive(next));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    append(e.clipboardData.getData("text"));
  }

  return (
    <div role="group" aria-label={`Código de verificação de ${length} dígitos`} className="flex gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Dígito ${i + 1}`}
          disabled={disabled}
          value={value[i] ?? ""}
          onFocus={() => focusActive(value)}
          onChange={(e) => append(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={`h-14 w-full min-w-0 rounded-xl border bg-brand-surface text-center text-2xl font-extrabold text-brand-ink outline-none transition focus:ring-2 focus:ring-brand-blue-bright/40 disabled:bg-brand-bg ${
            invalid ? "border-brand-danger" : "border-brand-border focus:border-brand-blue-bright"
          }`}
        />
      ))}
    </div>
  );
}
