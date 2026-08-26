"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { VersionBadge } from "@v7m/ui";

export function HubHeader() {
  const { hub, logout } = useSession();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue text-white shadow-xs font-bold text-base">
              V7
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-brand-ink">Hub do Polo</span>
                <span className="rounded-md bg-brand-blue-bg px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue uppercase">
                  Coordenador
                </span>
                <VersionBadge />
              </div>
              <p className="text-xs text-brand-muted font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3 text-brand-blue" />
                <span id="hub-brand">{hub?.brand || "Polo"}</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-brand-bg px-3 py-1.5 text-xs text-brand-muted border border-brand-border">
            <ShieldCheck className="h-4 w-4 text-brand-green-dark" />
            <span>Painel do Polo</span>
          </div>

          <Button
            id="logout"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-brand-muted hover:text-brand-danger hover:bg-brand-danger-bg/50 gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
