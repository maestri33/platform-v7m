#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const rootPkgPath = path.join(rootDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const expectedVersion = rootPkg.version;

if (!expectedVersion) {
  console.error("❌ Erro: Versão não encontrada no package.json raiz.");
  process.exit(1);
}

console.log(`\n🔍 Verificando integridade de Versionamento Global (Esperado: v${expectedVersion})\n`);

let hasError = false;
const packageDirs = ["apps", "packages", "tooling"];
const checkedPackages = [];

packageDirs.forEach((dirName) => {
  const fullDir = path.join(rootDir, dirName);
  if (!fs.existsSync(fullDir)) return;
  const items = fs.readdirSync(fullDir, { withFileTypes: true });
  items.forEach((item) => {
    if (item.isDirectory()) {
      const pkgJsonPath = path.join(fullDir, item.name, "package.json");
      if (fs.existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const relPath = path.relative(rootDir, pkgJsonPath);
        if (pkg.version !== expectedVersion) {
          console.error(`  ❌ [DESALINHADO] ${relPath}: esperado "${expectedVersion}", encontrado "${pkg.version}"`);
          hasError = true;
        } else {
          console.log(`  ✅ ${relPath} (v${pkg.version})`);
          checkedPackages.push(pkg.name || relPath);
        }
      }
    }
  });
});

if (hasError) {
  console.error("\n❌ Falha na verificação de versão global! Execute 'pnpm version:bump' para sincronizar.\n");
  process.exit(1);
}

console.log(`\n✨ Sucesso: Todos os ${checkedPackages.length + 1} pacotes e serviços estão 100% sincronizados na versão v${expectedVersion}!\n`);
