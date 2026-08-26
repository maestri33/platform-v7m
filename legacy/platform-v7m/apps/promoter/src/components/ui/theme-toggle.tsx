"use client";

import { useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("v7m-theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function resolveSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(t: Theme) {
  const r = t === "system" ? resolveSystem() : t;
  document.documentElement.dataset.theme = r;
  // data-theme-choice preserva a ESCOLHA do usuário (light/dark/system) pra
  // o ThemeToggle renderizar o ícone certo; data-theme é o tema RESOLVIDO.
  document.documentElement.dataset.themeChoice = t;
}

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABEL: Record<Theme, string> = {
  light: "Tema: claro (clique para escuro)",
  dark: "Tema: escuro (clique para seguir o sistema)",
  system: "Tema: seguindo o sistema (clique para claro)",
};

/** Toggle de tema: sol/lua/monitor, 3 ciclos (light→dark→system), localStorage. */
export function ThemeToggle() {
  // ponytail: lê localStorage no initializer, sem effect — evita cascading render
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  const cycle = () => {
    setTheme((prev) => {
      const next = NEXT[prev];
      localStorage.setItem("v7m-theme", next);
      applyTheme(next);
      return next;
    });
  };

  return (
    <button
      onClick={cycle}
      className="inline-flex items-center justify-center p-2 rounded-full
        text-surface-text-muted hover:text-surface-text
        hover:bg-[var(--surface-border)] transition-colors duration-200
        min-w-[44px] min-h-[44px]
        outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]
        focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
    >
      <span className="theme-icon theme-icon-sun">
        <Sun aria-hidden className="w-5 h-5" />
      </span>
      <span className="theme-icon theme-icon-moon">
        <Moon aria-hidden className="w-5 h-5" />
      </span>
      <span className="theme-icon theme-icon-monitor">
        <Monitor aria-hidden className="w-5 h-5" />
      </span>
    </button>
  );
}
