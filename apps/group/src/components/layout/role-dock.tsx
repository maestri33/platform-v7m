"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FloatingDock, FloatingDockItem } from "@v7m/ui";
import {
  IconDashboard,
  IconCash,
  IconFileCheck,
  IconBinaryTree,
  IconBuilding,
  IconUserCheck,
  IconSchool,
  IconCertificate,
  IconUsers,
  IconSettings,
  IconBell,
  IconRocket,
  IconWallet,
  IconBook,
  IconShieldCheck,
  IconUser,
  IconInbox,
} from "@tabler/icons-react";

export function RoleDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeContext } = useAuth();

  // Detecta se estamos num caminho administrativo geral
  const isMasterPath =
    pathname === "/dashboard" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/financeiro") ||
    pathname.startsWith("/documentos") ||
    pathname.startsWith("/rede") ||
    pathname.startsWith("/polos") ||
    pathname.startsWith("/coordenadores") ||
    pathname.startsWith("/treino") ||
    pathname.startsWith("/matriculas") ||
    pathname.startsWith("/alunos") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/usuarios") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/integracoes") ||
    pathname.startsWith("/notificacoes");

  const isHubPath = pathname.startsWith("/hub");
  const isPromoterPath =
    pathname.startsWith("/promoter") ||
    pathname.startsWith("/vendas") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/conta");

  const navigate = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };

  // Itens configurados para a role Admin
  const adminItems: FloatingDockItem[] = useMemo(
    () => [
      {
        title: "Visão Geral",
        icon: <IconDashboard className="h-full w-full text-slate-700 dark:text-neutral-200" />,
        href: "/dashboard",
        active: pathname === "/dashboard",
        onClick: navigate("/dashboard"),
      },
      {
        title: "Financeiro",
        icon: <IconCash className="h-full w-full text-emerald-600 dark:text-emerald-400" />,
        href: "/financeiro",
        active: pathname.startsWith("/financeiro"),
        onClick: navigate("/financeiro"),
      },
      {
        title: "Mesa Documentos",
        icon: <IconFileCheck className="h-full w-full text-blue-600 dark:text-blue-400" />,
        href: "/documentos",
        active: pathname.startsWith("/documentos"),
        onClick: navigate("/documentos"),
      },
      {
        title: "Rede & Downline",
        icon: <IconBinaryTree className="h-full w-full text-indigo-600 dark:text-indigo-400" />,
        href: "/rede",
        active: pathname.startsWith("/rede"),
        onClick: navigate("/rede"),
      },
      {
        title: "Polos Regionais",
        icon: <IconBuilding className="h-full w-full text-amber-600 dark:text-amber-400" />,
        href: "/polos",
        active: pathname.startsWith("/polos"),
        onClick: navigate("/polos"),
      },
      {
        title: "Coordenadores",
        icon: <IconUserCheck className="h-full w-full text-teal-600 dark:text-teal-400" />,
        href: "/coordenadores",
        active: pathname.startsWith("/coordenadores"),
        onClick: navigate("/coordenadores"),
      },
      {
        title: "Matrículas & Alunos",
        icon: <IconCertificate className="h-full w-full text-cyan-600 dark:text-cyan-400" />,
        href: "/matriculas",
        active: pathname.startsWith("/matriculas") || pathname.startsWith("/alunos"),
        onClick: navigate("/matriculas"),
      },
      {
        title: "Notificações & Avisos",
        icon: <IconBell className="h-full w-full text-rose-500 dark:text-rose-400" />,
        href: "/notificacoes",
        active: pathname.startsWith("/notificacoes"),
        onClick: navigate("/notificacoes"),
      },
      {
        title: "Configurações",
        icon: <IconSettings className="h-full w-full text-slate-600 dark:text-slate-300" />,
        href: "/configuracoes",
        active: pathname.startsWith("/configuracoes") || pathname.startsWith("/integracoes"),
        onClick: navigate("/configuracoes"),
      },
    ],
    [pathname]
  );

  // Itens configurados para a role Hub / Polo
  const hubItems: FloatingDockItem[] = useMemo(
    () => [
      {
        title: "Visão do Polo",
        icon: <IconBuilding className="h-full w-full text-brand-blue dark:text-sky-400" />,
        href: "/hub",
        active: pathname === "/hub",
        onClick: navigate("/hub"),
      },
      {
        title: "Candidatos a Promotor",
        icon: <IconUsers className="h-full w-full text-violet-600 dark:text-violet-400" />,
        href: "/hub/candidatos",
        active: pathname.startsWith("/hub/candidatos"),
        onClick: navigate("/hub/candidatos"),
      },
      {
        title: "Equipe do Polo",
        icon: <IconUserCheck className="h-full w-full text-emerald-600 dark:text-emerald-400" />,
        href: "/hub/equipe",
        active: pathname.startsWith("/hub/equipe"),
        onClick: navigate("/hub/equipe"),
      },
      {
        title: "Matrículas do Polo",
        icon: <IconCertificate className="h-full w-full text-blue-600 dark:text-blue-400" />,
        href: "/hub/matriculas",
        active: pathname.startsWith("/hub/matriculas"),
        onClick: navigate("/hub/matriculas"),
      },
      {
        title: "Alunos do Polo",
        icon: <IconSchool className="h-full w-full text-indigo-600 dark:text-indigo-400" />,
        href: "/hub/alunos",
        active: pathname.startsWith("/hub/alunos"),
        onClick: navigate("/hub/alunos"),
      },
      {
        title: "Alertas & Inbox",
        icon: <IconInbox className="h-full w-full text-rose-500 dark:text-rose-400" />,
        href: "/hub/inbox",
        active: pathname.startsWith("/hub/inbox"),
        onClick: navigate("/hub/inbox"),
      },
    ],
    [pathname]
  );

  // Itens configurados para a role Promoter
  const promoterItems: FloatingDockItem[] = useMemo(
    () => [
      {
        title: "Minhas Vendas",
        icon: <IconRocket className="h-full w-full text-orange-500 dark:text-orange-400" />,
        href: "/promoter",
        active: pathname === "/promoter",
        onClick: navigate("/promoter"),
      },
      {
        title: "Meus Leads",
        icon: <IconUsers className="h-full w-full text-blue-600 dark:text-blue-400" />,
        href: "/promoter/leads",
        active: pathname.startsWith("/promoter/leads"),
        onClick: navigate("/promoter/leads"),
      },
      {
        title: "Comissões & PIX",
        icon: <IconWallet className="h-full w-full text-emerald-600 dark:text-emerald-400" />,
        href: "/promoter/comissoes",
        active: pathname.startsWith("/promoter/comissoes"),
        onClick: navigate("/promoter/comissoes"),
      },
      {
        title: "Capacitação & LMS",
        icon: <IconBook className="h-full w-full text-amber-500 dark:text-amber-400" />,
        href: "/promoter/treino",
        active: pathname.startsWith("/promoter/treino"),
        onClick: navigate("/promoter/treino"),
      },
      {
        title: "Ativação & KYC",
        icon: <IconShieldCheck className="h-full w-full text-cyan-600 dark:text-cyan-400" />,
        href: "/onboarding",
        active: pathname.startsWith("/onboarding"),
        onClick: navigate("/onboarding"),
      },
      {
        title: "Minha Conta",
        icon: <IconUser className="h-full w-full text-slate-600 dark:text-slate-300" />,
        href: "/conta",
        active: pathname.startsWith("/conta"),
        onClick: navigate("/conta"),
      },
    ],
    [pathname]
  );

  let activeItems = adminItems;
  if (isHubPath || activeContext === "hub") {
    activeItems = hubItems;
  } else if (isPromoterPath || activeContext === "promoter") {
    activeItems = promoterItems;
  } else if (isMasterPath || activeContext === "admin") {
    activeItems = adminItems;
  }

  return (
    <FloatingDock
      items={activeItems}
      className="pb-safe"
      desktopClassName="border border-slate-200/90 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/90"
      mobileClassName="mb-1"
    />
  );
}
