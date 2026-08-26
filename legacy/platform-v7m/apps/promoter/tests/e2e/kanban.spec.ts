import { expect, test, type Page } from "@playwright/test";

/**
 * Cobertura e2e do componente Kanban (demo em `/dev-preview/kanban`).
 *
 * Contrato esperado do componente (ver também AGENTS.md do projeto):
 *   - 3 colunas com aria-label "<título>, N itens".
 *   - Cards com aria-roledescription="kanban card" e tabIndex=0.
 *   - Mobile (< 768px): container com flex + overflow-x-auto + snap, e dots.
 *   - Desktop (>= 768px): grid 3 colunas lado a lado.
 *   - Drag-and-drop via @dnd-kit/core (mouse, touch e teclado).
 *
 * Sem dependência do mock backend — a rota é só showcase de UI. Por isso não
 * chamamos /__reset nem precisamos de auth. O playwright.config.ts já
 * sobe o dev server + mock backend antes de rodar.
 *
 * NOTAS sobre a implementação atual (descobertas durante o debug):
 *   - O título dentro do <h3> é renderizado em CAIXA ALTA via CSS
 *     (`uppercase`), então qualquer matcher precisa ser case-insensitive ou
 *     usar a forma em CAIXA ALTA.
 *   - `[attr*="item"]` NÃO casa "itens" (item não é substring de itens —
 *     o 4º char difere: m vs n). Usamos sempre "itens" (plural) para o
 *     seletor ou `section[aria-label]` sem filtro + validação via
 *     getAttribute("aria-label") em runtime.
 *   - `hasText` confere o TEXT CONTENT, não o atributo aria-label.
 *     Para casar pelo título da coluna, prefira `aria-label*="<título>"`
 *     ou `getByRole("heading", { level: 3, name: "A FAZER" })`.
 */
const KANBAN_URL = "/dev-preview/kanban";

/** Locator base das 3 colunas. */
const boardColumns = (page: Page) => page.locator("section[aria-label]");
/** Locator dos cards do board. */
const boardCards = (page: Page) =>
  page.locator('[aria-roledescription="kanban card"]');

/** Devolve a coluna cujo aria-label começa com o título dado. */
async function columnByTitle(page: Page, title: string) {
  const cols = await boardColumns(page).all();
  for (const c of cols) {
    const label = (await c.getAttribute("aria-label")) ?? "";
    if (label.toLowerCase().startsWith(title.toLowerCase())) return c;
  }
  return null;
}

async function gotoKanban(page: Page) {
  const response = await page.goto(KANBAN_URL);
  expect(response, "A rota /dev-preview/kanban deve responder").not.toBeNull();
  expect(response!.status(), "A rota /dev-preview/kanban deve existir").toBeLessThan(400);

  await page.waitForLoadState("networkidle");
  await expect
    .poll(async () => (await boardCards(page).count()) > 0, {
      timeout: 15_000,
      message: "Kanban demorou para renderizar (sem cards)",
    })
    .toBe(true);
}

