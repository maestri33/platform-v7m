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
        name: "get_matricula_steps",
        description: "Retorna o fluxo passo a passo de matrícula e validação de documentos para conclusão do Ensino Fundamental ou Médio no Supletivo Brasil.",
        inputSchema: {
          type: "object",
          properties: {
            step: {
              type: "string",
              enum: ["overview", "documentos", "pagamento"],
              default: "overview",
              description: "Etapa específica que deseja consultar"
            }
          }
        },
        annotations: { readOnlyHint: true },
        execute: async (input?: { step?: string }) => ({
          institution: "Supletivo Brasil",
          currentPortal: "Portal do Aluno / Fluxo de Matrícula",
          selectedStep: input?.step || "overview",
          steps: [
            { step: 1, name: "Identificação", description: "Preenchimento de dados pessoais e CPF" },
            { step: 2, name: "Documentação", description: "Upload seguro de documento oficial com foto (RG/CNH)" },
            { step: 3, name: "Pagamento", description: "Confirmação via Pix com desconto ou cartão em 12x" },
            { step: 4, name: "Acesso Imediato", description: "Liberação instantânea da sala de aula digital" }
          ],
          matriculaUrl: "https://app.supletivo.net.br/matricula"
        })
      },
      {
        name: "get_student_support_channels",
        description: "Retorna os canais oficiais de suporte pedagógico, secretaria e atendimento ao aluno.",
        inputSchema: {
          type: "object",
          properties: {}
        },
        annotations: { readOnlyHint: true },
        execute: async () => ({
          channels: {
            whatsapp: "https://wa.me/554195990955",
            email: "contato@maestri.group",
            portalAjuda: "https://app.supletivo.net.br/ajuda"
          },
          hours: "Segunda a sexta, das 08h às 20h; Sábados das 09h às 14h (Horário de Brasília)",
          responsePolicy: "Atendimento humano com suporte pedagógico e técnico para envio de documentos."
        })
      }
    ];

    for (const tool of tools) {
      try {
        navigator.modelContext.registerTool(tool, { signal });
      } catch (err) {
        console.warn("[WebMCP] Failed to register tool:", err);
      }
    }

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
