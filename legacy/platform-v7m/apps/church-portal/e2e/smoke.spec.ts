import { expect, test } from "@playwright/test";

// Contrato do produto: o que precisa estar de pé em qualquer dispositivo.
// Roda nos 3 projects (desktop, mobile, mobile-landscape).

const WHATSAPP = "https://wa.me/5542999384069";
const MAPS = "https://maps.app.goo.gl/nKgD83xmGetsyDzKA";

/** Espera a engine montar e devolve a altura rolável da experiência. */
async function mountAndMeasure(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator(".sw-root")).toBeAttached({ timeout: 20_000 });
  await expect(page.locator(".sw-scene")).toHaveCount(7);
  return page.evaluate(() => {
    const track = document.querySelector<HTMLElement>(".sw-track");
    return (track?.offsetHeight ?? 0) - window.innerHeight;
  });
}

test("engine monta com as 7 cenas e a página é rolável", async ({ page }) => {
  const scrollable = await mountAndMeasure(page);
  expect(scrollable).toBeGreaterThan(1000);
});

test("copy de cada cena aparece ao percorrer a página", async ({ page }) => {
  const total = await mountAndMeasure(page);
  const titulosVistos = new Set<string>();

  for (let i = 0; i <= 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), (total * i) / 20);
    await page.waitForTimeout(120);
    const visivel = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>(".sw-copy")].find(
        (el) => {
          const cs = getComputedStyle(el);
          return (
            parseFloat(cs.opacity) > 0.6 &&
            cs.visibility === "visible" &&
            cs.display !== "none"
          );
        },
      );
      return c?.querySelector(".sw-copy__title")?.textContent ?? null;
    });
    if (visivel) titulosVistos.add(visivel);
  }

  // as 7 cenas têm título; todas precisam ter aparecido em algum ponto
  expect(titulosVistos.size).toBe(7);
  expect([...titulosVistos]).toContain("O que Deus está levantando");
});

test("CTAs finais: visíveis, na viewport e o clique dispara de verdade", async ({
  page,
  context,
}) => {
  // href certo não basta: a sabotagem provou que a suíte passava com o CTA
  // visibility:hidden e com pointer-events:none (visível mas morto ao toque).
  const total = await mountAndMeasure(page);
  await page.evaluate((y) => window.scrollTo(0, y), total);
  await page.waitForTimeout(600);

  const primary = page.locator(".sw-copy__cta .sw-btn--primary");
  const secondary = page.locator(".sw-copy__cta .sw-btn--ghost");
  await expect(primary).toHaveAttribute("href", WHATSAPP);
  await expect(secondary).toHaveAttribute("href", MAPS);
  await expect(primary).toBeVisible();
  await expect(secondary).toBeVisible();
  await expect(primary).toBeInViewport({ ratio: 1 });

  // clique REAL: intercepta a navegação pro wa.me antes de sair da página
  let chegouNoWhatsApp = false;
  await context.route("**wa.me/**", (route) => {
    chegouNoWhatsApp = true;
    return route.abort();
  });
  const popup = context.waitForEvent("page", { timeout: 5000 }).catch(() => null);
  await primary.click();
  await popup;
  await page.waitForTimeout(500);
  // navegação na mesma aba OU popup — qualquer um prova o clique vivo
  const navegou =
    chegouNoWhatsApp || page.url().includes("wa.me");
  expect(navegou, "o tap no CTA precisa disparar a navegação").toBe(true);
});

