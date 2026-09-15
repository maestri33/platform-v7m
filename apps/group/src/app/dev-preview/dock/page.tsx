"use client";

import * as React from "react";
import Link from "next/link";
import { FloatingDockDesktop, FloatingDockMobile, type FloatingDockItem } from "@v7m/ui";
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
  IconBrandGithub,
  IconBrandX,
  IconExchange,
  IconHome,
  IconNewSection,
  IconTerminal2,
} from "@tabler/icons-react";
import { ArrowLeft, Sparkles, Shield, Building2, UserCheck, LayoutGrid } from "lucide-react";

export default function DockPreviewPage() {
  const [selectedRole, setSelectedRole] = React.useState<"demo" | "admin" | "hub" | "promoter">("admin");
  const [activeTab, setActiveTab] = React.useState<string>("Visão Geral");

  // Links do Demo Oficial Aceternity UI
  const aceternityDemoItems: FloatingDockItem[] = [
    {
      title: "Home",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#home",
      active: activeTab === "Home",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Home");
      },
    },
    {
      title: "Products",
      icon: <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#products",
      active: activeTab === "Products",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Products");
      },
    },
    {
      title: "Components",
      icon: <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#components",
      active: activeTab === "Components",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Components");
      },
    },
    {
      title: "Aceternity UI",
      icon: (
        <span className="font-bold text-xs text-blue-500">
          UI
        </span>
      ),
      href: "#aceternity",
      active: activeTab === "Aceternity UI",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Aceternity UI");
      },
    },
    {
      title: "Changelog",
      icon: <IconExchange className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#changelog",
      active: activeTab === "Changelog",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Changelog");
      },
    },
    {
      title: "Twitter",
      icon: <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#twitter",
      active: activeTab === "Twitter",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Twitter");
      },
    },
    {
      title: "GitHub",
      icon: <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#github",
      active: activeTab === "GitHub",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("GitHub");
      },
    },
  ];

  // Itens configurados para a role Master Admin
  const adminItems: FloatingDockItem[] = [
    {
      title: "Visão Geral",
      icon: <IconDashboard className="h-full w-full text-slate-700 dark:text-neutral-200" />,
      href: "#visao-geral",
      active: activeTab === "Visão Geral",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Visão Geral");
      },
    },
    {
      title: "Financeiro",
      icon: <IconCash className="h-full w-full text-emerald-600 dark:text-emerald-400" />,
      href: "#financeiro",
      active: activeTab === "Financeiro",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Financeiro");
      },
    },
    {
      title: "Mesa Documentos",
      icon: <IconFileCheck className="h-full w-full text-blue-600 dark:text-blue-400" />,
      href: "#documentos",
      active: activeTab === "Mesa Documentos",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Mesa Documentos");
      },
    },
    {
      title: "Rede & Downline",
      icon: <IconBinaryTree className="h-full w-full text-indigo-600 dark:text-indigo-400" />,
      href: "#rede",
      active: activeTab === "Rede & Downline",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Rede & Downline");
      },
    },
    {
      title: "Polos Regionais",
      icon: <IconBuilding className="h-full w-full text-amber-600 dark:text-amber-400" />,
      href: "#polos",
      active: activeTab === "Polos Regionais",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Polos Regionais");
      },
    },
    {
      title: "Matrículas & Alunos",
      icon: <IconCertificate className="h-full w-full text-cyan-600 dark:text-cyan-400" />,
      href: "#matriculas",
      active: activeTab === "Matrículas & Alunos",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Matrículas & Alunos");
      },
    },
    {
      title: "Notificações",
      icon: <IconBell className="h-full w-full text-rose-500 dark:text-rose-400" />,
      href: "#notificacoes",
      active: activeTab === "Notificações",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Notificações");
      },
    },
    {
      title: "Configurações",
      icon: <IconSettings className="h-full w-full text-slate-600 dark:text-slate-300" />,
      href: "#configuracoes",
      active: activeTab === "Configurações",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Configurações");
      },
    },
  ];

  // Itens configurados para a role Coordenador do Polo (Hub)
  const hubItems: FloatingDockItem[] = [
    {
      title: "Visão do Polo",
      icon: <IconBuilding className="h-full w-full text-sky-500 dark:text-sky-400" />,
      href: "#hub-inicio",
      active: activeTab === "Visão do Polo",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Visão do Polo");
      },
    },
    {
      title: "Candidatos a Promotor",
      icon: <IconUsers className="h-full w-full text-violet-600 dark:text-violet-400" />,
      href: "#candidatos",
      active: activeTab === "Candidatos a Promotor",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Candidatos a Promotor");
      },
    },
    {
      title: "Equipe do Polo",
      icon: <IconUserCheck className="h-full w-full text-emerald-600 dark:text-emerald-400" />,
      href: "#equipe",
      active: activeTab === "Equipe do Polo",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Equipe do Polo");
      },
    },
    {
      title: "Matrículas do Polo",
      icon: <IconCertificate className="h-full w-full text-blue-600 dark:text-blue-400" />,
      href: "#matriculas-polo",
      active: activeTab === "Matrículas do Polo",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Matrículas do Polo");
      },
    },
    {
      title: "Alunos do Polo",
      icon: <IconSchool className="h-full w-full text-indigo-600 dark:text-indigo-400" />,
      href: "#alunos-polo",
      active: activeTab === "Alunos do Polo",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Alunos do Polo");
      },
    },
    {
      title: "Alertas & Inbox",
      icon: <IconInbox className="h-full w-full text-rose-500 dark:text-rose-400" />,
      href: "#inbox",
      active: activeTab === "Alertas & Inbox",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Alertas & Inbox");
      },
    },
  ];

  // Itens configurados para a role Promotor de Vendas
  const promoterItems: FloatingDockItem[] = [
    {
      title: "Minhas Vendas",
      icon: <IconRocket className="h-full w-full text-orange-500 dark:text-orange-400" />,
      href: "#vendas",
      active: activeTab === "Minhas Vendas",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Minhas Vendas");
      },
    },
    {
      title: "Meus Leads",
      icon: <IconUsers className="h-full w-full text-blue-600 dark:text-blue-400" />,
      href: "#leads",
      active: activeTab === "Meus Leads",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Meus Leads");
      },
    },
    {
      title: "Comissões & PIX",
      icon: <IconWallet className="h-full w-full text-emerald-600 dark:text-emerald-400" />,
      href: "#comissoes",
      active: activeTab === "Comissões & PIX",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Comissões & PIX");
      },
    },
    {
      title: "Capacitação & LMS",
      icon: <IconBook className="h-full w-full text-amber-500 dark:text-amber-400" />,
      href: "#treino",
      active: activeTab === "Capacitação & LMS",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Capacitação & LMS");
      },
    },
    {
      title: "Ativação & KYC",
      icon: <IconShieldCheck className="h-full w-full text-cyan-600 dark:text-cyan-400" />,
      href: "#kyc",
      active: activeTab === "Ativação & KYC",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Ativação & KYC");
      },
    },
    {
      title: "Minha Conta",
      icon: <IconUser className="h-full w-full text-slate-600 dark:text-slate-300" />,
      href: "#conta",
      active: activeTab === "Minha Conta",
      onClick: (e) => {
        e.preventDefault();
        setActiveTab("Minha Conta");
      },
    },
  ];

  const currentItems =
    selectedRole === "demo"
      ? aceternityDemoItems
      : selectedRole === "admin"
      ? adminItems
      : selectedRole === "hub"
      ? hubItems
      : promoterItems;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center pb-36">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          Aceternity Floating Dock @v7m/ui
        </span>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Floating Dock Oficial (Aceternity UI)
        </h1>
        <p className="text-slate-400 text-sm">
          Passe o mouse sobre os ícones no rodapé para ver a física tátil inercial (ampliação 40px → 80px),
          tooltips e transições. Alterne entre o Demo padrão e as roles do V7M abaixo.
        </p>
      </div>

      {/* Role Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 mb-10 shadow-lg">
        <button
          type="button"
          onClick={() => {
            setSelectedRole("demo");
            setActiveTab("Home");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedRole === "demo"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Demo Original Aceternity
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole("admin");
            setActiveTab("Visão Geral");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedRole === "admin"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Master Admin
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole("hub");
            setActiveTab("Visão do Polo");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedRole === "hub"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Coordenador do Polo (Hub)
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole("promoter");
            setActiveTab("Minhas Vendas");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedRole === "promoter"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Promotor de Vendas
        </button>
      </div>

      {/* Context Card Display */}
      <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue mb-4 border border-brand-blue/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Ambiente Ativo:{" "}
          <span className="text-brand-blue capitalize">{selectedRole}</span>
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Seção selecionada no Dock:{" "}
          <span className="font-semibold text-emerald-400">{activeTab}</span>
        </p>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left text-xs font-mono text-slate-300">
          <div className="text-slate-500 mb-1">// Propriedades da Role</div>
          <div>role: &quot;{selectedRole}&quot;</div>
          <div>total_itens_dock: {currentItems.length}</div>
          <div>item_ativo: &quot;{activeTab}&quot;</div>
          <div>posicionamento: &quot;fixed bottom-6 inset-x-0 z-50&quot;</div>
        </div>
      </div>

      {/* The Actual Floating Dock fixed at bottom */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 hidden justify-center md:flex">
        <FloatingDockDesktop
          items={currentItems}
          className="pointer-events-auto shadow-2xl backdrop-blur-md"
        />
      </div>
      <div className="fixed right-4 bottom-6 z-50 md:hidden">
        <FloatingDockMobile items={currentItems} />
      </div>
    </div>
  );
}
