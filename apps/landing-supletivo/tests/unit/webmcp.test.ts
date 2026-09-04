import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  supletivoWebMcpTools,
  registerWebMcp,
  initWebMcp,
  type WebMcpTool
} from '../../src/scripts/webmcp';

describe('Supletivo Brasil WebMCP Tools', () => {
  it('exposes all 5 expected tools with valid JSON schemas', () => {
    const names = supletivoWebMcpTools.map(t => t.name);
    expect(names).toEqual([
      'check_eligibility',
      'get_course_info',
      'calculate_tuition',
      'search_faq',
      'get_enrollment_link'
    ]);

    for (const tool of supletivoWebMcpTools) {
      expect(tool.name).toBeTypeOf('string');
      expect(tool.description).toBeTypeOf('string');
      expect(tool.description.length).toBeGreaterThan(15);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeTypeOf('object');
      expect(tool.execute).toBeTypeOf('function');
    }
  });

  describe('Tool: check_eligibility', () => {
    const tool = supletivoWebMcpTools.find(t => t.name === 'check_eligibility')!;

    it('approves candidates with age >= 18 for Ensino Médio', async () => {
      const res = await tool.execute({ age: 24, level: 'medio' }) as any;
      expect(res.eligible).toBe(true);
      expect(res.level).toBe('medio');
      expect(res.minimumAge).toBe(18);
      expect(res.enrollmentUrl).toBe('https://app.supletivo.net.br/matricula');
    });

    it('rejects candidates under 18 for Ensino Médio and recommends Fundamental if >= 15', async () => {
      const res = await tool.execute({ age: 16, level: 'medio' }) as any;
      expect(res.eligible).toBe(false);
      expect(res.minimumAge).toBe(18);
      expect(res.recommendation).toContain('Ensino Fundamental');
    });

    it('approves candidates with age >= 15 for Ensino Fundamental', async () => {
      const res = await tool.execute({ age: 15, level: 'fundamental' }) as any;
      expect(res.eligible).toBe(true);
      expect(res.level).toBe('fundamental');
      expect(res.minimumAge).toBe(15);
    });

    it('rejects candidates under 15 for Ensino Fundamental', async () => {
      const res = await tool.execute({ age: 13, level: 'fundamental' }) as any;
      expect(res.eligible).toBe(false);
      expect(res.minimumAge).toBe(15);
    });

    it('handles invalid ages gracefully', async () => {
      const res = await tool.execute({ age: -5 }) as any;
      expect(res.eligible).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('Tool: get_course_info', () => {
    const tool = supletivoWebMcpTools.find(t => t.name === 'get_course_info')!;

    it('returns MEC accreditation and course curriculum details', async () => {
      const res = await tool.execute({ level: 'medio' }) as any;
      expect(res.institution).toContain('Supletivo Brasil');
      expect(res.mecAccreditation).toContain('MEC');
      expect(res.averageDuration).toContain('30 a 90 dias');
      expect(res.courses.medio.title).toBe('Ensino Médio Completo (EJA)');
      expect(res.courses.fundamental.title).toBe('Ensino Fundamental (EJA)');
    });
  });

  describe('Tool: calculate_tuition', () => {
    const tool = supletivoWebMcpTools.find(t => t.name === 'calculate_tuition')!;

    it('returns official pricing, 12x card installments, and Pix discount', async () => {
      const res = await tool.execute({ level: 'medio' }) as any;
      expect(res.currency).toBe('BRL');
      expect(res.installmentPlan.installments).toBe(12);
      expect(res.installmentPlan.monthlyValue).toBe(99.00);
      expect(res.cashPaymentPix.discountedValue).toBe(897.00);
      expect(res.guarantee).toContain('7 dias');
      expect(res.inclusions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Tool: search_faq', () => {
    const tool = supletivoWebMcpTools.find(t => t.name === 'search_faq')!;

    it('searches FAQ entries matching search term', async () => {
      const res = await tool.execute({ query: 'mec' }) as any;
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].question).toContain('MEC');
    });

    it('returns full list if query is empty', async () => {
      const res = await tool.execute({ query: '' }) as any;
      expect(res.results.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Tool: get_enrollment_link', () => {
    const tool = supletivoWebMcpTools.find(t => t.name === 'get_enrollment_link')!;

    it('generates direct enrollment URL with promoter attribution', async () => {
      const res = await tool.execute({ promoter_code: 'PROMO10', level: 'medio' }) as any;
      expect(res.url).toBe('https://app.supletivo.net.br/matricula?ref=PROMO10&curso=medio');
      expect(res.promoter_code).toBe('PROMO10');
    });

    it('generates base URL when no params provided', async () => {
      const res = await tool.execute({}) as any;
      expect(res.url).toBe('https://app.supletivo.net.br/matricula');
    });
  });

  describe('WebMCP Registration and Lifecycle (navigator.modelContext)', () => {
    let originalNavigator: any;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      global.navigator = originalNavigator;
      vi.restoreAllMocks();
    });

    it('returns null gracefully if navigator.modelContext is not supported', () => {
      (global as any).navigator = {};
      const controller = registerWebMcp();
      expect(controller).toBeNull();
    });

    it('registers all tools with AbortSignal when navigator.modelContext is present', () => {
      const registerToolMock = vi.fn();
      (global as any).navigator = {
        modelContext: {
          registerTool: registerToolMock
        }
      };

      const controller = registerWebMcp();
      expect(controller).toBeInstanceOf(AbortController);
      expect(registerToolMock).toHaveBeenCalledTimes(5);

      for (let i = 0; i < 5; i++) {
        const [tool, options] = registerToolMock.mock.calls[i];
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('execute');
        expect(options).toHaveProperty('signal', controller?.signal);
      }
    });

    it('aborts tools signal when parent signal aborts', () => {
      const registerToolMock = vi.fn();
      (global as any).navigator = {
        modelContext: {
          registerTool: registerToolMock
        }
      };

      const parentController = new AbortController();
      const childController = registerWebMcp(supletivoWebMcpTools, { signal: parentController.signal });

      expect(childController?.signal.aborted).toBe(false);
      parentController.abort();
      expect(childController?.signal.aborted).toBe(true);
    });

    it('initWebMcp returns controller when supported', () => {
      const registerToolMock = vi.fn();
      (global as any).navigator = {
        modelContext: {
          registerTool: registerToolMock
        }
      };

      const controller = initWebMcp();
      expect(controller).toBeInstanceOf(AbortController);
    });
  });
});
