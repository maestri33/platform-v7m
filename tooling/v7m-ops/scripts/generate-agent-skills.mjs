#!/usr/bin/env node
/**
 * Agent Skills Discovery Index Generator (RFC v0.2.0)
 *
 * Scans canonical skill directories, computes SHA-256 digests of artifacts,
 * validates frontmatter against Agent Skills RFC v0.2.0, and generates
 * `/.well-known/agent-skills/index.json` and copies artifacts to web apps.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../..');

const SKILLS_SOURCE_DIR = resolve(REPO_ROOT, 'tooling/agent-skills');

const TARGET_DESTINATIONS = [
  resolve(REPO_ROOT, 'apps/landing-promotor/public/.well-known/agent-skills'),
  resolve(REPO_ROOT, 'apps/landing-supletivo/public/.well-known/agent-skills'),
  resolve(REPO_ROOT, 'apps/group/public/.well-known/agent-skills'),
  resolve(REPO_ROOT, 'apps/supletivo/public/.well-known/agent-skills'),
];

const SCHEMA_URI = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Parse simple YAML frontmatter from Markdown file.
 * @param {string} text
 * @returns {{ name?: string, description?: string }}
 */
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const metadata = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      metadata[key] = val;
    }
  }
  return metadata;
}

export async function generateSkillsIndex(options = {}) {
  const entries = await readdir(SKILLS_SOURCE_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const skills = [];
  const processedSkills = [];

  for (const skillName of skillDirs) {
    const skillPath = join(SKILLS_SOURCE_DIR, skillName, 'SKILL.md');
    let contentBuffer;
    try {
      contentBuffer = await readFile(skillPath);
    } catch {
      continue;
    }

    const text = contentBuffer.toString('utf-8');
    const frontmatter = parseFrontmatter(text);

    const name = frontmatter.name || skillName;
    const description = frontmatter.description || '';

    if (!NAME_REGEX.test(name) || name.length > 64) {
      throw new Error(`Invalid skill name "${name}" in ${skillPath}. Must match ${NAME_REGEX} and be <= 64 chars.`);
    }

    if (!description || description.length > 1024) {
      throw new Error(`Invalid skill description for "${name}". Must be 1-1024 characters.`);
    }

    const digest = `sha256:${createHash('sha256').update(contentBuffer).digest('hex')}`;
    const url = `/.well-known/agent-skills/${name}/SKILL.md`;

    skills.push({
      name,
      type: 'skill-md',
      description,
      url,
      digest,
    });

    processedSkills.push({
      name,
      contentBuffer,
      skillPath,
    });
  }

  const indexDocument = {
    $schema: SCHEMA_URI,
    skills,
  };

  const indexJsonContent = JSON.stringify(indexDocument, null, 2) + '\n';

  // Write to all target destinations
  for (const destDir of TARGET_DESTINATIONS) {
    await mkdir(destDir, { recursive: true });
    const indexPath = join(destDir, 'index.json');
    await writeFile(indexPath, indexJsonContent, 'utf-8');

    for (const skill of processedSkills) {
      const skillDestDir = join(destDir, skill.name);
      await mkdir(skillDestDir, { recursive: true });
      const destFile = join(skillDestDir, 'SKILL.md');
      await writeFile(destFile, skill.contentBuffer);
    }
  }

  if (!options.silent) {
    console.log(`[AgentSkills] Successfully generated index with ${skills.length} skills across ${TARGET_DESTINATIONS.length} targets.`);
  }

  return { indexDocument, processedSkills };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isVerify = process.argv.includes('--verify');
  generateSkillsIndex()
    .then(({ indexDocument }) => {
      if (isVerify) {
        if (!indexDocument.$schema || indexDocument.$schema !== SCHEMA_URI) {
          throw new Error(`Invalid $schema: ${indexDocument.$schema}`);
        }
        if (!Array.isArray(indexDocument.skills) || indexDocument.skills.length === 0) {
          throw new Error('Index must contain at least one skill.');
        }
        for (const skill of indexDocument.skills) {
          if (!skill.name || !skill.type || !skill.description || !skill.url || !skill.digest) {
            throw new Error(`Skill ${skill.name} is missing required v0.2.0 fields.`);
          }
          if (!skill.digest.startsWith('sha256:') || skill.digest.length !== 71) {
            throw new Error(`Skill ${skill.name} has invalid digest format: ${skill.digest}`);
          }
        }
        console.log('[AgentSkills] Verification passed: all RFC v0.2.0 checks satisfied.');
      }
    })
    .catch((err) => {
      console.error('[AgentSkills] Error:', err.message);
      process.exit(1);
    });
}
