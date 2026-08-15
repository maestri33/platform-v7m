import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  applyLearningPlan,
  planRoundLearning,
} from './post-round-learning.mjs';

const reviews = [
  {
    role: 'R1',
    score: 7.5,
    findings: [
      { id: 'R1#1', severity: 'HIGH', category: 'A11y' },
      { id: 'R1#2', severity: 'MED', category: 'Motion' },
    ],
  },
  {
    role: 'R2',
    score: 7,
    findings: [{ id: 'R2#1', severity: 'HIGH', category: 'Arquitetura' }],
  },
  {
    role: 'R3',
    score: 7,
    findings: [{ id: 'R3#1', severity: 'LOW', category: 'API' }],
  },
];

const changes = [
  {
    id: 'agent.round-1.evidence-first',
    target: 'agent',
    sources: ['R2#1'],
    text: 'Validar o gate inteiro antes de declarar a rodada concluída.',
  },
  {
    id: 'design.round-1.live-status',
    target: 'design',
    sources: ['R1#1'],
    text: 'Mudanças de etapa transacional usam região viva atômica.',
  },
];

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function planInput(overrides = {}) {
  return {
    round: 1,
    threshold: 9,
    maxRounds: 5,
    reviews,
    changes,
    baseDigests: {
      agent: digest('agent-before'),
      design: digest('design-before'),
    },
    inputDigests: {
      reviews: {
        R1: digest('R1-before'),
        R2: digest('R2-before'),
        R3: digest('R3-before'),
      },
      changes: digest('changes-before'),
    },
    ...overrides,
  };
}

async function createInputFiles(root) {
  const reviewPaths = Object.fromEntries(
    await Promise.all(
      ['R1', 'R2', 'R3'].map(async (role) => {
        const reviewPath = path.join(root, 'reviews', `${role}.md`);
        await mkdir(path.dirname(reviewPath), { recursive: true });
        await writeFile(reviewPath, `${role}-before`, 'utf8');
        return [role, reviewPath];
      }),
    ),
  );
  const changesPath = path.join(root, 'changes.json');
  await writeFile(changesPath, 'changes-before', 'utf8');
  return { reviewPaths, changesPath };
}

describe('post-round-learning', () => {
  it('recalcula a rodada reprovada a partir dos reviews brutos', () => {
    const plan = planRoundLearning(planInput());

    expect(plan.score.display).toBe('7.17');
    expect(plan.gate).toBe('iterate');
    expect(plan.counts).toEqual({ HIGH: 2, MED: 1, LOW: 1 });
    expect(plan.nextRound).toBe(2);
    expect(plan.changes.map((change) => change.target)).toEqual([
      'agent',
      'design',
    ]);
  });

  it('falha fechado quando uma rodada reprovada não atualiza agente e design', () => {
    expect(() =>
      planRoundLearning(
        planInput({ changes: changes.filter((change) => change.target === 'agent') }),
      ),
    ).toThrow(/agente e design/i);
  });

  it('não aprende nem inicia nova rodada quando o gate foi alcançado', () => {
    const passingReviews = reviews.map((review) => ({ ...review, score: 9 }));
    const plan = planRoundLearning(
      planInput({ reviews: passingReviews, changes: [] }),
    );

    expect(plan.gate).toBe('deliver');
    expect(plan.nextRound).toBeNull();
    expect(plan.changes).toEqual([]);
  });

  it('aplica uma vez, registra recibo e é idempotente', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'post-round-learning-'));
    const agentPath = path.join(root, 'AGENTS', 'PLAYBOOK.md');
    const designPath = path.join(root, 'design', 'DESIGN.md');
    const statePath = path.join(root, 'AGENTS', 'LEARNING-STATE.json');
    await mkdir(path.dirname(agentPath), { recursive: true });
    await mkdir(path.dirname(designPath), { recursive: true });
    await writeFile(agentPath, 'agent-before', 'utf8');
    await writeFile(designPath, 'design-before', 'utf8');

    const plan = planRoundLearning(planInput());
    const paths = {
      agentPath,
      designPath,
      statePath,
      ...(await createInputFiles(root)),
    };
    const first = await applyLearningPlan(plan, paths);
    const replay = await applyLearningPlan(plan, paths);

    expect(first.status).toBe('applied');
    expect(replay.status).toBe('already-applied');
    expect(await readFile(agentPath, 'utf8')).toContain(
      'agent.round-1.evidence-first',
    );
    expect(await readFile(designPath, 'utf8')).toContain(
      'design.round-1.live-status',
    );
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    expect(state.applied).toHaveLength(1);
    expect(state.applied[0].plan_id).toBe(plan.id);
  });

  it('rejeita apply quando os artefatos mudaram depois do plano', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'post-round-stale-'));
    const agentPath = path.join(root, 'AGENTS', 'PLAYBOOK.md');
    const designPath = path.join(root, 'design', 'DESIGN.md');
    const statePath = path.join(root, 'AGENTS', 'LEARNING-STATE.json');
    await mkdir(path.dirname(agentPath), { recursive: true });
    await mkdir(path.dirname(designPath), { recursive: true });
    await writeFile(agentPath, 'agent-changed', 'utf8');
    await writeFile(designPath, 'design-before', 'utf8');

    const plan = planRoundLearning(planInput());
    const inputPaths = await createInputFiles(root);

    await expect(
      applyLearningPlan(plan, { agentPath, designPath, statePath, ...inputPaths }),
    ).rejects.toThrow(/mudou depois do plano/i);
  });

  it('rejeita apply quando reviews ou mudanças mudaram depois do plano', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'post-round-input-stale-'));
    const agentPath = path.join(root, 'AGENTS', 'PLAYBOOK.md');
    const designPath = path.join(root, 'design', 'DESIGN.md');
    const statePath = path.join(root, 'AGENTS', 'LEARNING-STATE.json');
    await mkdir(path.dirname(agentPath), { recursive: true });
    await mkdir(path.dirname(designPath), { recursive: true });
    await writeFile(agentPath, 'agent-before', 'utf8');
    await writeFile(designPath, 'design-before', 'utf8');
    const inputPaths = await createInputFiles(root);
    const plan = planRoundLearning(planInput());

    await writeFile(inputPaths.reviewPaths.R2, 'R2-alterado', 'utf8');

    await expect(
      applyLearningPlan(plan, { agentPath, designPath, statePath, ...inputPaths }),
    ).rejects.toThrow(/entradas da rodada mudaram/i);
  });
});
