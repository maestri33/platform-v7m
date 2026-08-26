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

/**
 * Botão "copiar" para o link de captação do promotor. Feedback inline.
 *
 * Se `share` for informado e o Web Share API estiver disponível (mobile, quase
 * sempre), abre a folha de compartilhamento nativa — o caminho de 1 toque p/
 * mandar o link direto no WhatsApp, em vez de copiar+colar. Cai p/ cópia se o
 * API não existir ou o usuário cancelar.
 */
export function CopyButton({
  value,
  label = "Copiar",
  share,
  className = "",
}: {
  value: string;
  label?: string;
  /** Se informado e navigator.share existir, compartilha em vez de copiar. */
  share?: { title?: string; text?: string };
  className?: string;
}) {
  const [status, setStatus] = useState<{ kind: "ok" | "fail"; msg: string } | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const useShare = !!share && canShare;

  function flash(kind: "ok" | "fail", msg: string) {
    setStatus({ kind, msg });
    setTimeout(() => setStatus(null), kind === "ok" ? 2000 : 4000);
  }

  async function action() {
    if (useShare) {
      try {
        await navigator.share({
          title: share?.title,
          text: share?.text ?? value,
          url: value,
        });
        flash("ok", "Compartilhado!");
        return;
      } catch {
        // usuário cancelou (AbortError) ou falhou → cai pra cópia.
      }
    }
    try {
      await navigator.clipboard.writeText(value);
      flash("ok", "Copiado!");
      return;
    } catch {
      // clipboard indisponível (sem HTTPS / permissão negada) → fallback legado.
    }
    const legacyOk = legacyCopy(value);
    flash(legacyOk ? "ok" : "fail", legacyOk ? "Copiado!" : "Selecione e copie");
  }

  const shownLabel = useShare ? "Compartilhar" : label;

  return (
    <button
      type="button"
      onClick={action}
      aria-live="polite"
      className={`inline-flex items-center min-h-[44px] px-2 text-xs font-semibold text-brand-gold-ink underline cursor-pointer hover:text-brand-gold-deep-ink whitespace-nowrap rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${className}`.trim()}
    >
      {status ? status.msg : shownLabel}
    </button>
  );
}
