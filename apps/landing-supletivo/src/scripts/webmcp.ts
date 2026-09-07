/**
 * WebMCP (Web Model Context Protocol) Tools implementation for Supletivo Brasil.
 * Conforms to the W3C Web Machine Learning CG Draft & Chrome Early Preview specification.
 * Exposes structured browser-level tools to AI agents via navigator.modelContext.registerTool().
 *
 * @see https://webmachinelearning.github.io/webmcp/
 * @see https://developer.chrome.com/blog/webmcp-epp
 */

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

export interface CheckEligibilityInput {
  age: number;
  level?: 'fundamental' | 'medio';
}

export interface CourseInfoInput {
  level?: 'fundamental' | 'medio' | 'ambos';
}

export interface TuitionInput {
  level?: 'fundamental' | 'medio' | 'ambos';
}

export interface SearchFaqInput {
  query: string;
}

export interface EnrollmentLinkInput {
  promoter_code?: string;
  level?: 'fundamental' | 'medio';
}

const FAQ_DATABASE = [
  {
    question: 'O certificado é reconhecido pelo MEC e tem validade nacional?',
    answer: 'Sim, 100% reconhecido. O diploma emitido por nossas escolas credenciadas possui publicação em Diário Oficial e registro no Sistec/MEC, com validade jurídica idêntica ao ensino presencial tradicional para prestar concursos públicos, ingressar em faculdades, cursos técnicos e progressão de carreira.',
    keywords: ['mec', 'validade', 'diario oficial', 'concurso', 'faculdade', 'reconhecido', 'certificado', 'diploma']
  },
  {
    question: 'Em quanto tempo posso concluir os estudos?',
    answer: 'A conclusão é acelerada e no seu ritmo: em média entre 30 e 90 dias, dependendo da sua dedicação. Assim que concluir as videoaulas e for aprovado nas avaliações online, seu processo de certificação é iniciado.',
    keywords: ['tempo', 'duracao', 'conclusao', 'rapido', 'dias', 'meses', 'acelerado']
  },
  {
    question: 'Qual a idade mínima para fazer o supletivo?',
    answer: 'Conforme a Lei de Diretrizes e Bases da Educação (LDB nº 9.394/96), a idade mínima é de 15 anos completos para o Ensino Fundamental e 18 anos completos para o Ensino Médio.',
    keywords: ['idade', 'minima', 'anos', 'requisito', 'fundamental', 'medio']
  },
  {
    question: 'Como funcionam as provas e as aulas?',
    answer: 'O curso é 100% online (EAD). Você estuda pelo celular, tablet ou computador a qualquer hora do dia. As provas são realizadas digitalmente dentro da plataforma, com suporte pedagógico e simulados preparatórios.',
    keywords: ['prova', 'aulas', 'online', 'ead', 'celular', 'plataforma', 'simulados']
  },
  {
    question: 'Quais documentos são necessários para a matrícula?',
    answer: 'Documento oficial com foto (RG ou CNH), CPF, comprovante de residência atualizado e histórico escolar anterior (se você não tiver o histórico, nossa equipe orienta o processo de declaração de escolaridade).',
    keywords: ['documento', 'documentos', 'rg', 'cpf', 'matricula', 'comprovante', 'historico']
  }
];

