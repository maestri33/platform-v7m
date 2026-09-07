import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  promoterWebMcpTools,
  registerWebMcp,
  initWebMcp
} from '../../src/scripts/webmcp';

describe('Programa de Promotores WebMCP Tools', () => {
  it('exposes all 3 expected tools with valid JSON schemas', () => {
    const names = promoterWebMcpTools.map(t => t.name);
    expect(names).toEqual([
      'simulate_promoter_earnings',
      'get_promoter_program_info',
      'get_promoter_registration_link'
    ]);

    for (const tool of promoterWebMcpTools) {
      expect(tool.name).toBeTypeOf('string');
      expect(tool.description).toBeTypeOf('string');
      expect(tool.description.length).toBeGreaterThan(15);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeTypeOf('object');
      expect(tool.execute).toBeTypeOf('function');
    }
  });

  describe('Tool: simulate_promoter_earnings', () => {
    const tool = promoterWebMcpTools.find(t => t.name === 'simulate_promoter_earnings')!;

    it('calculates direct commission and bonus for 5 enrollments', async () => {
      const res = await tool.execute({ paid_enrollments_per_week: 5 }) as any;
      expect(res.paid_enrollments_per_week).toBe(5);
      expect(res.directCommission).toBe(500);
      expect(res.bonusAwarded).toBe(500);
      expect(res.weeklyTotal).toBe(1000);
      expect(res.monthlyProjection).toBe(4000);
      expect(res.payoutSchedule).toContain('Pix');
    });

    it('calculates earnings correctly for 1 enrollment (no bonus)', async () => {
      const res = await tool.execute({ paid_enrollments_per_week: 1 }) as any;
      expect(res.directCommission).toBe(100);
      expect(res.bonusAwarded).toBe(0);
      expect(res.weeklyTotal).toBe(100);
      expect(res.monthlyProjection).toBe(400);
    });
  });

  describe('Tool: get_promoter_program_info', () => {
    const tool = promoterWebMcpTools.find(t => t.name === 'get_promoter_program_info')!;

    it('returns structured rules and financials of the promoter program', async () => {
      const res = await tool.execute({ topic: 'commissions' }) as any;
      expect(res.programName).toContain('Promotores Oficiais V7M');
      expect(res.financials.directCommission).toContain('100');
      expect(res.financials.payoutMethod).toContain('Pix');
      expect(res.toolsProvided.length).toBeGreaterThan(2);
      expect(res.requirements.length).toBeGreaterThan(1);
    });
  });

  describe('Tool: get_promoter_registration_link', () => {
    const tool = promoterWebMcpTools.find(t => t.name === 'get_promoter_registration_link')!;

    it('generates registration link with hub attribution', async () => {
      const res = await tool.execute({ hub: 'polo-curitiba' }) as any;
      expect(res.url).toContain('ref=polo-curitiba');
      expect(res.hub).toBe('polo-curitiba');
    });

    it('generates base registration link when no hub is specified', async () => {
      const res = await tool.execute({}) as any;
      expect(res.url).toBeDefined();
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

    it('returns null gracefully if navigator.modelContext is absent', () => {
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
      expect(registerToolMock).toHaveBeenCalledTimes(3);

      for (let i = 0; i < 3; i++) {
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
      const childController = registerWebMcp(promoterWebMcpTools, { signal: parentController.signal });

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
