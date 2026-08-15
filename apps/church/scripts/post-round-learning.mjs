import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROLES = ['R1', 'R2', 'R3'];
const SEVERITIES = ['HIGH', 'MED', 'LOW'];
const TARGET_LABEL = {
  agent: 'Aprendizados gerenciados do agente',
  design: 'Aprendizados gerenciados de design',
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function assertReviewSet(reviews) {
  if (!Array.isArray(reviews) || reviews.length !== ROLES.length) {
    throw new Error('A rodada precisa de exatamente três reviews: R1, R2 e R3.');
  }
  const roles = reviews.map((review) => review.role).sort();
  if (canonical(roles) !== canonical([...ROLES].sort())) {
    throw new Error('A rodada precisa de um review único para cada papel R1, R2 e R3.');
  }
  for (const review of reviews) {
    if (!Number.isFinite(review.score) || review.score < 0 || review.score > 10) {
      throw new Error(`Nota inválida em ${review.role}; use um valor entre 0 e 10.`);
    }
    if (!Array.isArray(review.findings)) {
      throw new Error(`Achados ausentes em ${review.role}.`);
    }
    for (const finding of review.findings) {
      if (!finding.id || !SEVERITIES.includes(finding.severity)) {
        throw new Error(`Achado inválido em ${review.role}.`);
      }
    }
  }
}

function assertChanges(changes, findings, gate) {
  if (gate === 'deliver') {
    if (changes.length > 0) {
      throw new Error('Uma rodada aprovada não pode aplicar aprendizados corretivos.');
    }
    return;
  }
  const targets = new Set(changes.map((change) => change.target));
  if (!targets.has('agent') || !targets.has('design')) {
    throw new Error('Rodada sem meta deve atualizar agente e design com evidência.');
  }
  const findingIds = new Set(findings.map((finding) => finding.id));
  const changeIds = new Set();
  for (const change of changes) {
    if (!change.id || changeIds.has(change.id)) {
      throw new Error('Cada aprendizado precisa de um id único e estável.');
    }
    changeIds.add(change.id);
    if (!['agent', 'design'].includes(change.target)) {
      throw new Error(`Destino de aprendizado inválido: ${change.target}.`);
    }
    if (!change.text?.trim() || !Array.isArray(change.sources) || change.sources.length === 0) {
      throw new Error(`Aprendizado ${change.id} precisa de texto e fontes.`);
    }
    const missing = change.sources.filter((source) => !findingIds.has(source));
    if (missing.length > 0) {
      throw new Error(`Aprendizado ${change.id} cita fontes inexistentes: ${missing.join(', ')}.`);
    }
  }
}

export function planRoundLearning(input) {
  const round = Number(input.round);
  const threshold = input.threshold ?? 9;
  const maxRounds = input.maxRounds ?? 5;
  if (!Number.isInteger(round) || round < 1) throw new Error('Rodada inválida.');
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 10) {
    throw new Error('Threshold inválido.');
  }
  assertReviewSet(input.reviews);

  const findings = input.reviews.flatMap((review) =>
    review.findings.map((finding) => ({ ...finding, reviewer: review.role })),
  );
  const counts = Object.fromEntries(
    SEVERITIES.map((severity) => [
      severity,
      findings.filter((finding) => finding.severity === severity).length,
    ]),
  );
  const sum = input.reviews.reduce((total, review) => total + review.score, 0);
  const exact = sum / input.reviews.length;
  const gate = exact >= threshold ? 'deliver' : round >= maxRounds ? 'await-user' : 'iterate';
  const changes = (input.changes ?? []).map((change) => ({
    ...change,
    sources: [...change.sources],
  }));
  assertChanges(changes, findings, gate);

  const planBody = {
    version: 2,
    round,
    threshold,
    maxRounds,
    reviews: input.reviews,
    score: { exact, display: exact.toFixed(2) },
    counts,
    gate,
    nextRound: gate === 'iterate' ? round + 1 : null,
    changes,
    baseDigests: input.baseDigests,
    inputDigests: input.inputDigests,
  };
  return Object.freeze({ ...planBody, id: sha256(canonical(planBody)) });
}

function renderChange(change, round) {
  return `- **${change.id}** (Rodada ${round}; fontes: ${change.sources.join(', ')}): ${change.text}`;
}

function appendManagedChanges(content, target, changes, round) {
  const relevant = changes.filter((change) => change.target === target);
  if (relevant.length === 0) return content;
  const unseen = relevant.filter((change) => !content.includes(`**${change.id}**`));
  if (unseen.length === 0) return content;
  const header = `## ${TARGET_LABEL[target]}`;
  const prefix = content.includes(header) ? '\n' : `\n\n${header}\n`;
  return `${content.trimEnd()}${prefix}${unseen.map((change) => renderChange(change, round)).join('\n')}\n`;
}

async function writeAtomic(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, filePath);
}

async function readState(statePath) {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8'));
    return { version: 1, applied: Array.isArray(parsed.applied) ? parsed.applied : [] };
  } catch (error) {
    if (error?.code === 'ENOENT') return { version: 1, applied: [] };
    throw error;
  }
}