export const supletivoWebMcpTools: WebMcpTool[] = [
  {
    name: 'check_eligibility',
    description: 'Verifica a elegibilidade do aluno para conclusão do Ensino Fundamental (mínimo 15 anos) ou Ensino Médio (mínimo 18 anos) no Supletivo Brasil segundo a Lei Federal nº 9.394/96 (LDB).',
    inputSchema: {
      type: 'object',
      properties: {
        age: {
          type: 'integer',
          minimum: 10,
          maximum: 120,
          description: 'Idade do candidato em anos completos'
        },
        level: {
          type: 'string',
          enum: ['fundamental', 'medio'],
          default: 'medio',
          description: 'Nível de escolaridade desejado (fundamental = 1º ao 9º ano; medio = 1º ao 3º ano do ensino médio)'
        }
      },
      required: ['age']
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown>) => {
      const input = rawInput as unknown as CheckEligibilityInput;
      const age = Number(input?.age);
      const level = input?.level || 'medio';

      if (isNaN(age) || age < 10) {
        return {
          eligible: false,
          error: 'Por favor, informe uma idade válida em anos.',
          level
        };
      }

      const minAge = level === 'fundamental' ? 15 : 18;
      const levelLabel = level === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio';

      if (age >= minAge) {
        return {
          eligible: true,
          level,
          levelLabel,
          age,
          minimumAge: minAge,
          message: `Parabéns! Com ${age} anos você cumpre os requisitos legais para concluir o ${levelLabel} no Supletivo Brasil.`,
          nextStep: 'Iniciar matrícula online com emissão rápida de diploma.',
          enrollmentUrl: 'https://app.supletivo.net.br/matricula'
        };
      }

      return {
        eligible: false,
        level,
        levelLabel,
        age,
        minimumAge: minAge,
        message: `Para cursar o ${levelLabel}, a legislação brasileira (LDB art. 38) exige idade mínima de ${minAge} anos completos. Atualmente você possui ${age} anos.`,
        recommendation: level === 'medio' && age >= 15
          ? 'Você já pode concluir o Ensino Fundamental agora e preparar-se para o Ensino Médio ao completar 18 anos.'
          : 'Aguarde atingir a idade legal mínima para realizar a matrícula.'
      };
    }
  },

  {
    name: 'get_course_info',
    description: 'Retorna informações oficiais completas sobre a metodologia, duração, grade curricular, validade jurídica no MEC e suporte ao aluno do Supletivo Brasil.',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['fundamental', 'medio', 'ambos'],
          default: 'medio',
          description: 'Nível do curso para o qual deseja obter detalhes'
        }
      }
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown> = {}) => {
      const input = rawInput as unknown as CourseInfoInput;
      const level = input?.level || 'medio';
      return {
        institution: 'Supletivo Brasil — Polo Oficial Maestri Group',
        modality: 'Educação de Jovens e Adultos (EJA) 100% Online / Acelerada',
        mecAccreditation: 'Válido em todo o território nacional, emitido por escolas credenciadas pelos Conselhos Estaduais de Educação e registradas no Sistec/MEC.',
        averageDuration: '30 a 90 dias dependendo do ritmo individual de estudos do aluno.',
        studyFormat: 'Plataforma digital responsiva (celular, tablet e computador), videoaulas curtas e diretas, apostilas digitais em PDF, banco de simulados preparatórios.',
        studentSupport: 'Tutor pedagógico dedicado via WhatsApp, plantão de dúvidas e acompanhamento em todas as etapas até a publicação em Diário Oficial.',
        courses: {
          medio: {
            title: 'Ensino Médio Completo (EJA)',
            targetAudience: 'Adultos a partir de 18 anos que não concluíram o ensino médio.',
            curriculumAreas: ['Linguagens e Códigos', 'Matemática e suas Tecnologias', 'Ciências da Natureza (Física, Química, Biologia)', 'Ciências Humanas (História, Geografia, Sociologia, Filosofia)'],
            certificateType: 'Certificado de Conclusão do Ensino Médio com publicação no Diário Oficial e registro no Sistec/MEC.'
          },
          fundamental: {
            title: 'Ensino Fundamental (EJA)',
            targetAudience: 'Jovens e adultos a partir de 15 anos que desejam concluir do 1º ao 9º ano.',
            curriculumAreas: ['Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia'],
            certificateType: 'Certificado de Conclusão do Ensino Fundamental.'
          }
        },
        selectedLevel: level,
        enrollmentUrl: 'https://app.supletivo.net.br/matricula'
      };
    }
  },

  {
    name: 'calculate_tuition',
    description: 'Consulta valores promocionais vigentes, condições de parcelamento no cartão de crédito em até 12x sem juros, desconto no Pix à vista e política de garantia.',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['fundamental', 'medio', 'ambos'],
          default: 'medio',
          description: 'Nível desejado para simulação de preços'
        }
      }
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown> = {}) => {
      const input = rawInput as unknown as TuitionInput;
      const level = input?.level || 'medio';
      return {
        level,
        currency: 'BRL',
        regularPrice: 1497.00,
        promotionalPrice: 997.00,
        installmentPlan: {
          installments: 12,
          monthlyValue: 99.00,
          paymentMethod: 'Cartão de crédito sem juros'
        },
        cashPaymentPix: {
          discountedValue: 897.00,
          discountPercentage: '10% OFF no Pix à vista',
          pixKeyType: 'Copia e Cola e QR Code instantâneo com confirmação em tempo real'
        },
        inclusions: [
          'Acesso ilimitado à plataforma digital até a conclusão',
          'Todas as videoaulas, materiais em PDF e simulados',
          'Taxa de matrícula inclusa',
          'Todas as tentativas de avaliação incluídas sem custo extra',
          'Emissão do certificado oficial com publicação em Diário Oficial',
          'Envio do diploma digital autenticado via QR Code e código verificador'
        ],
        guarantee: 'Garantia incondicional de 7 dias (Artigo 49 do Código de Defesa do Consumidor — devolução de 100% do valor caso o aluno desista).',
        checkoutUrl: 'https://app.supletivo.net.br/matricula'
      };
    }
  },

  {
    name: 'search_faq',
    description: 'Pesquisa perguntas e respostas frequentes sobre validade do diploma, prazos de emissão, provas online, documentos necessários e aceitação em concursos ou faculdades.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Termo de busca ou dúvida sobre o Supletivo Brasil'
        }
      },
      required: ['query']
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown>) => {
      const input = rawInput as unknown as SearchFaqInput;
      const rawQuery = (input?.query || '').trim().toLowerCase();
      if (!rawQuery) {
        return {
          results: FAQ_DATABASE.map(item => ({ question: item.question, answer: item.answer }))
        };
      }

      const terms = rawQuery.split(/\s+/).filter(t => t.length > 2);
      const matched = FAQ_DATABASE.filter(item => {
        const text = `${item.question} ${item.answer} ${item.keywords.join(' ')}`.toLowerCase();
        return terms.some(term => text.includes(term));
      });

      const results = (matched.length > 0 ? matched : FAQ_DATABASE).map(item => ({
        question: item.question,
        answer: item.answer
      }));

      return {
        query: input.query,
        matchCount: matched.length > 0 ? matched.length : FAQ_DATABASE.length,
        results
      };
    }
  },

  {
    name: 'get_enrollment_link',
    description: 'Gera o link de matrícula oficial direto para o Portal do Aluno com preservação de código de indicação do promotor e parâmetros de curso.',
    inputSchema: {
      type: 'object',
      properties: {
        promoter_code: {
          type: 'string',
          description: 'Código de indicação ou cupom do promotor (opcional)'
        },
        level: {
          type: 'string',
          enum: ['fundamental', 'medio'],
          default: 'medio',
          description: 'Nível desejado para matrícula'
        }
      }
    },
    annotations: { readOnlyHint: true },
    execute: (rawInput: Record<string, unknown> = {}) => {
      const input = rawInput as unknown as EnrollmentLinkInput;
      const baseUrl = 'https://app.supletivo.net.br/matricula';
      const params = new URLSearchParams();

      if (input.promoter_code) {
        params.set('ref', input.promoter_code.trim().toUpperCase());
      }
      if (input.level) {
        params.set('curso', input.level);
      }

      const queryString = params.toString();
      const enrollmentUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      return {
        url: enrollmentUrl,
        level: input.level || 'medio',
        promoter_code: input.promoter_code || null,
        instructions: 'Acesse o link para preencher seus dados, enviar documento (RG/CNH) e escolher a forma de pagamento (Pix ou Cartão em 12x).'
      };
    }
  }
];

/**
 * Register tools on navigator.modelContext with AbortController lifecycle management.
 */
export function registerWebMcp(
  tools: WebMcpTool[] = supletivoWebMcpTools,
  options?: { signal?: AbortSignal }
): AbortController | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  if (!('modelContext' in navigator) || !navigator.modelContext?.registerTool) {
    return null;
  }

  const controller = new AbortController();

  // If a parent signal was provided, abort our controller when parent aborts
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

  // Teardown cleanly on page navigation/unload
  window.addEventListener('pagehide', () => controller.abort(), { once: true });

  return controller;
}

/**
 * Auto-initialization on page load.
 */
export function initWebMcp(): AbortController | null {
  return registerWebMcp(supletivoWebMcpTools);
}

// Auto-run if executed in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWebMcp(), { once: true });
  } else {
    initWebMcp();
  }
}
