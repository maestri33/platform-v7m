import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, estimateTokens } from '../../integrations/markdown-negotiation.mjs';

describe('Markdown Content Negotiation — htmlToMarkdown', () => {
  it('converts basic HTML elements into clean, formatting-stripped Markdown', () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Test Page Title</title>
          <meta name="description" content="A page for testing markdown conversion." />
        </head>
        <body>
          <header><nav><a href="/home">Home</a></nav></header>
          <h1>Main Heading</h1>
          <p>This is a paragraph with <strong>bold text</strong>, <em>italic text</em>, and a <a href="https://example.com">link</a>.</p>
          <h2>Subheading</h2>
          <ul>
            <li>First item</li>
            <li>Second item with <code>inline code</code></li>
          </ul>
          <script>console.log("secret code");</script>
          <style>.hidden { display: none; }</style>
          <svg><path d="M0 0h10v10H0z"/></svg>
        </body>
      </html>
    `;

    const markdown = htmlToMarkdown(html, 'https://maestri.group/test');

    // Should include frontmatter
    expect(markdown).toContain('---');
    expect(markdown).toContain('title: "Test Page Title"');
    expect(markdown).toContain('description: "A page for testing markdown conversion."');
    expect(markdown).toContain('url: "https://maestri.group/test"');

    // Should include converted markdown
    expect(markdown).toContain('# Main Heading');
    expect(markdown).toContain('## Subheading');
    expect(markdown).toContain('**bold text**');
    expect(markdown).toContain('*italic text*');
    expect(markdown).toContain('[link](https://example.com)');
    expect(markdown).toContain('- First item');
    expect(markdown).toContain('- Second item with `inline code`');

    // Should strip scripts, styles, svg
    expect(markdown).not.toContain('console.log');
    expect(markdown).not.toContain('display: none');
    expect(markdown).not.toContain('<svg');
    expect(markdown).not.toContain('<script');
    expect(markdown).not.toContain('<style');
  });

  it('decodes HTML entities properly', () => {
    const html = `<p>&quot;Hello &amp; Welcome&#39; to V7M&nbsp;&lt;Platform&gt;!&quot;</p>`;
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain('"Hello & Welcome\' to V7M <Platform>!"');
  });
});

describe('Markdown Content Negotiation — estimateTokens', () => {
  it('estimates ~4 characters per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('12345678')).toBe(2);
    expect(estimateTokens('Hello world, this is a test string for token estimation.')).toBeGreaterThan(10);
  });
});

describe('Markdown Content Negotiation — Worker & Header Simulation', () => {
  it('detects text/markdown in complex Accept headers', () => {
    const isMarkdown = (acceptHeader: string) =>
      acceptHeader.split(',').some((p) => {
        const mime = p.trim().split(';')[0].toLowerCase();
        return mime === 'text/markdown';
      });

    expect(isMarkdown('text/markdown')).toBe(true);
    expect(isMarkdown('text/markdown; q=0.9, text/html; q=0.8')).toBe(true);
    expect(isMarkdown('text/html, application/xhtml+xml, text/markdown;q=0.5')).toBe(true);
    expect(isMarkdown('text/html, application/xhtml+xml, */*')).toBe(false);
    expect(isMarkdown('')).toBe(false);
  });

  it('ensures headers match isitagentready.com specification', () => {
    const headers = new Headers();
    headers.set('Content-Type', 'text/markdown; charset=utf-8');
    headers.set('Vary', 'Accept');
    headers.set('x-markdown-tokens', String(estimateTokens('# Test')));

    expect(headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(headers.get('Vary')).toContain('Accept');
    expect(headers.get('x-markdown-tokens')).toBe('2');
  });
});
