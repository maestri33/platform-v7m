import { test, expect } from "@playwright/test";

test("debug2: filter variants", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev-preview/kanban");
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-roledescription="kanban card"]').first()).toBeVisible();

  const a1 = await page.locator("section[aria-label]").count();
  console.log("section[aria-label]:", a1);

  const a2 = await page.locator("section[aria-label]").filter({ hasText: "itens" }).count();
  console.log("hasText: 'itens':", a2);

  const a3 = await page.locator("section[aria-label]").filter({ hasText: /itens/ }).count();
  console.log("hasText: /itens/:", a3);

  const a4 = await page.locator("section[aria-label]").filter({ hasText: /itens?/ }).count();
  console.log("hasText: /itens?/:", a4);

  const a5 = await page.locator("section[aria-label]").filter({ has: page.locator("h3") }).count();
  console.log("has: h3:", a5);

  const a6 = await page.locator("section[aria-label]").filter({ has: page.locator("h3", { hasText: "A fazer" }) }).count();
  console.log("has: h3 A fazer:", a6);

  // 1st h3 text
  const h3Texts = await page.locator("section[aria-label] h3").allInnerTexts();
  console.log("h3 texts:", h3Texts);

  expect(a1).toBeGreaterThan(0);
});
