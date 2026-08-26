import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type Props = {
  tone?: "light" | "dark";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

/** Input de arquivo estilizado (selfie/documento). Botão dourado nativo. */
export const FileInput = forwardRef<HTMLInputElement, Props>(function FileInput(
  { tone = "light", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="file"
      className={`file-input ${tone === "dark" ? "file-input-dark" : ""}`.trim()}
      {...rest}
    />
  );
});
