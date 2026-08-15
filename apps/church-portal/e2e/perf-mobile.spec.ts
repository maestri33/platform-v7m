import { expect, test } from "@playwright/test";

// O teste que faltava: o travamento no celular foi reportado por humano, não
// pela suíte. Aqui o scroll é dirigido com CPU estrangulada e o custo é medido
// pelo próprio compositor (frames + long tasks), não por impressão.
// Estes testes decodificam vídeo de verdade. Rodando junto com o resto da
// suíte eles disputam o decodificador de hardware e falham por contenção do
// ambiente, não por regressão do produto — daí serial.
test.describe.configure({ mode: "serial" });

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
    // Runner do GitHub é 2 vCPU sem GPU: já parte de um piso muito mais baixo
    // que uma máquina de desenvolvimento, então 4x lá vira um aparelho que não
    // existe. Estrangula 4x localmente (onde há GPU) e 2x no CI.
    await client.send("Emulation.setCPUThrottlingRate", {
      rate: process.env.CI ? 2 : 4,
    });

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
    // O PICO é o que o humano chama de "travou" — um freeze único de 3s passa
    // por todas as médias. Vale igual nos dois ambientes: é o sinal forte.
    expect(metrics.pior, "maior travada num único frame (ms)").toBeLessThan(400);

    // Os limiares de média são calibrados por ambiente: medido 0% de frames
    // lentos na máquina local contra 5–30% no runner sem GPU. Apertar o CI ao
    // número local só produziria vermelho por hardware, não por regressão.
    const limite = process.env.CI
      ? { travados: 40, p95: 250 }
      : { travados: 5, p95: 120 };
    expect(metrics.travadosPct, "% de frames acima de 50ms").toBeLessThan(
      limite.travados,
    );
    expect(metrics.p95, "p95 do intervalo entre frames (ms)").toBeLessThan(
      limite.p95,
    );
  });

  test("celular baixa a trilha leve, nunca os masters — e todos respondem", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "cenário é o aparelho de mão");

    const baixados: { nome: string; status: number }[] = [];
    page.on("response", (r) => {
      const u = new URL(r.url()).pathname;
      if (u.endsWith(".mp4"))
        baixados.push({ nome: u.split("/").pop()!, status: r.status() });
    });

    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 30_000 });
    await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>(".sw-track")!;
      window.scrollTo(0, track.offsetHeight * 0.4);
    });
    await page.waitForTimeout(3000);

    expect(baixados.length, "algum clipe precisa carregar").toBeGreaterThan(0);
    // status importa: sem isto a suíte fica verde com TODOS os mp4 em 404
    const quebrados = baixados.filter(
      (b) => b.status !== 200 && b.status !== 206,
    );
    expect(quebrados, "clipes que não responderam 200/206").toEqual([]);
    const masters = baixados
      .filter((b) => !b.nome.includes("-m.mp4"))
      .map((b) => b.nome);
    expect(masters, "nenhum master de desktop no celular").toEqual([]);
  });

  test("o scrub realmente acontece: o vídeo da cena avança com o scroll", async ({
    page,
  }) => {
    // contrato central do produto. Sem isto, 7 posters estáticos passariam
    // por "site funcionando" (cache velho, ?v= errado, path trocado).
    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 30_000 });
    // Fixa na PRIMEIRA cena: a de maior opacidade oscila entre duas quando o
    // scroll está numa emenda, e a leitura viraria corrida. A cena 0 tem banda
    // conhecida (scroll: 1.6 de ~10,5 vh no total), então 2% e 8% caem dentro.
    const videoDaCena0 = () =>
      page.waitForFunction(
        () => {
          const v = document
            .querySelectorAll<HTMLElement>(".sw-scene")[0]
            ?.querySelector("video");
          return !!v && v.readyState >= 2 && !v.seeking;
        },
        undefined,
        { timeout: 30_000 },
      );

    const ler = () =>
      page.evaluate(() => {
        const v = document
          .querySelectorAll<HTMLElement>(".sw-scene")[0]
          .querySelector("video")!;
        return { readyState: v.readyState, currentTime: v.currentTime };
      });

    await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>(".sw-track")!;
      window.scrollTo(0, (track.offsetHeight - window.innerHeight) * 0.02);
    });
    await videoDaCena0();
    const a = await ler();
    expect(a.readyState, "vídeo com dados decodificáveis").toBeGreaterThanOrEqual(2);

    // rola e espera o frame REALMENTE mudar. O lerp da engine é 0.18/frame:
    // sair no primeiro !seeking lê o valor antigo. Se o scrub estiver morto
    // (poster estático, clipe em 404), isto estoura o timeout — que é o ponto.
    await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>(".sw-track")!;
      window.scrollTo(0, (track.offsetHeight - window.innerHeight) * 0.08);
    });
    await page.waitForFunction(
      (antes) => {
        const v = document
          .querySelectorAll<HTMLElement>(".sw-scene")[0]
          ?.querySelector("video");
        return !!v && v.currentTime > antes + 0.05;
      },
      a.currentTime,
      { timeout: 15_000 },
    );

    const b = await ler();
    expect(
      b.currentTime,
      "currentTime tem que avançar quando a página rola",
    ).toBeGreaterThan(a.currentTime);
  });

  test("no máximo 3 decodificadores vivos ao longo do voo", async ({
    page,
  }, testInfo) => {
    // a virtualização é a defesa contra o travamento reportado: sem cobertura,
    // um refactor que inverta o guard traz o freeze de volta com o CI verde
    test.skip(testInfo.project.name === "desktop", "virtualização é só no touch");
    await page.goto("/");
    await expect(page.locator(".sw-root")).toBeAttached({ timeout: 30_000 });
    await page.waitForTimeout(2000);

    const picos: number[] = [];
    for (const frac of [0, 0.4, 0.8, 1]) {
      await page.evaluate((f) => {
        const track = document.querySelector<HTMLElement>(".sw-track")!;
        window.scrollTo(0, (track.offsetHeight - window.innerHeight) * f);
      }, frac);
      await page.waitForTimeout(1500); // deixa o interval de 1s rodar
      picos.push(
        await page.evaluate(
          () => document.querySelectorAll("video[src]").length,
        ),
      );
    }

    expect(Math.max(...picos), "pico de <video> com src").toBeLessThanOrEqual(3);
    expect(Math.max(...picos), "algum vídeo tem que estar vivo").toBeGreaterThanOrEqual(1);
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
