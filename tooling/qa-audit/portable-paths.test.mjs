import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const auditRoot = path.dirname(fileURLToPath(import.meta.url));

function findModules(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findModules(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".mjs") ? [entryPath] : [];
  });
}

test("QA audit executables do not contain developer-specific absolute paths", () => {
  const offenders = findModules(auditRoot)
    .filter((modulePath) => modulePath !== fileURLToPath(import.meta.url))
    .filter((modulePath) =>
      /[a-z]:\\\\Users\\\\/i.test(fs.readFileSync(modulePath, "utf8")),
    )
    .map((modulePath) => path.relative(auditRoot, modulePath));

  assert.deepEqual(offenders, []);
});
