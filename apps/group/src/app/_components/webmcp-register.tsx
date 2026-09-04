"use client";

import { useEffect } from "react";

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: Record<string, unknown>;
          execute: (input?: Record<string, unknown>) => Promise<unknown>;
          annotations?: Record<string, unknown>;
        },
        options?: { signal?: AbortSignal }
      ) => Promise<void> | void;
    };
  }
}

export function WebMcpRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if (!("modelContext" in navigator) || !navigator.modelContext || typeof navigator.modelContext.registerTool !== "function") {
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const tools = [
      {
        name: "get_portal_overview",
        description: "Retorna a estrutura funcional dos módulos do Portal V7M (Promotores, Coordenação de Polos e Administração Geral).",
        inputSchema: {
          type: "object",
          properties: {
            scope: {
              type: "string",
              enum: ["promoter", "hub", "admin"],
              default: "promoter",
              description: "Escopo de acesso do portal"
            }
          }
        },
        annotations: { readOnlyHint: true },
        execute: async (input?: { scope?: string }) => ({
          portal: "Portal V7M Unificado",
          scope: input?.scope || "promoter",
          features: {
            promoter: [
              "Painel de comissões e histórico de Pix",
              "Links de divulgação exclusivos",
              "Extrato de leads e matrículas confirmadas",
              "Materiais de marketing e banners"
            ],
            hub: [
              "Gestão de matrículas e alunos do polo",
              "Acolhimento e atendimento pedagógico",
              "Validação de documentos de alunos",
              "Gestão da equipe de promotores vinculados"
            ],
            admin: [
              "Auditoria financeira e fechamento semanal de Pix",
              "Gestão de usuários, polos e permissões RBAC",
              "Métricas de retenção, conversão e inadimplência"
            ]
          },
          loginUrl: "https://app.maestri.group/login"
        })
      },
      {
        name: "get_portal_support",
        description: "Retorna canais oficiais de suporte técnico para promotores, polos e operadores do Portal V7M.",
        inputSchema: {
          type: "object",
          properties: {}
        },
        annotations: { readOnlyHint: true },
        execute: async () => ({
          supportEmail: "contato@maestri.group",
          whatsappSupport: "https://wa.me/554195990955",
          hours: "Segunda a sexta, das 08h às 18h (Horário de Brasília)"
        })
      }
    ];

    for (const tool of tools) {
      try {
        navigator.modelContext.registerTool(tool, { signal });
      } catch (err) {
        console.warn("[WebMCP] Failed to register portal tool:", err);
      }
    }

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
