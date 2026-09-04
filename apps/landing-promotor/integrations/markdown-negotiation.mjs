// @ts-check
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * Estimates LLM token count for given text.
 * Standard heuristic: ~4 characters per token in UTF-8.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Converts raw HTML into clean, semantic Markdown stripped of scripts, styles, and tags.
 * @param {string} html
 * @param {string} [urlStr]
 * @returns {string}
 */
export function htmlToMarkdown(html, urlStr = '') {
  let text = html;

  // 1. Remove non-content tags & blocks
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // 2. Extract metadata
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // 3. Headings
  text = text.replace(/<h1\b[^>]*>(.*?)<\/h1>/gis, (_, c) => `\n\n# ${c.trim()}\n\n`);
  text = text.replace(/<h2\b[^>]*>(.*?)<\/h2>/gis, (_, c) => `\n\n## ${c.trim()}\n\n`);
  text = text.replace(/<h3\b[^>]*>(.*?)<\/h3>/gis, (_, c) => `\n\n### ${c.trim()}\n\n`);
  text = text.replace(/<h4\b[^>]*>(.*?)<\/h4>/gis, (_, c) => `\n\n#### ${c.trim()}\n\n`);
  text = text.replace(/<h5\b[^>]*>(.*?)<\/h5>/gis, (_, c) => `\n\n##### ${c.trim()}\n\n`);
  text = text.replace(/<h6\b[^>]*>(.*?)<\/h6>/gis, (_, c) => `\n\n###### ${c.trim()}\n\n`);

  // 4. Paragraphs and breaks
  text = text.replace(/<p\b[^>]*>(.*?)<\/p>/gis, (_, c) => `\n\n${c.trim()}\n\n`);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // 5. Lists
  text = text.replace(/<li\b[^>]*>(.*?)<\/li>/gis, (_, c) => `\n- ${c.trim()}`);
  text = text.replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n');

  // 6. Links and inline formatting
  text = text.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, (_, href, content) => {
    const cleanContent = content.replace(/<[^>]+>/g, '').trim();
    if (!cleanContent) return '';
    return `[${cleanContent}](${href})`;
  });
  text = text.replace(/<(strong|b)\b[^>]*>(.*?)<\/\1>/gis, '**$2**');
  text = text.replace(/<(em|i)\b[^>]*>(.*?)<\/\1>/gis, '*$2*');
  text = text.replace(/<code\b[^>]*>(.*?)<\/code>/gis, '`$1`');
  text = text.replace(/<blockquote\b[^>]*>(.*?)<\/blockquote>/gis, (_, c) => `\n> ${c.trim()}\n`);

  // 7. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 8. Decode HTML entities
  text = text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  // 9. Normalize spacing
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
  text = text.trim();

  // 10. Frontmatter
  let frontmatter = '';
  if (title || description) {
    frontmatter = `---\n`;
    if (title) frontmatter += `title: "${title.replace(/"/g, '\\"')}"\n`;
    if (description) frontmatter += `description: "${description.replace(/"/g, '\\"')}"\n`;
    if (urlStr) frontmatter += `url: "${urlStr}"\n`;
    frontmatter += `---\n\n`;
  }

  return frontmatter + text + '\n';
}

