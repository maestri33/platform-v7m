"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

/**
 * Lê o `data-theme-choice` direto do `<html>` via useSyncExternalStore.
 * SSR-safe: server retorna `"system"` (default), client lê o DOM real
 * (setado pelo anti-FOUC antes do primeiro paint). Sem `useState`/`useEffect`
 * cascateando — é a forma idiomática em React 19 pra ler state externo
 * (DOM, localStorage, etc.).
 */
function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const html = document.documentElement;
  // Atributo muda via ThemeToggle/apply() — MutationObserver cobre.
  const obs = new MutationObserver(cb);
  obs.observe(html, { attributes: true, attributeFilter: ["data-theme-choice"] });
  return () => obs.disconnect();
}

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "system";
  return (document.documentElement.dataset.themeChoice as Theme) ?? "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

/**
 * Painel flutuante de tema pro dev-preview. Igual à API do `ThemeToggle` do
 * header: persiste em localStorage + espelha no `<html data-theme>` e
 * `data-theme-choice>`. Esconde no `auth` (sem AppShell, fica solto sobre o
 * fundo da auth e o usuário não precisa dele).
 */
export function DevThemeControl({ hidden = false }: { hidden?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function apply(next: Theme) {
    if (typeof window === "undefined") return;
    localStorage.setItem("v7m-theme", next);
    const r =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    document.documentElement.dataset.theme = r;
    document.documentElement.dataset.themeChoice = next;
  }

  if (hidden) return null;

  return (
    <div
      role="group"
      aria-label="Tema do preview"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-[var(--surface-border)] bg-[var(--surface)]/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur"
    >
      <DevThemeButton
        active={theme === "light"}
        onClick={() => apply("light")}
        label="Tema claro"
        icon={<Sun className="size-4" aria-hidden />}
      />
      <DevThemeButton
        active={theme === "dark"}
        onClick={() => apply("dark")}
        label="Tema escuro"
        icon={<Moon className="size-4" aria-hidden />}
      />
      <DevThemeButton
        active={theme === "system"}
        onClick={() => apply("system")}
        label="Seguir sistema"
        icon={<Monitor className="size-4" aria-hidden />}
      />
    </div>
  );
}

function DevThemeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={
        "grid h-8 w-8 place-items-center rounded-full transition-colors " +
        (active
          ? "bg-brand-gold text-[var(--black)] shadow-sm"
          : "text-[var(--surface-text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--surface-text)]")
      }
    >
      {icon}
    </button>
  );
}
