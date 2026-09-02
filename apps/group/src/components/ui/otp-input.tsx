"use client";

import { useRef } from "react";

import styles from "./otp-input.module.css";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Código em N caixas — modelo POSICIONAL (robusto a digitação rápida e autofill):
 * cada caixa guarda 1 dígito e o foco anda pro próximo ao preencher. A 1ª caixa
 * (autocomplete one-time-code) aceita o código inteiro do SMS; colar distribui a
 * partir da caixa. Sem acúmulo/duplicação porque nada é "anexado" ao valor.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  invalid = false,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(i: number) {
    refs.current[Math.max(0, Math.min(i, length - 1))]?.focus();
  }

  /** Distribui vários dígitos (colar / autofill) a partir da caixa `from`. */
  function distribute(from: number, raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return;
    const next = (value.slice(0, from) + digits).replace(/\D+/g, "").slice(0, length);
    onChange(next);
    focusAt(next.length);
  }

  function handleChange(i: number, raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (digits.length > 1) {
      distribute(i, digits);
      return;
    }
    const arr = value.padEnd(length).split("");
    arr[i] = digits; // "" quando a caixa é limpa
    const next = arr.join("").replace(/\s+/g, "");
    onChange(next);
    if (digits && i < length - 1) focusAt(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.padEnd(length).split("");
      if (arr[i]?.trim()) {
        arr[i] = "";
        onChange(arr.join("").replace(/\s+/g, ""));
      } else if (i > 0) {
        arr[i - 1] = "";
        onChange(arr.join("").replace(/\s+/g, ""));
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  }

  function handlePaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    distribute(i, e.clipboardData.getData("text"));
  }

  return (
    <div
      role="group"
      aria-label={`Código de verificação de ${length} dígitos`}
      className="flex gap-2"
    >
      {Array.from({ length }, (_, i) => {
        const filled = !!value[i];
        const active = i === value.length && !disabled;
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? length : 1}
            aria-label={`Dígito ${i + 1}`}
            disabled={disabled}
            value={value[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            className={`h-16 w-full min-w-0 rounded-2xl border-2 bg-white/60 text-center text-2xl font-extrabold text-brand-ink outline-none backdrop-blur-md transition focus:border-brand-blue-bright focus:ring-4 focus:ring-brand-blue-bright/25 disabled:bg-brand-bg ${active ? styles.activePulse : ""} ${filled ? styles.pop : ""} ${
              invalid
                ? "border-brand-danger"
                : filled
                  ? "border-brand-green-dark bg-brand-green-bg/70"
                  : active
                    ? "border-brand-blue-bright ring-4 ring-brand-blue-bright/20"
                    : "border-brand-border"
            }`}
          />
        );
      })}
    </div>
  );
}