const WORKER_SCRIPT = `/**
 * Cloudflare Pages Advanced Mode Worker
 * HTTP Content Negotiation for Markdown for Agents
 * Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 * Skill: https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md
 */

function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function htmlToMarkdown(html, urlStr) {
  let text = html;
  text = text.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
  text = text.replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '');
  text = text.replace(/<noscript\\b[^<]*(?:(?!<\\/noscript>)<[^<]*)*<\\/noscript>/gi, '');
  text = text.replace(/<svg\\b[^<]*(?:(?!<\\/svg>)<[^<]*)*<\\/svg>/gi, '');

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  text = text.replace(/<h1\\b[^>]*>(.*?)<\\/h1>/gis, (_, c) => '\\n\\n# ' + c.trim() + '\\n\\n');
  text = text.replace(/<h2\\b[^>]*>(.*?)<\\/h2>/gis, (_, c) => '\\n\\n## ' + c.trim() + '\\n\\n');
  text = text.replace(/<h3\\b[^>]*>(.*?)<\\/h3>/gis, (_, c) => '\\n\\n### ' + c.trim() + '\\n\\n');
  text = text.replace(/<h4\\b[^>]*>(.*?)<\\/h4>/gis, (_, c) => '\\n\\n#### ' + c.trim() + '\\n\\n');
  text = text.replace(/<h5\\b[^>]*>(.*?)<\\/h5>/gis, (_, c) => '\\n\\n##### ' + c.trim() + '\\n\\n');
  text = text.replace(/<h6\\b[^>]*>(.*?)<\\/h6>/gis, (_, c) => '\\n\\n###### ' + c.trim() + '\\n\\n');

  text = text.replace(/<p\\b[^>]*>(.*?)<\\/p>/gis, (_, c) => '\\n\\n' + c.trim() + '\\n\\n');
  text = text.replace(/<br\\s*\\/?>/gi, '\\n');
  text = text.replace(/<hr\\s*\\/?>/gi, '\\n\\n---\\n\\n');

  text = text.replace(/<li\\b[^>]*>(.*?)<\\/li>/gis, (_, c) => '\\n- ' + c.trim());
  text = text.replace(/<\\/?(ul|ol)\\b[^>]*>/gi, '\\n');

  text = text.replace(/<a\\b[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>/gis, (_, href, content) => {
    const clean = content.replace(/<[^>]+>/g, '').trim();
    if (!clean) return '';
    return '[' + clean + '](' + href + ')';
  });

  text = text.replace(/<(strong|b)\\b[^>]*>(.*?)<\\/\\1>/gis, '**$2**');
  text = text.replace(/<(em|i)\\b[^>]*>(.*?)<\\/\\1>/gis, '*$2*');
  text = text.replace(/<code\\b[^>]*>(.*?)<\\/code>/gis, '\`$1\`');
  text = text.replace(/<blockquote\\b[^>]*>(.*?)<\\/blockquote>/gis, (_, c) => '\\n> ' + c.trim() + '\\n');

  text = text.replace(/<[^>]+>/g, '');

  text = text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  text = text.replace(/[ \\t]+/g, ' ');
  text = text.replace(/\\n\\s*\\n\\s*\\n+/g, '\\n\\n');
  text = text.trim();

  let frontmatter = '';
  if (title || description) {
    frontmatter = '---\\n';
    if (title) frontmatter += 'title: "' + title.replace(/"/g, '\\\\"') + '"\\n';
    if (description) frontmatter += 'description: "' + description.replace(/"/g, '\\\\"') + '"\\n';
    if (urlStr) frontmatter += 'url: "' + urlStr + '"\\n';
    frontmatter += '---\\n\\n';
  }

  return frontmatter + text + '\\n';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const accept = request.headers.get("Accept") || "";

    const wantsMarkdown = accept.split(",").some((part) => {
      const mime = part.trim().split(";")[0].toLowerCase();
      return mime === "text/markdown";
    });

    if (wantsMarkdown) {
      const pathname = url.pathname;
      const candidates = [];
      if (pathname === "/" || pathname === "") {
        candidates.push("/index.md");
      } else {
        const clean = pathname.replace(/\\/+$/, "");
        candidates.push(clean + ".md");
        candidates.push(clean + "/index.md");
      }

      for (const candidate of candidates) {
        const mdUrl = new URL(candidate, request.url);
        try {
          const mdRes = await env.ASSETS.fetch(new Request(mdUrl, request));
          if (mdRes.ok) {
            const body = await mdRes.text();
            const tokens = estimateTokens(body);
            const headers = new Headers(mdRes.headers);
            headers.set("Content-Type", "text/markdown; charset=utf-8");
            headers.set("Vary", "Accept");
            headers.set("x-markdown-tokens", String(tokens));
            return new Response(body, {
              status: 200,
              statusText: "OK",
              headers,
            });
          }
        } catch (_) {}
      }

      try {
        const htmlRes = await env.ASSETS.fetch(request);
        const contentType = htmlRes.headers.get("content-type") || "";
        if (htmlRes.ok && contentType.includes("text/html")) {
          const html = await htmlRes.text();
          const md = htmlToMarkdown(html, url.href);
          const tokens = estimateTokens(md);
          const headers = new Headers(htmlRes.headers);
          headers.set("Content-Type", "text/markdown; charset=utf-8");
          headers.set("Vary", "Accept");
          headers.set("x-markdown-tokens", String(tokens));
          return new Response(md, {
            status: 200,
            statusText: "OK",
            headers,
          });
        }
      } catch (_) {}
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const existingVary = headers.get("Vary");
    if (existingVary) {
      if (!existingVary.toLowerCase().includes("accept")) {
        headers.set("Vary", existingVary + ", Accept");
      }
    } else {
      headers.set("Vary", "Accept");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
`;