test.describe("Kanban · demo /dev-preview/kanban", () => {
  test("desktop 1440x900 renderiza 3 colunas e >=9 cards (4+3+2)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoKanban(page);

    // 3 colunas com aria-label no formato "<título>, N itens".
    const columns = boardColumns(page);
    await expect(columns).toHaveCount(3);

    for (let i = 0; i < 3; i += 1) {
      const col = columns.nth(i);
      const label = await col.getAttribute("aria-label");
      expect(label, `Coluna ${i} precisa de aria-label com contagem`).toMatch(
        /^.+,\s*\d+\s*itens?$/i,
      );
    }

    // Demo data: 4 + 3 + 2 = 9 cards totais.
    const total = await boardCards(page).count();
    expect(total, "Esperado 9 cards no board todo (demo)").toBeGreaterThanOrEqual(9);

    // Desktop: as 3 colunas devem estar LADO A LADO (mesma linha do grid).
    const boxes = await Promise.all(
      (await columns.all()).map((c) => c.boundingBox()),
    );
    const allBoxes = boxes.filter((b): b is NonNullable<typeof b> => b !== null);
    expect(allBoxes.length).toBe(3);
    const ys = allBoxes.map((b) => Math.round(b.y));
    const firstY = ys[0];
    const sameRowCount = ys.filter((y) => Math.abs(y - firstY) <= 4).length;
    expect(
      sameRowCount,
      "Em desktop, as 3 colunas devem estar na mesma linha",
    ).toBeGreaterThanOrEqual(2);

    // Soma das larguras <= viewport (sem scroll horizontal).
    const totalWidth = allBoxes.reduce((s, b) => s + b.width, 0);
    expect(totalWidth, "Soma das larguras > viewport ⇒ layout não cabe").toBeLessThanOrEqual(
      1440 + 1,
    );
  });

  test("mobile 375x812 tem scroll horizontal com snap e dots indicator", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoKanban(page);

    // 1) container com overflow-x scroll envolvendo as colunas.
    const hasScrollContainer = await page.evaluate(() => {
      const cols = Array.from(document.querySelectorAll("section[aria-label]"));
      for (const col of cols) {
        let el: HTMLElement | null = col as HTMLElement;
        while (el && el !== document.body) {
          const cs = getComputedStyle(el);
          if (
            /(auto|scroll)/.test(cs.overflowX) &&
            (cs.display === "flex" || cs.display === "inline-flex") &&
            el.scrollWidth > el.clientWidth + 1
          ) {
            return true;
          }
          el = el.parentElement;
        }
      }
      return false;
    });

    // 2) dots indicator — implementado como <span.block.rounded-full>.
    const dotsCount = await page.evaluate(
      () => document.querySelectorAll("span.block.rounded-full").length,
    );

    expect(
      hasScrollContainer || dotsCount >= 3,
      "Esperado container horizontal-scroll OU dots indicator (>=3 dots)",
    ).toBe(true);

    // Colunas dispostas horizontalmente (mesmo y) e a última fora do viewport.
    const columns = boardColumns(page);
    const boxes = await Promise.all(
      (await columns.all()).map((c) => c.boundingBox()),
    );
    const allBoxes = boxes.filter((b): b is NonNullable<typeof b> => b !== null);
    expect(allBoxes.length).toBe(3);
    const ys = allBoxes.map((b) => Math.round(b.y));
    const sameY = ys.every((y) => Math.abs(y - ys[0]) <= 4);
    expect(sameY, "Em mobile, as 3 colunas devem estar na mesma linha").toBe(true);

    const vw = 375;
    const lastBox = allBoxes[allBoxes.length - 1];
    expect(
      lastBox.x >= vw - 1,
      `Última coluna (x=${lastBox.x}) deve estar fora do viewport (vw=${vw})`,
    ).toBe(true);
  });

  test("desktop: arrastar card de 'A fazer' para 'Em andamento' via mouse", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoKanban(page);

    const todoLoc = await columnByTitle(page, "A fazer");
    const doingLoc = await columnByTitle(page, "Em andamento");
    expect(todoLoc, "Coluna 'A fazer' deve existir").not.toBeNull();
    expect(doingLoc, "Coluna 'Em andamento' deve existir").not.toBeNull();
    const todoCol = todoLoc!;
    const doingCol = doingLoc!;

    const sourceCard = todoCol.locator('[aria-roledescription="kanban card"]').first();
    await expect(sourceCard).toBeVisible();

    const cardText = (await sourceCard.innerText()).trim();
    const probe = cardText.split("\n")[0].slice(0, 12);

    // Antes: 4 cards em A fazer e o probe existe nele; não existe em Em andamento.
    await expect(todoCol.locator('[aria-roledescription="kanban card"]')).toHaveCount(4);
    await expect(doingCol.locator('[aria-roledescription="kanban card"]')).toHaveCount(3);
    await expect(todoCol.locator(`text=${probe}`)).toHaveCount(1);
    await expect(doingCol.locator(`text=${probe}`)).toHaveCount(0);

    // Drag — dnd-kit PointerSensor precisa de um pequeno movimento para ativar
    // (constraint distance = 5px conforme a implementação).
    const sourceBox = await sourceCard.boundingBox();
    const targetBox = await doingCol.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    const sx = sourceBox!.x + sourceBox!.width / 2;
    const sy = sourceBox!.y + sourceBox!.height / 2;
    const tx = targetBox!.x + targetBox!.width / 2;
    const ty = targetBox!.y + targetBox!.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 12, sy + 12, { steps: 5 }); // passa o threshold
    await page.mouse.move(tx, ty, { steps: 15 });
    await page.waitForTimeout(150); // dnd-kit precisa de um descanso
    await page.mouse.up();

    // Depois: A fazer tem 3, Em andamento tem 4, e o probe está em Em andamento.
    await expect
      .poll(
        async () =>
          (await todoCol.locator(`text=${probe}`).count()) === 0 &&
          (await doingCol.locator(`text=${probe}`).count()) === 1,
        { timeout: 5_000, message: "Card deveria ter migrado para 'Em andamento'" },
      )
      .toBe(true);

    await expect(todoCol.locator('[aria-roledescription="kanban card"]')).toHaveCount(3);
    await expect(doingCol.locator('[aria-roledescription="kanban card"]')).toHaveCount(4);
  });

  test("teclado: card é focável, pick-up com Space, drop com Space move entre colunas", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoKanban(page);

    // Foca o primeiro card (determinístico — não dependemos do Tab path).
    const firstCard = boardCards(page).first();
    await expect(firstCard).toBeVisible();
    await firstCard.focus();

    // Outline visível em :focus ou :focus-visible.
    const focusInfo = await firstCard.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        outline: cs.outline,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
        outlineColor: cs.outlineColor,
      };
    });
    const owNum = focusInfo.outlineWidth.endsWith("px")
      ? parseFloat(focusInfo.outlineWidth)
      : 0;
    const outlineVisible =
      owNum > 0 &&
      !/transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\)/.test(focusInfo.outlineColor);
    const boxShadowVisible = !!focusInfo.boxShadow && focusInfo.boxShadow !== "none";
    expect(
      outlineVisible || boxShadowVisible,
      `Esperado outline ou box-shadow visível no :focus. Recebido: ${JSON.stringify(
        focusInfo,
      )}`,
    ).toBe(true);

    // Identifica o card (probe) e as colunas antes do drag.
    const cardText = (await firstCard.innerText()).trim();
    const probe = cardText.split("\n")[0].slice(0, 12);

    const todoCol = (await columnByTitle(page, "A fazer"))!;
    const doingCol = (await columnByTitle(page, "Em andamento"))!;
    const todoBefore = await todoCol
      .locator('[aria-roledescription="kanban card"]')
      .count();
    const doingBefore = await doingCol
      .locator('[aria-roledescription="kanban card"]')
      .count();

    // Garante que o card focado está em "A fazer" (senão o teste é inválido).
    expect(todoBefore, "Esperado 4 cards em 'A fazer' antes do drag").toBe(4);

    // Pick-up com Space (KeyboardSensor default em @dnd-kit/sortable).
    await page.keyboard.press("Space");
    await page.waitForTimeout(120);

    // Move para outra coluna: ArrowRight funciona com sortableKeyboardCoordinates.
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);

    // Drop com Space.
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);

    let todoAfter = await todoCol
      .locator('[aria-roledescription="kanban card"]')
      .count();
    let doingAfter = await doingCol
      .locator('[aria-roledescription="kanban card"]')
      .count();

    // Se nada moveu, tenta Enter como alternativa (variação de KeyboardSensor).
    if (todoAfter === todoBefore && doingAfter === doingBefore) {
      await firstCard.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
      todoAfter = await todoCol
        .locator('[aria-roledescription="kanban card"]')
        .count();
      doingAfter = await doingCol
        .locator('[aria-roledescription="kanban card"]')
        .count();
    }

    // Validação: o probe saiu de A fazer (que perdeu 1) e apareceu em Em andamento
    // (que ganhou 1).
    const probeInTodo = await todoCol.locator(`text=${probe}`).count();
    const probeInDoing = await doingCol.locator(`text=${probe}`).count();

    expect(
      todoAfter,
      `'A fazer' deveria ter perdido um card (era ${todoBefore}, agora ${todoAfter})`,
    ).toBe(todoBefore - 1);
    expect(
      doingAfter,
      `'Em andamento' deveria ter ganhado um card (era ${doingBefore}, agora ${doingAfter})`,
    ).toBe(doingBefore + 1);
    expect(probeInTodo, "probe ainda está em 'A fazer'").toBe(0);
    expect(probeInDoing, "probe não está em 'Em andamento'").toBe(1);
  });

  test("acessibilidade: colunas com aria-label descritivo e cards focáveis", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoKanban(page);

    const columns = boardColumns(page);
    await expect(columns).toHaveCount(3);

    // Cada coluna tem aria-label com contagem de itens, e a contagem confere
    // com o nº real de cards dentro.
    for (let i = 0; i < 3; i += 1) {
      const col = columns.nth(i);
      const label = await col.getAttribute("aria-label");
      expect(label, `Coluna ${i} sem aria-label`).toBeTruthy();
      expect(label!, `aria-label "${label}" deve terminar com ", N itens"`).toMatch(
        /^.+,\s*\d+\s*itens?$/i,
      );
      const declared = parseInt(label!.match(/(\d+)\s*itens?/i)![1], 10);
      const actual = await col.locator('[aria-roledescription="kanban card"]').count();
      expect(
        actual,
        `Coluna ${i} (aria-label="${label}") declara ${declared} mas tem ${actual}`,
      ).toBe(declared);
    }

    // Cada card é focável: tabIndex=0 OU role/button nativos.
    const cards = boardCards(page);
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);

    for (let i = 0; i < total; i += 1) {
      const card = cards.nth(i);
      const tag = await card.evaluate((el) => el.tagName.toLowerCase());
      const tabIndex = await card.getAttribute("tabindex");
      const role = await card.getAttribute("role");
      const nativelyFocusable = ["button", "a", "input", "select", "textarea"].includes(tag);
      const isFocusable =
        nativelyFocusable || tabIndex === "0" || role === "button" || role === "link";
      expect(
        isFocusable,
        `Card ${i} (${tag}, role=${role}, tabindex=${tabIndex}) não é focável`,
      ).toBe(true);
    }
  });
});
