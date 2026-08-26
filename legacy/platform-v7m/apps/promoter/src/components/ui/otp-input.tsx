"use client";

import { useEffect, useRef } from "react";

/**
 * OTP de 6 dígitos (handoff auth): 6 caixas visuais + 1 input real invisível
 * por cima (inputmode numeric, autocomplete one-time-code p/ autofill do SMS).
 * O input transparente cobre as caixas — foco/digitação nele, pintura nelas.
 *
 * `autoFocus` é aplicado via useEffect (e não pelo atributo do <input>) porque
 * o autoFocus nativo dispara foco durante a hidratação e, em alguns browsers,
 * causa warning "Cannot read properties of null (reading 'removeChild')".
 */
export function OtpInput({
  value,
  onChange,
  error = false,
  autoFocus = false,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  length?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = value.padEnd(length, " ").slice(0, length).split("");
  // Caixa "ativa" = próxima posição vazia (ou a última quando cheio).
  const activeIndex = Math.min(value.length, length - 1);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex justify-center gap-2" aria-hidden>
        {digits.map((d, i) => {
          const filled = d.trim() !== "";
          const active = i === activeIndex;
          const state = error ? "error" : active ? "active" : filled ? "filled" : "empty";
          return (
            <div key={i} className="otp-slot" data-state={state}>
              {d.trim()}
              {active && !filled && !error && <span className="otp-caret" />}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`[0-9]{${length}}`}
        maxLength={length}
        aria-label="Código de 6 dígitos"
        aria-invalid={error}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-center tracking-[999px]"
      />
    </div>
  );
}
