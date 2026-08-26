import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptDir = __dirname;
const packageDir = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(packageDir, "../..");
const backendDir = path.resolve(projectRoot, "services", "backend");
const venvPython = process.platform === "win32"
  ? path.join(backendDir, ".venv", "Scripts", "python.exe")
  : path.join(backendDir, ".venv", "bin", "python");

const openapiJsonPath = path.join(scriptDir, "openapi.json");
const schemaOutputPath = path.join(packageDir, "src", "schema.d.ts");

console.log("=== V7M OpenAPI Codegen ===");

// 1. Export OpenAPI JSON from Django Ninja if python environment is present
if (fs.existsSync(venvPython)) {
  console.log("Found Django backend venv at:", venvPython);
  console.log("Exporting unified OpenAPI schema from Django Ninja...");
  try {
    execSync(`"${venvPython}" "${path.join(scriptDir, "export-schema.py")}"`, {
      stdio: "inherit",
      cwd: backendDir,
    });
  } catch (err) {
    console.warn("Warning: Python export failed, checking if openapi.json exists...", err.message);
  }
} else {
  console.log("Django venv not found at default location. Using existing openapi.json if available.");
}

if (!fs.existsSync(openapiJsonPath)) {
  console.error("Error: openapi.json not found at", openapiJsonPath);
  process.exit(1);
}

// 2. Generate TypeScript types using openapi-typescript
console.log("Generating TypeScript definitions with openapi-typescript...");
const openapiJson = JSON.parse(fs.readFileSync(openapiJsonPath, "utf-8"));

const ast = await openapiTS(openapiJson, {
  exportType: true,
});

const tsOutput = astToString(ast);

// Ensure src directory exists
const srcDir = path.dirname(schemaOutputPath);
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

fs.writeFileSync(schemaOutputPath, tsOutput, "utf-8");
console.log(`Generated types saved to: ${schemaOutputPath} (${(Buffer.byteLength(tsOutput) / 1024).toFixed(1)} KB)`);
console.log("=== Codegen complete! ===");
