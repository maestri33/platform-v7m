import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ciPath = ".github/workflows/ci.yml";
const deployPath = ".github/workflows/deploy.yml";

test("production deploy is called only after every CI guard succeeds", async () => {
  const [ci, deploy] = await Promise.all([
    readFile(ciPath, "utf8"),
    readFile(deployPath, "utf8"),
  ]);

  assert.match(
    deploy,
    /^on:\n\s+workflow_call:\s*$/m,
    "the production workflow must be reusable by the gated CI workflow",
  );
  assert.doesNotMatch(
    deploy,
    /^\s+push:\s*$/m,
    "the production workflow must not deploy directly from a push event",
  );

  assert.match(
    ci,
    /push:\n\s+branches: \[main\]\n\s+tags:\n\s+- ['"]v\*['"]/,
    "both main and release-tag pushes must run CI before deployment",
  );

  const deployJobStart = ci.indexOf("\n  deploy-production:\n");
  const deployJob = deployJobStart >= 0 ? ci.slice(deployJobStart) : undefined;
  assert.ok(deployJob, "CI must define a deploy-production job");
  assert.match(
    deployJob,
    /needs: \[stability-guards, quality, test-frontends, test-backend\]/,
    "deployment must wait for every CI guard",
  );
  assert.match(
    deployJob,
    /if: github\.event_name == ['"]push['"]/,
    "pull request validation must never invoke production deployment",
  );
  assert.match(deployJob, /uses: \.\/\.github\/workflows\/deploy\.yml/);
  assert.match(deployJob, /secrets: inherit/);
});
