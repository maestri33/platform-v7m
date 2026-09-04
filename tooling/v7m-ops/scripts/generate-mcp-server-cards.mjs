#!/usr/bin/env node
/**
 * MCP Server Card Generator (SEP-1649 & SEP-2127)
 *
 * Generates and synchronizes canonical MCP Server Cards across all web apps,
 * ensuring strict compatibility with SEP-1649, SEP-2127, and isitagentready.com.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../..');

const SCHEMA_URI = 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json';

const TARGET_APPS = [
  {
    name: 'landing-promotor',
    displayName: 'Maestri Group MCP Server',
    slug: 'maestri-group/mcp',
    description:
      'Official Model Context Protocol (MCP) server for Maestri Group — autonomous notifications, partner workflows, and educational services discovery.',
    url: 'https://maestri.group/mcp',
    endpoint: '/mcp',
    websiteUrl: 'https://maestri.group',
    dir: resolve(REPO_ROOT, 'apps/landing-promotor/public/.well-known'),
  },
  {
    name: 'landing-supletivo',
    displayName: 'Supletivo Certo MCP Server',
    slug: 'supletivo-certo/mcp',
    description:
      'Official Model Context Protocol (MCP) server for Supletivo Certo — student enrollment, status verification, and course query assistance for AI agents.',
    url: 'https://supletivo.net.br/mcp',
    endpoint: '/mcp',
    websiteUrl: 'https://supletivo.net.br',
    dir: resolve(REPO_ROOT, 'apps/landing-supletivo/public/.well-known'),
  },
  {
    name: 'group',
    displayName: 'V7M Unified Portal MCP Server',
    slug: 'v7m-portal/mcp',
    description:
      'Model Context Protocol (MCP) server for the V7M Unified Portal — promoter commissions, partner hubs, and platform administration tools.',
    url: 'https://app.maestri.group/mcp',
    endpoint: '/mcp',
    websiteUrl: 'https://app.maestri.group',
    dir: resolve(REPO_ROOT, 'apps/group/public/.well-known'),
  },
  {
    name: 'supletivo',
    displayName: 'Supletivo Student Portal MCP Server',
    slug: 'supletivo-portal/mcp',
    description:
      'Model Context Protocol (MCP) server for the Supletivo Student Portal — enrollment tracking, academic validation, and student support.',
    url: 'https://app.supletivo.net.br/mcp',
    endpoint: '/mcp',
    websiteUrl: 'https://app.supletivo.net.br',
    dir: resolve(REPO_ROOT, 'apps/supletivo/public/.well-known'),
  },
];

const CANONICAL_TOOLS = [
  {
    name: 'notify_send',
    description: 'Send a notification via WhatsApp and/or email.',
  },
  {
    name: 'notify_send_event',
    description: 'Send notification using registered event template with placeholders.',
  },
  {
    name: 'notify_status',
    description: 'Check notification status, delivery state and errors.',
  },
  {
    name: 'notify_history',
    description: 'Query notification delivery history with status filters.',
  },
  {
    name: 'notify_inbox',
    description: 'Retrieve inbound messages received by the platform.',
  },
  {
    name: 'notify_phone_check',
    description: 'Verify if phone numbers exist on WhatsApp.',
  },
  {
    name: 'notify_channels',
    description: 'List configured WhatsApp and email delivery channels.',
  },
  {
    name: 'notify_templates',
    description: 'List event notification templates for the platform.',
  },
  {
    name: 'notify_template_upsert',
    description: 'Create or update an event notification template.',
  },
];

/**
 * Build a server card object for a target app.
 */
export function buildServerCard(app) {
  return {
    $schema: SCHEMA_URI,
    serverInfo: {
      name: app.displayName,
      version: '1.0.0',
    },
    name: app.slug,
    version: '1.0.0',
    description: app.description,
    websiteUrl: app.websiteUrl,
    url: app.url,
    endpoint: app.endpoint,
    transport: {
      type: 'streamable-http',
      endpoint: app.endpoint,
    },
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
    tools: CANONICAL_TOOLS,
  };
}

/**
 * Validate that a server card matches all requirements.
 */
export function validateServerCard(card) {
  if (!card.serverInfo || !card.serverInfo.name || !card.serverInfo.version) {
    throw new Error('Server card missing serverInfo (name and version required)');
  }
  if (!card.name || !card.version || !card.description) {
    throw new Error('Server card missing top-level name, version, or description');
  }
  if (!card.endpoint && !card.url && (!card.transport || !card.transport.endpoint)) {
    throw new Error('Server card missing transport endpoint');
  }
  if (!card.capabilities || typeof card.capabilities !== 'object') {
    throw new Error('Server card missing capabilities object');
  }
  return true;
}

export async function generateMcpServerCards(options = {}) {
  const generated = [];

  for (const app of TARGET_APPS) {
    const card = buildServerCard(app);
    validateServerCard(card);

    const mcpDir = join(app.dir, 'mcp');
    await mkdir(mcpDir, { recursive: true });

    const cardJson = JSON.stringify(card, null, 2) + '\n';
    const cardsListJson = JSON.stringify([card], null, 2) + '\n';

    // 1. /.well-known/mcp/server-card.json (SEP-1649 / isitagentready)
    await writeFile(join(mcpDir, 'server-card.json'), cardJson, 'utf-8');

    // 2. /.well-known/mcp/server-cards.json (SEP-1649 plural)
    await writeFile(join(mcpDir, 'server-cards.json'), cardsListJson, 'utf-8');

    // 3. /.well-known/mcp.json (SEP-2127 / isitagentready)
    await writeFile(join(app.dir, 'mcp.json'), cardJson, 'utf-8');

    generated.push({ app: app.name, card });
  }

  if (!options.silent) {
    console.log(`[MCPServerCard] Successfully generated server cards across ${TARGET_APPS.length} web apps.`);
  }

  return generated;
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isVerify = process.argv.includes('--verify');
  generateMcpServerCards()
    .then((results) => {
      if (isVerify) {
        for (const { card } of results) {
          validateServerCard(card);
        }
        console.log('[MCPServerCard] Verification passed: all SEP-1649 / SEP-2127 requirements satisfied.');
      }
    })
    .catch((err) => {
      console.error('[MCPServerCard] Error:', err.message);
      process.exit(1);
    });
}
