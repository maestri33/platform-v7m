import { describe, it, expect } from "vitest";
import { testimonialsSupletivo } from "../../src/data/testimonials";

describe("Testimonials Supletivo — Compliance & Storytelling", () => {
  it("contém exatamente 5 personas brasileiras diversificadas", () => {
    expect(testimonialsSupletivo.length).toBe(5);
  });

  it("cada depoimento possui texto de impacto, designação com cidade/estado e imagem válida", () => {
    for (const t of testimonialsSupletivo) {
      expect(t.name.trim().length).toBeGreaterThan(3);
      expect(t.designation.trim().length).toBeGreaterThan(5);
      expect(t.quote.trim().length).toBeGreaterThan(50);
      expect(t.src).toMatch(/^(\/images\/testimonials\/|https:\/\/)/);
    }
  });

  it("respeita estritamente o sigilo institucional e diretrizes regulatórias", () => {
    const prohibitedTerms = [
      "100% online",
      "totalmente online",
      "parceria com",
      "instituição conveniada",
      "escola parceira",
      "comprar diploma",
      "sem estudar",
    ];

    for (const t of testimonialsSupletivo) {
      const fullText = `${t.name} ${t.designation} ${t.quote}`.toLowerCase();
      for (const term of prohibitedTerms) {
        expect(fullText).not.toContain(term.toLowerCase());
      }
    }
  });
});
