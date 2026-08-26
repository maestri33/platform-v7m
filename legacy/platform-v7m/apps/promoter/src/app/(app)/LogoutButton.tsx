"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={
        className ??
        "text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      }
    >
      {loading ? "Saindo…" : "Sair do app"}
    </button>
  );
}
