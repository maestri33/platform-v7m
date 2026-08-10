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
        (el) => parseFloat(el.style.opacity || "0") > 0.6,
      );
      return c?.querySelector(".sw-copy__title")?.textContent ?? null;
    });
    if (visivel) titulosVistos.add(visivel);
  }

  // as 7 cenas têm título; todas precisam ter aparecido em algum ponto
  expect(titulosVistos.size).toBe(7);
  expect([...titulosVistos]).toContain("O que Deus está levantando");
});

test("CTAs finais apontam pro WhatsApp e pro Maps", async ({ page }) => {
  const total = await mountAndMeasure(page);
  await page.evaluate((y) => window.scrollTo(0, y), total);
  await page.waitForTimeout(400);

  const primary = page.locator(".sw-copy__cta .sw-btn--primary");
  const secondary = page.locator(".sw-copy__cta .sw-btn--ghost");
  await expect(primary).toHaveAttribute("href", WHATSAPP);
  await expect(secondary).toHaveAttribute("href", MAPS);
});

test("CTA final fica inteiro dentro da viewport", async ({ page }) => {
  // regressão real: em paisagem de celular os botões caíam abaixo da dobra
  // numa camada fixed, sem scroll que recuperasse
  const total = await mountAndMeasure(page);
  await page.evaluate((y) => window.scrollTo(0, y), total);
  await page.waitForTimeout(400);

  const box = await page.locator(".sw-copy__cta .sw-btn--primary").boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh);
});

test("nenhuma cena de copy é cortada pelo topo da tela", async ({ page }) => {
  const total = await mountAndMeasure(page);
  for (const frac of [0, 0.25, 0.5, 0.75, 0.99]) {
    await page.evaluate((y) => window.scrollTo(0, y), total * frac);
    await page.waitForTimeout(250);
    const top = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>(".sw-copy")].find(
        (el) => parseFloat(el.style.opacity || "0") > 0.6,
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
