"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, type PortalContext } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Crown, Building2, Rocket, Check } from "lucide-react";

interface ContextConfig {
  id: PortalContext;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultRoute: string;
  badgeColor: string;
}

const CONTEXT_CONFIGS: Record<PortalContext, ContextConfig> = {
  admin: {
    id: "admin",
    label: "Administração Master",
    shortLabel: "Admin Master",
    description: "Governança global, financeiro consolidado e configurações.",
    icon: Crown,
    defaultRoute: "/admin",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  hub: {
    id: "hub",
    label: "Liderança Regional",
    shortLabel: "Polo Regional",
    description: "Gestão de candidatos, equipe e matrículas do polo.",
    icon: Building2,
    defaultRoute: "/hub",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  promoter: {
    id: "promoter",
    label: "Portal do Promotor",
    shortLabel: "Promotor",
    description: "Links de afiliado, extrato de comissões e treinamento.",
    icon: Rocket,
    defaultRoute: "/promoter",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
};

export function ContextSwitcher() {
  const router = useRouter();
  const { activeContext, setActiveContext, availableContexts } = useAuth();

  const current = CONTEXT_CONFIGS[activeContext] || CONTEXT_CONFIGS.promoter;
  const CurrentIcon = current.icon;

  const handleSelectContext = (ctx: PortalContext) => {
    setActiveContext(ctx);
    const targetRoute = CONTEXT_CONFIGS[ctx].defaultRoute;
    router.push(targetRoute);
  };

  // Se tiver apenas 1 contexto disponível, exibe apenas a pílula de identidade
  if (availableContexts.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-white/70 px-3 py-2 text-xs font-semibold text-brand-ink shadow-2xs">
        <CurrentIcon className="size-4 text-brand-blue" />
        <span>{current.label}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="context-switcher-trigger"
        aria-label="Alternar contexto"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-brand-border/80 bg-white px-3 py-2.5 text-left text-xs font-semibold text-brand-ink shadow-2xs transition hover:border-brand-blue/50 hover:bg-brand-blue-bg/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`flex size-6 shrink-0 items-center justify-center rounded-lg border ${current.badgeColor}`}>
            <CurrentIcon className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1 truncate">
            <span className="block text-[11px] font-medium text-brand-muted">Contexto Ativo</span>
            <span className="block truncate font-bold text-brand-ink">{current.label}</span>
          </div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-brand-muted" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold tracking-wider text-brand-muted uppercase">
          Alternar Visão do Portal
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableContexts.map((ctxId) => {
          const config = CONTEXT_CONFIGS[ctxId];
          const Icon = config.icon;
          const isSelected = activeContext === ctxId;

          return (
            <DropdownMenuItem
              key={ctxId}
              onClick={() => handleSelectContext(ctxId)}
              className={`flex items-start gap-2.5 rounded-lg p-2 text-xs cursor-pointer transition ${
                isSelected ? "bg-brand-blue/10 text-brand-blue font-bold" : "text-brand-ink hover:bg-slate-50"
              }`}
            >
              <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border ${config.badgeColor}`}>
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13px]">{config.label}</span>
                  {isSelected && <Check className="size-3.5 text-brand-blue" />}
                </div>
                <p className="text-[11px] leading-tight text-brand-muted line-clamp-2 mt-0.5">
                  {config.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
