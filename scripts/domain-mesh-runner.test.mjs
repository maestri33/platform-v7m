import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const runnerPath = fileURLToPath(
  new URL("./domain-mesh-runner.mjs", import.meta.url),
);

function runWithStatus(status) {
  const preload = [
    "globalThis.fetch = async () => ({",
    `status: ${status},`,
    "headers: { get: () => null },",
    "json: async () => ({ status: 'ok' }),",
    "});",
  ].join("");

  return spawnSync(
    process.execPath,
    [
      "--import",
      `data:text/javascript,${encodeURIComponent(preload)}`,
      runnerPath,
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
}

test("public mesh audit exits non-zero when any endpoint fails", () => {
  const result = runWithStatus(500);

  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /12 Falhas/);
});

test("public mesh audit exits zero when every endpoint is healthy", () => {
  const result = runWithStatus(200);

  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /12 OK, 0 Falhas/);
});
