"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, type PortalContext } from "@/lib/auth-context";
import { AceternityTabs, type Tab } from "@v7m/ui";
import { Crown, Building2, Rocket } from "lucide-react";

const CONTEXT_META: Record<PortalContext, { label: string; icon: React.ReactNode; route: string }> = {
  admin: { label: "Admin Master", icon: <Crown className="size-3.5" />, route: "/admin" },
  hub: { label: "Polo Regional", icon: <Building2 className="size-3.5" />, route: "/hub" },
  promoter: { label: "Promotor", icon: <Rocket className="size-3.5" />, route: "/promoter" },
};

export function ContextSwitcher() {
  const router = useRouter();
  const { activeContext, setActiveContext, availableContexts } = useAuth();

  if (availableContexts.length <= 1) {
    const meta = CONTEXT_META[activeContext] || CONTEXT_META.promoter;
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-white/70 px-3 py-2 text-xs font-semibold text-brand-ink shadow-2xs">
        {meta.icon}
        <span>{meta.label}</span>
      </div>
    );
  }

  const tabs: Tab[] = availableContexts.map((ctx) => ({
    value: ctx,
    title: CONTEXT_META[ctx].label,
    icon: CONTEXT_META[ctx].icon,
  }));

  const handleChange = (tab: Tab) => {
    const ctx = tab.value as PortalContext;
    setActiveContext(ctx);
    router.push(CONTEXT_META[ctx].route);
  };

  return (
    <AceternityTabs
      tabs={tabs}
      onChange={handleChange}
    />
  );
}
