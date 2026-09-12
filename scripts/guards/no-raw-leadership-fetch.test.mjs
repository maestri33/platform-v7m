import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagePath = "apps/group/src/app/(app)/hub/matriculas/page.tsx";
const clientPath = "apps/group/src/lib/api-leadership.ts";

test("hub enrollment conclusion goes through the authenticated leadership API client", async () => {
  const [page, client] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(clientPath, "utf8"),
  ]);

  assert.doesNotMatch(
    page,
    /fetch\(\s*`\/api\/v1\/leadership\/enrollments\//,
    "hub/matriculas must not bypass the authenticated leadership API client with raw fetch",
  );

  assert.match(
    page,
    /apiLeadership\.concludeEnrollment\(/,
    "hub/matriculas must call apiLeadership.concludeEnrollment",
  );

  assert.match(
    client,
    /async\s+concludeEnrollment\s*\(/,
    "api-leadership.ts must expose concludeEnrollment",
  );
});