const ROUTES_CONFIG = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/_astro/*',
    '/assets/*',
    '/fonts/*',
    '/*.png',
    '/*.jpg',
    '/*.jpeg',
    '/*.gif',
    '/*.svg',
    '/*.ico',
    '/*.webp',
    '/*.webmanifest',
    '/*.woff',
    '/*.woff2',
    '/*.ttf',
  ],
};

/**
 * Astro integration to enable Content Negotiation for Markdown for Agents.
 * @returns {import('astro').AstroIntegration}
 */
export default function markdownNegotiation() {
  /** @type {string | undefined} */
  let site;

  return {
    name: 'markdown-negotiation',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
      },
      'astro:server:setup': ({ server }) => {
        // Intercept Accept: text/markdown requests in dev server
        server.middlewares.use(async (req, res, next) => {
          const accept = req.headers['accept'] || '';
          const wantsMarkdown = accept.split(',').some((p) => {
            const mime = p.trim().split(';')[0].toLowerCase();
            return mime === 'text/markdown';
          });

          if (!wantsMarkdown) {
            return next();
          }

          const originalEnd = res.end.bind(res);
          const originalWrite = res.write.bind(res);
          let chunks = [];

          // @ts-ignore
          res.write = function (chunk, ...args) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
          };

          // @ts-ignore
          res.end = function (chunk, ...args) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            const bodyBuffer = Buffer.concat(chunks);
            const contentType = String(res.getHeader('content-type') || '');

            if (contentType.includes('text/html')) {
              const html = bodyBuffer.toString('utf-8');
              const url = (site || 'http://localhost') + (req.url || '/');
              const markdown = htmlToMarkdown(html, url);
              const tokens = estimateTokens(markdown);

              res.setHeader('content-type', 'text/markdown; charset=utf-8');
              res.setHeader('vary', 'Accept');
              res.setHeader('x-markdown-tokens', String(tokens));
              res.setHeader('content-length', Buffer.byteLength(markdown));
              return originalEnd(markdown, 'utf-8');
            }

            return originalEnd(bodyBuffer);
          };

          next();
        });
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        const baseDir = fileURLToPath(dir);
        const baseUrl = site ? (site.endsWith('/') ? site : `${site}/`) : 'https://maestri.group/';
        const llmsPages = [];

        for (const page of pages) {
          const pathname = page.pathname;
          const htmlFilePath = pathname === '' || pathname === '/'
            ? join(baseDir, 'index.html')
            : join(baseDir, pathname, 'index.html');

          try {
            const html = await readFile(htmlFilePath, 'utf-8');
            const pageUrl = `${baseUrl}${pathname}`;
            const markdown = htmlToMarkdown(html, pageUrl);

            const mdDir = pathname === '' || pathname === '/' ? baseDir : join(baseDir, pathname);
            await mkdir(mdDir, { recursive: true });
            const mdFilePath = join(mdDir, 'index.md');
            await writeFile(mdFilePath, markdown, 'utf-8');

            if (pathname && pathname !== '/') {
              const flatMdPath = join(baseDir, `${pathname.replace(/\/+$/, '')}.md`);
              await writeFile(flatMdPath, markdown, 'utf-8');
            }

            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : pathname || 'Página Inicial';
            const pageMdUrl = `${baseUrl}${pathname ? pathname.replace(/\/+$/, '') + '/index.md' : 'index.md'}`;
            llmsPages.push(`- [${title}](${pageMdUrl})`);
          } catch (err) {
            logger.warn(`Não foi possível converter ${htmlFilePath} para Markdown: ${err}`);
          }
        }

        const llmsTxtContent = `# ${site || 'V7M Platform'}\n\n> Documentação e páginas do site em Markdown para consumo direto por agentes de IA.\n\n## Páginas Disponíveis\n\n${llmsPages.join('\n')}\n`;
        await writeFile(join(baseDir, 'llms.txt'), llmsTxtContent, 'utf-8');
        logger.info('llms.txt gerado com sucesso.');

        await writeFile(join(baseDir, '_worker.js'), WORKER_SCRIPT, 'utf-8');
        await writeFile(join(baseDir, '_routes.json'), JSON.stringify(ROUTES_CONFIG, null, 2), 'utf-8');
        logger.info('Cloudflare Pages _worker.js e _routes.json gerados para negociação de conteúdo.');
      },
    },
  };
}
