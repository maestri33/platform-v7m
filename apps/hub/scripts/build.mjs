import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
mkdirSync(dist, { recursive: true });
for (const file of ["index.html", "styles.css", "app.js"]) {
  const source = resolve(root, "src", file);
  const target = resolve(dist, file);
  if (file === "app.js") {
    const api = JSON.stringify(
      process.env.HUB_API_BASE || "/api/v1/leadership",
    );
    writeFileSync(target, readFileSync(source, "utf8").replace('"__HUB_API_BASE_DEFAULT__"', api));
  } else {
    copyFileSync(source, target);
  }
}
writeFileSync(
  resolve(dist, "healthz"),
  JSON.stringify({
    status: "ok",
    sha: process.env.GIT_SHA || "local",
    builtAt: process.env.BUILD_AT || new Date().toISOString(),
  }),
);
console.log("hub-v7m build concluído em dist/");
