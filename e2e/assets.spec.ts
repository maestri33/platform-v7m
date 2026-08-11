import { expect, test } from "@playwright/test";
import { BASE, CONFIG } from "../app/scroll-config";

// Integridade TOTAL dos assets, dirigida pela mesma config que a página usa:
// cena nova = cobertura automática; clipe renomeado sem atualizar a config =
// vermelho. Puro request — sem decoder, roda em ~1s em qualquer project.
// (A sabotagem da rodada 14 provou o furo: am5 em 404 passava, 6 dos 7
// masters em 404 passavam no desktop, logos em 404 passavam em tudo.)

const urlsDaConfig = () => {
  const urls = new Set<string>();
  for (const s of CONFIG.sections) {
    urls.add(s.clip);
    if (s.clipMobile) urls.add(s.clipMobile);
    urls.add(s.still);
    if (s.stillMobile) urls.add(s.stillMobile);
  }
  return [...urls];
};

const EXTRAS = [
  `${BASE}/scrub-engine.js`,
  "/ieadpg-logo.webp",
  "/flame.webp",
  "/opengraph-image.jpg",
  "/icon.png",
  "/apple-icon.png",
];

test("todos os assets referenciados pela config respondem", async ({ page }) => {
  const quebrados: string[] = [];
  for (const url of [...urlsDaConfig(), ...EXTRAS]) {
    const r = await page.request.get(url);
    if (r.status() !== 200) quebrados.push(`${url} -> ${r.status()}`);
    else if ((await r.body()).length < 500)
      quebrados.push(`${url} -> corpo suspeito de ${(await r.body()).length} bytes`);
  }
  expect(quebrados).toEqual([]);
});

test("a config cobre as 7 cenas com par desktop+mobile", () => {
  expect(CONFIG.sections).toHaveLength(7);
  for (const s of CONFIG.sections) {
    expect(s.clip, `cena ${s.id} sem clip`).toBeTruthy();
    expect(s.clipMobile, `cena ${s.id} sem clipMobile`).toBeTruthy();
    expect(s.still, `cena ${s.id} sem still`).toBeTruthy();
    expect(s.stillMobile, `cena ${s.id} sem stillMobile`).toBeTruthy();
  }
});
