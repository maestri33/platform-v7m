"use client";

import { useRef, type KeyboardEvent } from "react";
import styles from "./cpf-input-boxes.module.css";

export interface CpfInputBoxesProps {
  /** Valor numérico ou string do CPF (até 11 dígitos). */
  value: string;
  /** Callback acionado ao alterar os dígitos. */
  onChange: (next: string) => void;
  /** Se o componente está desabilitado. */
  disabled?: boolean;
  /** Classes adicionais para o container externo. */
  className?: string;
}

/**
 * CPF em caixas posicionais 3·3·3-2 (irmão do OtpInput) — @v7m/ui.
 * Separadores "." após as caixas 3 e 6 e "-" após a 9. Colar/autofill distribui
 * automaticamente a partir da caixa ativa. Suporta navegação por setas e backspace inteligente.
 */
export function CpfInputBoxes({
  value,
  onChange,
  disabled = false,
  className = "",
}: CpfInputBoxesProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const LENGTH = 11;

  function focusAt(i: number) {
    refs.current[Math.max(0, Math.min(i, LENGTH - 1))]?.focus();
  }

  function distribute(from: number, raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return;
    const next = (value.slice(0, from) + digits).replace(/\D+/g, "").slice(0, LENGTH);
    onChange(next);
    focusAt(next.length);
  }

  function handleChange(i: number, raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (digits.length > 1) {
      distribute(i, digits);
      return;
    }
    const arr = value.padEnd(LENGTH).split("");
    arr[i] = digits;
    const next = arr.join("").replace(/\s+/g, "");
    onChange(next);
    if (digits && i < LENGTH - 1) focusAt(i + 1);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.padEnd(LENGTH).split("");
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

  return (
    <div
      role="group"
      aria-label="CPF, 11 dígitos"
      className={`flex w-full items-center justify-center gap-1 rounded-[18px] border border-brand-blue/15 bg-brand-blue/5 px-3 py-4 ${className}`}
    >
      {Array.from({ length: LENGTH }, (_, i) => {
        const filled = !!value[i];
        const active = i === value.length && !disabled;
        return (
          <span key={i} className="contents">
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={i === 0 ? LENGTH : 1}
              aria-label={`Dígito ${i + 1} do CPF`}
              disabled={disabled}
              value={value[i] ?? ""}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => {
                e.preventDefault();
                distribute(i, e.clipboardData.getData("text"));
              }}
              className={`${active ? styles.activePulse : ""} h-12 min-w-0 flex-1 rounded-[10px] border-2 p-0 text-center text-lg font-extrabold text-brand-ink outline-none transition ${
                filled
                  ? "border-brand-green-dark bg-brand-green-bg/70"
                  : active
                    ? "border-brand-blue-bright bg-white/60"
                    : "border-brand-border bg-white/60"
              }`}
            />
            {(i === 2 || i === 5) && (
              <span aria-hidden className="shrink-0 px-px text-lg font-extrabold text-brand-muted">
                .
              </span>
            )}
            {i === 8 && (
              <span aria-hidden className="shrink-0 px-px text-lg font-extrabold text-brand-muted">
                -
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
