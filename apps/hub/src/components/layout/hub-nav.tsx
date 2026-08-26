"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  GraduationCap,
  Users,
  UserCheck,
  Award,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function HubNav() {
  const pathname = usePathname();

  const navItems = [
    {
      id: "nav-home",
      href: "/",
      label: "Visão geral",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      id: "nav-inbox",
      href: "/inbox",
      label: "Revisões",
      icon: Inbox,
      active: pathname.startsWith("/inbox"),
    },
    {
      id: "nav-matriculas",
      href: "/matriculas",
      label: "Matrículas",
      icon: GraduationCap,
      active: pathname.startsWith("/matriculas"),
    },
    {
      id: "nav-alunos",
      href: "/alunos",
      label: "Alunos",
      icon: Users,
      active: pathname.startsWith("/alunos"),
    },
    {
      id: "nav-candidatos",
      href: "/candidatos",
      label: "Candidatos",
      icon: UserCheck,
      active: pathname.startsWith("/candidatos"),
    },
    {
      id: "nav-equipe",
      href: "/equipe",
      label: "Equipe",
      icon: Award,
      active: pathname.startsWith("/equipe"),
    },
    {
      id: "nav-leads",
      href: "/leads",
      label: "Leads",
      icon: Target,
      active: pathname.startsWith("/leads"),
    },
  ];

  return (
    <nav className="border-b border-brand-border bg-white px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              id={item.id}
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap select-none",
                item.active
                  ? "bg-brand-blue text-white shadow-xs"
                  : "text-brand-muted hover:bg-brand-bg hover:text-brand-ink",
              )}
            >
              <Icon className={cn("h-4 w-4", item.active ? "text-white" : "text-brand-muted")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
