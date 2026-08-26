"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";

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
}

/** Toggle de tema: sol/lua, 3 ciclos (light→dark→system), localStorage. */
export function ThemeToggle() {
  // ponytail: lê localStorage no initializer, sem effect — evita cascading render
  const [, setTheme] = useState<Theme>(readStoredTheme);

  const cycle = () => {
    setTheme((prev) => {
      const next: Theme =
        prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
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
        min-w-[44px] min-h-[44px]"
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      <span className="theme-icon theme-icon-moon"><Moon aria-hidden className="w-5 h-5" /></span>
      <span className="theme-icon theme-icon-sun"><Sun aria-hidden className="w-5 h-5" /></span>
    </button>
  );
}