test("CTA final fica inteiro dentro da viewport em toda a cena", async ({
  page,
}) => {
  // regressão real: os botões caíam abaixo da dobra numa camada fixed, sem
  // scroll que recuperasse. Mede em VÁRIOS pontos da cena: o parallax de ±2vh
  // faz o fim do scroll ser o ponto mais folgado — medir só ali mascara.
  const total = await mountAndMeasure(page);
  const vh = page.viewportSize()!.height;

  for (const frac of [0.88, 0.92, 0.96, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y), total * frac);
    await page.waitForTimeout(350);
    const visivel = await page.evaluate(
      () =>
        parseFloat(
          (
            document.querySelector<HTMLElement>(".sw-copy:last-of-type") ??
            document.createElement("div")
          ).style.opacity || "0",
        ) > 0.5,
    );
    if (!visivel) continue;
    const box = await page
      .locator(".sw-copy__cta .sw-btn--primary")
      .boundingBox();
    expect(box, `CTA em ${Math.round(frac * 100)}% do scroll`).not.toBeNull();
    expect(box!.y, `topo do CTA em ${Math.round(frac * 100)}%`).toBeGreaterThanOrEqual(0);
    expect(
      box!.y + box!.height,
      `base do CTA em ${Math.round(frac * 100)}%`,
    ).toBeLessThanOrEqual(vh);
  }
});

test("bloco de copy cabe na tela em todas as cenas", async ({ page }) => {
  // o bug da centralização não aparecia no CTA (parallax compensava) mas
  // cortava as tags do DNA — varre a página inteira medindo a caixa toda
  const total = await mountAndMeasure(page);
  const vh = page.viewportSize()!.height;
  const estouros: string[] = [];

  for (let i = 0; i <= 24; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), (total * i) / 24);
    await page.waitForTimeout(140);
    const r = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>(".sw-copy")].find(
        (el) => {
          const cs = getComputedStyle(el);
          return (
            parseFloat(cs.opacity) > 0.6 &&
            cs.visibility === "visible" &&
            cs.display !== "none"
          );
        },
      );
      if (!c) return null;
      const b = c.getBoundingClientRect();
      const t = c.querySelector(".sw-copy__title")?.textContent ?? "?";
      return { top: b.top, bottom: b.bottom, titulo: t };
    });
    if (!r) continue;
    if (r.bottom > vh + 1 || r.top < -1)
      estouros.push(`${r.titulo}: top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} (vh ${vh})`);
  }

  expect(estouros).toEqual([]);
});

test("nenhuma cena de copy é cortada pelo topo da tela", async ({ page }) => {
  const total = await mountAndMeasure(page);
  for (const frac of [0, 0.25, 0.5, 0.75, 0.99]) {
    await page.evaluate((y) => window.scrollTo(0, y), total * frac);
    await page.waitForTimeout(250);
    const top = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>(".sw-copy")].find(
        (el) => {
          const cs = getComputedStyle(el);
          return (
            parseFloat(cs.opacity) > 0.6 &&
            cs.visibility === "visible" &&
            cs.display !== "none"
          );
        },
      );
      return c ? c.getBoundingClientRect().top : 999;
    });
    expect(top, `cena em ${frac * 100}% do scroll`).toBeGreaterThanOrEqual(0);
  }
});

test("sem rolagem horizontal", async ({ page }) => {
  await mountAndMeasure(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
});

test("rail de navegação: 7 destinos nomeados e clicáveis", async ({ page }) => {
  await mountAndMeasure(page);
  const dots = page.locator(".sw-route__dot");
  await expect(dots).toHaveCount(7);

  // nome acessível (o label some visualmente no mobile, mas fica na árvore)
  for (const nome of ["Decolagem", "O sonho", "Visite"]) {
    await expect(
      page.locator(`.sw-route__dot:has-text("${nome}")`),
    ).toHaveCount(1);
  }

  // hit-test: nenhum dot pode estar coberto por outra camada (a topbar cobria
  // os 2 primeiros em paisagem)
  const alcancaveis = await page.evaluate(() => {
    const ds = [...document.querySelectorAll<HTMLElement>(".sw-route__dot")];
    return ds.filter((d) => {
      const r = d.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.round(r.left + r.width / 2),
        Math.round(r.top + r.height / 2),
      );
      return hit !== null && (hit === d || d.contains(hit));
    }).length;
  });
  expect(alcancaveis).toBe(7);
});

test("clicar num destino navega pra cena correspondente", async ({ page }) => {
  await mountAndMeasure(page);
  await page.locator('.sw-route__dot:has-text("Cultos")').click();
  await page.waitForTimeout(1200);
  const ativo = await page
    .locator('[aria-current="true"]')
    .first()
    .textContent();
  expect(ativo).toContain("Cultos");
});