export async function applyLearningPlan(plan, paths) {
  const state = await readState(paths.statePath);
  if (state.applied.some((receipt) => receipt.plan_id === plan.id)) {
    return { status: 'already-applied', planId: plan.id };
  }
  if (plan.gate === 'deliver') {
    return { status: 'not-required', planId: plan.id };
  }

  if (!plan.inputDigests || !paths.reviewPaths || !paths.changesPath) {
    throw new Error('Plano sem hashes das entradas; gere um novo plano antes de aplicar.');
  }
  const [reviewEntries, changesBefore] = await Promise.all([
    Promise.all(
      ROLES.map(async (role) => [role, await readFile(paths.reviewPaths[role], 'utf8')]),
    ),
    readFile(paths.changesPath, 'utf8'),
  ]);
  const currentInputDigests = {
    reviews: Object.fromEntries(
      reviewEntries.map(([role, content]) => [role, sha256(content)]),
    ),
    changes: sha256(changesBefore),
  };
  if (canonical(currentInputDigests) !== canonical(plan.inputDigests)) {
    throw new Error('As entradas da rodada mudaram depois do plano; gere um novo plano antes de aplicar.');
  }

  const [agentBefore, designBefore] = await Promise.all([
    readFile(paths.agentPath, 'utf8'),
    readFile(paths.designPath, 'utf8'),
  ]);
  if (
    sha256(agentBefore) !== plan.baseDigests.agent ||
    sha256(designBefore) !== plan.baseDigests.design
  ) {
    throw new Error('Um artefato mudou depois do plano; gere um novo plano antes de aplicar.');
  }

  const agentAfter = appendManagedChanges(agentBefore, 'agent', plan.changes, plan.round);
  const designAfter = appendManagedChanges(designBefore, 'design', plan.changes, plan.round);
  const receipt = {
    plan_id: plan.id,
    round: plan.round,
    score: plan.score.display,
    gate: plan.gate,
    next_round: plan.nextRound,
    changed_targets: plan.changes.map((change) => change.target),
    after_digests: {
      agent: sha256(agentAfter),
      design: sha256(designAfter),
    },
  };

  await writeAtomic(paths.agentPath, agentAfter);
  await writeAtomic(paths.designPath, designAfter);
  await writeAtomic(
    paths.statePath,
    `${JSON.stringify({ ...state, applied: [...state.applied, receipt] }, null, 2)}\n`,
  );
  return { status: 'applied', planId: plan.id, receipt };
}

function parseReview(markdown, role) {
  const scoreMatch = markdown.match(/(?:##\s*)?Nota:\s*\*\*([0-9]+(?:[.,][0-9]+)?)/i);
  if (!scoreMatch) throw new Error(`Não foi possível ler a nota de ${role}.`);
  const findings = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(\d+)\s*\|\s*(HIGH|MED|LOW)\s*\|\s*([^|]+)\|/i);
    if (match) {
      findings.push({
        id: `${role}#${match[1]}`,
        severity: match[2].toUpperCase(),
        category: match[3].trim(),
      });
    }
  }
  return { role, score: Number(scoreMatch[1].replace(',', '.')), findings };
}

async function buildPlanFromWorkspace(root, round) {
  const reviewsDirectory = path.join(root, 'AGENTS', 'REVIEWS', `rodada-${round}`);
  const reviewFiles = {
    R1: 'R1-ux-motion.md',
    R2: 'R2-arquitetura.md',
    R3: 'R3-api.md',
  };
  const reviewPaths = Object.fromEntries(
    ROLES.map((role) => [role, path.join(reviewsDirectory, reviewFiles[role])]),
  );
  const reviewEntries = await Promise.all(
    ROLES.map(async (role) => {
      const raw = await readFile(reviewPaths[role], 'utf8');
      return { role, raw, parsed: parseReview(raw, role) };
    }),
  );
  const reviews = reviewEntries.map((entry) => entry.parsed);
  const changesPath = path.join(root, 'AGENTS', 'LEARNING', `round-${round}.changes.json`);
  const changesRaw = await readFile(changesPath, 'utf8');
  const changes = JSON.parse(changesRaw);
  const agentPath = path.join(root, 'AGENTS', 'PROCESS.md');
  const designPath = path.resolve(root, '..', 'ieadpg-design', 'DESIGN.md');
  const [agent, design] = await Promise.all([
    readFile(agentPath, 'utf8'),
    readFile(designPath, 'utf8'),
  ]);
  const plan = planRoundLearning({
    round,
    reviews,
    changes,
    threshold: 9,
    maxRounds: 5,
    baseDigests: { agent: sha256(agent), design: sha256(design) },
    inputDigests: {
      reviews: Object.fromEntries(
        reviewEntries.map((entry) => [entry.role, sha256(entry.raw)]),
      ),
      changes: sha256(changesRaw),
    },
  });
  return {
    plan,
    paths: {
      agentPath,
      designPath,
      statePath: path.join(root, 'AGENTS', 'LEARNING-STATE.json'),
      reviewPaths,
      changesPath,
    },
  };
}

async function runCli() {
  const [, , command, roundValue] = process.argv;
  const round = Number(roundValue);
  const root = process.cwd();
  const planPath = path.join(root, 'AGENTS', 'LEARNING', `round-${round}.plan.json`);
  if (command === 'plan') {
    const { plan } = await buildPlanFromWorkspace(root, round);
    await writeAtomic(planPath, `${JSON.stringify(plan, null, 2)}\n`);
    process.stdout.write(
      `Rodada ${round}: ${plan.score.display}; gate=${plan.gate}; ` +
        `HIGH=${plan.counts.HIGH}, MED=${plan.counts.MED}, LOW=${plan.counts.LOW}\n`,
    );
    return;
  }
  if (command === 'apply') {
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    const { paths } = await buildPlanFromWorkspace(root, round);
    const result = await applyLearningPlan(plan, paths);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  throw new Error('Uso: node scripts/post-round-learning.mjs <plan|apply> <rodada>');
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  runCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
