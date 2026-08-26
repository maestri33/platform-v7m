"use client";

import { useState } from "react";

/** Copia sem depender de HTTPS (fallback p/ contexto inseguro / Safari antigo). */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Botão "copiar" para o link de captação do promotor. Feedback inline. */
export function CopyButton({
  value,
  label = "Copiar",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");

  function flash(next: "ok" | "fail") {
    setState(next);
    setTimeout(() => setState("idle"), next === "ok" ? 2000 : 4000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      flash("ok");
      return;
    } catch {
      // clipboard indisponível (sem HTTPS / permissão negada) → fallback legado.
    }
    flash(legacyCopy(value) ? "ok" : "fail");
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`inline-flex items-center min-h-[44px] px-2 text-xs font-semibold text-brand-gold-ink underline cursor-pointer hover:text-brand-gold-dark whitespace-nowrap ${className}`.trim()}
    >
      {state === "ok" ? "Copiado!" : state === "fail" ? "Selecione e copie" : label}
    </button>
  );
}
