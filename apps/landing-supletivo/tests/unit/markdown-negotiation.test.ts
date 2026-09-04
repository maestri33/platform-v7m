import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, estimateTokens } from '../../integrations/markdown-negotiation.mjs';

describe('Markdown Content Negotiation (Supletivo) — htmlToMarkdown', () => {
  it('converts Supletivo HTML into clean Markdown without tags', () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Supletivo EJA Online</title>
          <meta name="description" content="Conclua seus estudos do ensino médio online." />
        </head>
        <body>
          <h1>Termine o Ensino Médio</h1>
          <p>Certificado reconhecido pelo <strong>MEC</strong> em até 6 meses.</p>
          <h2>Vantagens</h2>
          <ul>
            <li>Estude no seu ritmo</li>
            <li>Suporte pedagógico via WhatsApp</li>
          </ul>
          <a href="https://supletivo.net.br/matricula">Matricule-se agora</a>
        </body>
      </html>
    `;

    const markdown = htmlToMarkdown(html, 'https://supletivo.net.br/');

    expect(markdown).toContain('title: "Supletivo EJA Online"');
    expect(markdown).toContain('description: "Conclua seus estudos do ensino médio online."');
    expect(markdown).toContain('# Termine o Ensino Médio');
    expect(markdown).toContain('reconhecido pelo **MEC**');
    expect(markdown).toContain('## Vantagens');
    expect(markdown).toContain('- Estude no seu ritmo');
    expect(markdown).toContain('[Matricule-se agora](https://supletivo.net.br/matricula)');
  });

  it('calculates token estimation accurately', () => {
    const text = '# Termine o Ensino Médio\n\nCertificado MEC';
    const tokens = estimateTokens(text);
    expect(tokens).toBe(Math.ceil(text.length / 4));
    expect(tokens).toBeGreaterThan(5);
  });
});
