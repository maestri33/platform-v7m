import { expect, test } from "@playwright/test";

// O teste que faltava: o travamento no celular foi reportado por humano, não
// pela suíte. Aqui o scroll é dirigido com CPU estrangulada e o custo é medido
// pelo próprio compositor (frames + long tasks), não por impressão.
test.describe("performance de scrub no celular", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "CDP throttling só no chromium",
  );

  test("scroll contínuo sem travar com CPU 4x mais lenta", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "cenário é o aparelho de mão",
    );
    test.setTimeout(120_000);

    const client = await page.context().newCDPSession(page);
    // celular mediano ≈ 4x mais lento que o runner
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 30_000 });
    await page.waitForTimeout(2500); // deixa o primeiro clipe assentar

    const metrics = await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const longTasks: number[] = [];
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) longTasks.push(Math.round(e.duration));
        }).observe({ entryTypes: ["longtask"] });
      } catch {
        /* navegador sem longtask observer */
      }

      const deltas: number[] = [];
      let last = performance.now();
      let rodando = true;
      const tick = (t: number) => {
        deltas.push(t - last);
        last = t;
        if (rodando) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      const track = document.querySelector<HTMLElement>(".sw-track")!;
      const total = track.offsetHeight - window.innerHeight;
      const inicio = performance.now();
      const DURACAO = 8000; // percorre a página inteira como um polegar
      while (performance.now() - inicio < DURACAO) {
        const p = (performance.now() - inicio) / DURACAO;
        window.scrollTo(0, total * p);
        await sleep(16);
      }
      rodando = false;
      await sleep(200);

      const uteis = deltas.slice(1);
      const ordenados = [...uteis].sort((a, b) => a - b);
      const p95 = ordenados[Math.floor(ordenados.length * 0.95)] ?? 0;
      return {
        frames: uteis.length,
        p95: Math.round(p95),
        pior: Math.round(ordenados.at(-1) ?? 0),
        travadosPct: Math.round(
          (100 * uteis.filter((d) => d > 50).length) / uteis.length,
        ),
        longTaskMax: longTasks.length ? Math.max(...longTasks) : 0,
        longTasks: longTasks.length,
      };
    });

    testInfo.annotations.push({
      type: "perf",
      description: JSON.stringify(metrics),
    });

    // o rAF precisa continuar rodando: contagem baixa = main thread bloqueada
    expect(metrics.frames, "frames observados durante 8s de scroll").toBeGreaterThan(120);
    // "travar" pro usuário = frame acima de 50ms (3 frames perdidos a 60fps)
    expect(metrics.travadosPct, "% de frames acima de 50ms").toBeLessThan(20);
    expect(metrics.p95, "p95 do intervalo entre frames (ms)").toBeLessThan(120);
    expect(metrics.longTaskMax, "maior long task (ms)").toBeLessThan(1500);
  });

  test("celular baixa a trilha leve, nunca os masters", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "cenário é o aparelho de mão");

    const baixados: string[] = [];
    page.on("response", (r) => {
      const u = new URL(r.url()).pathname;
      if (u.endsWith(".mp4")) baixados.push(u.split("/").pop()!);
    });

    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 30_000 });
    await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>(".sw-track")!;
      window.scrollTo(0, track.offsetHeight * 0.4);
    });
    await page.waitForTimeout(3000);

    expect(baixados.length, "algum clipe precisa carregar").toBeGreaterThan(0);
    const masters = baixados.filter((n) => !n.includes("-m.mp4"));
    expect(masters, "nenhum master de desktop no celular").toEqual([]);
  });

  test("nenhum backdrop-filter vivo sobre o vídeo no touch", async ({
    page,
  }, testInfo) => {
    // blur em tempo real sobre vídeo em movimento é o maior custo de GPU
    // em celular — foi a causa raiz do travamento reportado
    test.skip(testInfo.project.name === "desktop", "regra vale pro touch");
    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 30_000 });

    const comBlur = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("*")]
        .filter((el) => {
          const s = getComputedStyle(el);
          const bf = s.backdropFilter || (s as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter;
          return bf && bf !== "none";
        })
        .map((el) => el.className || el.tagName),
    );
    expect(comBlur).toEqual([]);
  });
});
