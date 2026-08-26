"use client";

import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type Tone = "light" | "dark";

function toneCls(base: string, tone: Tone, darkSuffix = "-dark") {
  return tone === "dark" ? `${base} ${base}${darkSuffix}` : base;
}

function RequiredMark({ tone }: { tone: Tone }) {
  return (
    <span aria-hidden className={tone === "dark" ? "text-brand-gold-light" : "text-brand-gold-ink"}>
      {" *"}
    </span>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tone?: Tone;
  hint?: string;
  className?: string;
  /** Classe extra aplicada ao <input> (ex.: OTP centralizado). */
  inputClassName?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "className" | "id"
>;

/** Campo de texto rotulado. Tom `light` (padrão, telas /app) ou `dark` (auth). */
export function Field({
  label,
  value,
  onChange,
  tone = "light",
  hint,
  className = "",
  inputClassName = "",
  required,
  ...rest
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={tone === "dark" ? "label label-dark" : "label"}>
        {label}
        {required && <RequiredMark tone={tone} />}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-describedby={hintId}
        className={`${toneCls("input", tone)} ${inputClassName}`.trim()}
        {...rest}
      />
      {hint && (
        <p id={hintId} className={toneCls("field-hint", tone)}>
          {hint}
        </p>
      )}
    </div>
  );
}

type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<Option>;
  tone?: Tone;
  hint?: string;
  className?: string;
} & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "className" | "id"
>;

export function SelectField({
  label,
  value,
  onChange,
  options,
  tone = "light",
  hint,
  className = "",
  required,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={tone === "dark" ? "label label-dark" : "label"}>
        {label}
        {required && <RequiredMark tone={tone} />}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-describedby={hintId}
        className={toneCls("input", tone)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value || "none"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className={toneCls("field-hint", tone)}>
          {hint}
        </p>
      )}
    </div>
  );
}

type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tone?: Tone;
  hint?: string;
  className?: string;
} & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "className" | "id"
>;

export function TextareaField({
  label,
  value,
  onChange,
  tone = "light",
  hint,
  className = "",
  required,
  ...rest
}: TextareaFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={tone === "dark" ? "label label-dark" : "label"}>
        {label}
        {required && <RequiredMark tone={tone} />}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-describedby={hintId}
        className={toneCls("input", tone)}
        {...rest}
      />
      {hint && (
        <p id={hintId} className={toneCls("field-hint", tone)}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Campo somente-leitura (dado vindo do CPFHub/ViaCEP). */
export function ReadOnlyField({
  label,
  value,
  tone = "light",
  hint,
  className = "",
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className={tone === "dark" ? "label label-dark" : "label"}>{label}</span>
      <div className={`input-readonly ${tone === "dark" ? "input-dark" : ""}`.trim()}>
        {value || "—"}
      </div>
      {hint && <p className={toneCls("field-hint", tone)}>{hint}</p>}
    </div>
  );
}

/** Erro de formulário (anunciado por leitores de tela via role=alert). */
export function FieldError({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  if (!children) return null;
  return (
    <p role="alert" className={toneCls("field-error", tone)}>
      {children}
    </p>
  );
}
