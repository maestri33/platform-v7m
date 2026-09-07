/**
 * WebMCP (Web Model Context Protocol) Tools implementation for Maestri Group (Programa de Promotores V7M).
 * Conforms to the W3C Web Machine Learning CG Draft & Chrome Early Preview specification.
 * Exposes structured browser-level tools to AI agents via navigator.modelContext.registerTool().
 *
 * @see https://webmachinelearning.github.io/webmcp/
 * @see https://developer.chrome.com/blog/webmcp-epp
 */

import {
  COMMISSION_DIRECT,
  BONUS_FLAT,
  BONUS_THRESHOLD,
  CLOSING_LABEL,
  APP_URL,
  APP_REF_PARAM,
  weeklyEarnings
} from '../config';

export interface WebMcpToolProperty {
  type: string;
  description?: string;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  format?: string;
  default?: unknown;
  items?: Record<string, unknown>;
}

export interface WebMcpInputSchema {
  type: 'object';
  properties: Record<string, WebMcpToolProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  [key: string]: unknown;
}

export interface WebMcpTool<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: WebMcpInputSchema;
  execute: (input: TInput, options?: { signal?: AbortSignal }) => Promise<TOutput> | TOutput;
  annotations?: WebMcpToolAnnotations;
}

export interface WebMcpRegisterOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (tool: WebMcpTool<Record<string, unknown>, unknown>, options?: WebMcpRegisterOptions) => Promise<void> | void;
      getTools?: () => Promise<unknown[]> | unknown[];
      executeTool?: (name: string, input?: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
    };
  }
}

export interface EarningsSimulationInput {
  paid_enrollments_per_week: number;
}

export interface ProgramInfoInput {
  topic?: 'general' | 'commissions' | 'payouts' | 'rules';
}

export interface RegistrationLinkInput {
  hub?: string;
}

export const promoterWebMcpTools: WebMcpTool[] = [
  {
    name: 'simulate_promoter_earnings',
    description: 'Simula a remuneração semanal e a projeção mensal de ganhos do Promotor V7M com base no número de matrículas pagas por semana, considerando comissão direta e bônus de metas.',
    inputSchema: {
      type: 'object',
      properties: {
        paid_enrollments_per_week: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 5,
          description: 'Número de matrículas pagas estimadas por semana'
        }
      },
      required: ['paid_enrollments_per_week']
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown>) => {
      const input = rawInput as unknown as EarningsSimulationInput;
      const enrollments = Math.max(1, Math.floor(Number(input?.paid_enrollments_per_week) || 1));
      const { direct, bonus, total: weeklyTotal } = weeklyEarnings(enrollments);
      const monthlyEstimate = weeklyTotal * 4;

      return {
        paid_enrollments_per_week: enrollments,
        currency: 'BRL',
        directCommission: direct,
        directCommissionPerEnrollment: COMMISSION_DIRECT,
        bonusAwarded: bonus,
        bonusRules: `Bônus de R$ ${BONUS_FLAT} a cada bloco de ${BONUS_THRESHOLD} matrículas pagas na semana.`,
        weeklyTotal,
        monthlyProjection: monthlyEstimate,
        payoutSchedule: `Pagamento semanal automático via Pix (${CLOSING_LABEL}).`,
        ctaUrl: APP_URL
      };
    }
  },

  {
    name: 'get_promoter_program_info',
    description: 'Retorna as diretrizes oficiais do Programa de Promotores V7M / Maestri Group: funcionamento, remuneração, materiais de divulgação, suporte de polo e regras de conformidade.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['general', 'commissions', 'payouts', 'rules'],
          default: 'general',
          description: 'Tópico específico sobre o qual deseja informações'
        }
      }
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown> = {}) => {
      const input = rawInput as unknown as ProgramInfoInput;
      const topic = input?.topic || 'general';

      return {
        programName: 'Programa de Promotores Oficiais V7M',
        organizer: 'Maestri Group',
        topic,
        summary: 'Programa de indicação comissionada para expansão da Educação de Jovens e Adultos (EJA / Supletivo Brasil). Promotores recebem comissão por cada matrícula paga e bônus por metas semanais.',
        financials: {
          directCommission: `R$ ${COMMISSION_DIRECT},00 por matrícula confirmada e paga`,
          bonusThreshold: `A cada ${BONUS_THRESHOLD} matrículas pagas na mesma semana, bônus adicional de R$ ${BONUS_FLAT},00`,
          payoutMethod: 'Pix direto na conta bancária do promotor',
          payoutFrequency: `Semanal (${CLOSING_LABEL})`
        },
        toolsProvided: [
          'Link de indicação exclusivo com rastreamento em tempo real',
          'Painel do Promotor para acompanhar cliques, leads gerados e matrículas pagas',
          'Artes prontas, copies para WhatsApp e criativos para redes sociais',
          'Suporte dedicado com coordenador de polo regional'
        ],
        requirements: [
          'Maior de 18 anos',
          'Conta bancária com chave Pix em nome do titular',
          'Dispositivo com internet (celular ou computador)'
        ],
        registrationUrl: APP_URL
      };
    }
  },

  {
    name: 'get_promoter_registration_link',
    description: 'Gera o link oficial de cadastro imediato para novos promotores com amarração ao polo regional.',
    inputSchema: {
      type: 'object',
      properties: {
        hub: {
          type: 'string',
          description: 'Identificador do polo regional parceiro (opcional)'
        }
      }
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown> = {}) => {
      const input = rawInput as unknown as RegistrationLinkInput;
      let targetUrl = APP_URL;
      if (input.hub) {
        const cleanHub = input.hub.trim();
        targetUrl = `${APP_URL}?${APP_REF_PARAM}=${encodeURIComponent(cleanHub)}`;
      }

      return {
        url: targetUrl,
        hub: input.hub || 'default_polo',
        instructions: 'Acesse o portal do promotor, cadastre seu e-mail e chave Pix para receber seu link de divulgação exclusivo em menos de 2 minutos.'
      };
    }
  }
];

/**
 * Register tools on navigator.modelContext with AbortController lifecycle management.
 */
export function registerWebMcp(
  tools: WebMcpTool[] = promoterWebMcpTools,
  options?: { signal?: AbortSignal }
): AbortController | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  if (!('modelContext' in navigator) || !navigator.modelContext?.registerTool) {
    return null;
  }

  const controller = new AbortController();

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  for (const tool of tools) {
    try {
      navigator.modelContext.registerTool(tool, { signal: controller.signal });
    } catch (err) {
      console.warn(`[WebMCP] Failed to register tool "${tool.name}":`, err);
    }
  }

  window.addEventListener('pagehide', () => controller.abort(), { once: true });

  return controller;
}

/**
 * Auto-initialization on page load.
 */
export function initWebMcp(): AbortController | null {
  return registerWebMcp(promoterWebMcpTools);
}

// Auto-run if executed in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWebMcp(), { once: true });
  } else {
    initWebMcp();
  }
}
