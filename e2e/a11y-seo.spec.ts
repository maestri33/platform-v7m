import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("acessibilidade", () => {
  test("axe sem violações sérias na experiência montada", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const graves = violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nó(s)`),
    ).toEqual([]);
  });

  test("exatamente um h1 ativo e landmark main presente", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 20_000 });
    await page.waitForTimeout(800);

    const estrutura = await page.evaluate(() => ({
      h1Ativos: [...document.querySelectorAll("h1")].filter(
        (h) => !h.closest("[inert]"),
      ).length,
      main: document.querySelectorAll("main").length,
      fallbackInerte: !!document.querySelector(".sw-fallback[inert]"),
    }));

    expect(estrutura.h1Ativos).toBe(1);
    expect(estrutura.main).toBe(1);
    expect(estrutura.fallbackInerte).toBe(true);
  });

  test("hover não move nada em dispositivo de toque", async ({
    page,
  }, testInfo) => {
    // standard de animação: no touch o tap dispara um hover falso que gruda
    // até o próximo toque. Mede o EFEITO (transform computado com :hover
    // forçado), não a existência da regra — override que neutraliza vale.
    test.skip(testInfo.project.name === "desktop", "regra vale pro touch");
    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 20_000 });
    await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>(".sw-track")!;
      window.scrollTo(0, track.offsetHeight); // cena final: onde vivem os CTAs
    });
    await page.waitForTimeout(600);

    const client = await page.context().newCDPSession(page);
    await client.send("DOM.enable");
    await client.send("CSS.enable");
    const { root } = (await client.send("DOM.getDocument")) as {
      root: { nodeId: number };
    };

    const movidos: string[] = [];
    for (const seletor of [".sw-btn--primary", ".sw-btn--ghost", ".sw-route__dot"]) {
      const { nodeId } = (await client.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: seletor,
      })) as { nodeId: number };
      if (!nodeId) continue;

      const antes = await page.evaluate(
        (s) => getComputedStyle(document.querySelector(s)!).transform,
        seletor,
      );
      await client.send("CSS.forcePseudoState", {
        nodeId,
        forcedPseudoClasses: ["hover"],
      });
      const depois = await page.evaluate(
        (s) => getComputedStyle(document.querySelector(s)!).transform,
        seletor,
      );
      await client.send("CSS.forcePseudoState", {
        nodeId,
        forcedPseudoClasses: [],
      });
      if (antes !== depois) movidos.push(`${seletor}: ${antes} -> ${depois}`);
    }

    expect(movidos, "elementos que se movem no hover falso do toque").toEqual(
      [],
    );
  });

  test("reduced-motion não carrega vídeo nenhum", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const clipes: string[] = [];
    page.on("response", (r) => {
      if (new URL(r.url()).pathname.endsWith(".mp4")) clipes.push(r.url());
    });

    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 20_000 });
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(2500);

    expect(clipes, "sob reduced-motion a engine fica só nos stills").toEqual([]);
    await ctx.close();
  });
});

test.describe("SEO e caminhos degradados", () => {
  test("HTML servido carrega os fatos da igreja sem JS", async ({ page }) => {
    const html = await (await page.request.get("/")).text();
    expect(html).toContain("Paulina Oliveira Gomes");
    expect(html).toContain("Domingo 19h");
    expect(html).toContain("wa.me/5542999384069");
    expect(html).toContain('"@type":["Church","Organization"]');
    expect(html).toMatch(/<link[^>]+rel="canonical"/);
  });

  test("sem JS o fallback vira a página visível", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");

    const fb = page.locator(".sw-fallback");
    await expect(fb).toBeVisible();
    await expect(fb).toContainText("Paulina Oliveira Gomes");
    await expect(fb.locator("a[href^='https://wa.me']")).toBeVisible();
    await ctx.close();
  });

  test("404 tem título próprio e volta pro voo", async ({ page }) => {
    const resp = await page.goto("/rota-que-nao-existe");
    expect(resp?.status()).toBe(404);
    await expect(page).toHaveTitle(/não encontrada/i);
    await expect(page.locator("a[href='/']")).toBeVisible();
  });

  test("robots e sitemap respondem", async ({ page }) => {
    const robots = await page.request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap");

    const sitemap = await page.request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
  });
});
