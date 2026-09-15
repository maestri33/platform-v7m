import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowPath = ".github/workflows/deploy.yml";

test("production deploy does not suppress critical docker pull failures", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  assert.doesNotMatch(
    workflow,
    /docker compose pull[^\n]*2>\/dev\/null\s*\|\|\s*true/,
    "critical docker compose pull failures must remain visible",
  );
});

test("deployment summary reports dependency results instead of unconditional success", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /needs\.deploy-pve-core\.result/);
  assert.match(workflow, /needs\.migrate-neon-db\.result/);
  assert.match(workflow, /needs\.build-and-push\.result/);
  assert.match(workflow, /needs\.deploy-cloudflare-pages\.result/);

  assert.doesNotMatch(
    workflow,
    /V7M Full Deployment Pipeline finished successfully/,
    "summary must not hard-code a successful pipeline outcome",
  );
  assert.doesNotMatch(
    workflow,
    /Proxmox CT 150: Core services updated and healthy/,
    "summary must not claim health without evidence",
  );
});
