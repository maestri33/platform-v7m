#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const rootPkgPath = path.join(rootDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const currentVersion = rootPkg.version || "0.1.0-alpha.1";

const arg = process.argv[2] || "patch"; // patch | minor | major | alpha | beta | rc | 0.1.0-alpha.1

function computeNextVersion(current, type) {
  // Se passou uma versão explícita (ex: 0.1.0-alpha.1)
  if (/^\d+\.\d+\.\d+/.test(type)) {
    return type;
  }

  // Se a versão atual tem sufixo de pré-release (ex: 0.1.0-alpha.1)
  const isPrerelease = current.includes("-");
  const baseVersion = current.split("-")[0];
  const [major, minor, patch] = baseVersion.split(".").map(Number);

  if (type === "alpha") {
    if (current.includes("-alpha.")) {
      const num = parseInt(current.split("-alpha.")[1] || "0", 10);
      return `${baseVersion}-alpha.${num + 1}`;
    }
    return `${baseVersion}-alpha.1`;
  }

  if (type === "beta") {
    if (current.includes("-beta.")) {
      const num = parseInt(current.split("-beta.")[1] || "0", 10);
      return `${baseVersion}-beta.${num + 1}`;
    }
    return `${baseVersion}-beta.1`;
  }

  if (type === "rc") {
    if (current.includes("-rc.")) {
      const num = parseInt(current.split("-rc.")[1] || "0", 10);
      return `${baseVersion}-rc.${num + 1}`;
    }
    return `${baseVersion}-rc.1`;
  }

  // Bump de versão final
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      if (isPrerelease) {
        // Se estava em alpha/beta e pede patch, gradua para a versão base
        return baseVersion;
      }
      return `${major}.${minor}.${patch + 1}`;
  }
}

const nextVersion = computeNextVersion(currentVersion, arg);

console.log(`\n📦 Bumping V7M Monorepo Global Version: ${currentVersion} ➔ ${nextVersion} (${arg})\n`);

// 1. Encontrar todos os package.json nos subdiretórios
const packageDirs = ["apps", "packages", "tooling"];
const packageJsonPaths = [rootPkgPath];

packageDirs.forEach((dirName) => {
  const fullDir = path.join(rootDir, dirName);
  if (!fs.existsSync(fullDir)) return;
  const items = fs.readdirSync(fullDir, { withFileTypes: true });
  items.forEach((item) => {
    if (item.isDirectory()) {
      const pkgJson = path.join(fullDir, item.name, "package.json");
      if (fs.existsSync(pkgJson)) {
        packageJsonPaths.push(pkgJson);
      }
    }
  });
});

// 2. Atualizar todos os package.json
packageJsonPaths.forEach((filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const pkg = JSON.parse(raw);
  const oldVer = pkg.version;
  pkg.version = nextVersion;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  const relativePath = path.relative(rootDir, filePath);
  console.log(`  ✅ ${relativePath} (${oldVer || "none"} ➔ ${nextVersion})`);
});

// 3. Atualizar CHANGELOG.md raiz
const changelogPath = path.join(rootDir, "CHANGELOG.md");
const dateStr = new Date().toISOString().split("T")[0];
const entry = `\n## [${nextVersion}] - ${dateStr}\n\n- Global release ${nextVersion} across all V7M services, apps and packages.\n`;

if (fs.existsSync(changelogPath)) {
  const currentChangelog = fs.readFileSync(changelogPath, "utf8");
  fs.writeFileSync(changelogPath, currentChangelog.replace(/^# Changelog\n*/i, `# Changelog\n${entry}`), "utf8");
} else {
  fs.writeFileSync(changelogPath, `# Changelog\n${entry}`, "utf8");
}
console.log(`  📝 CHANGELOG.md atualizado.`);

console.log(`\n🎉 Versão ${nextVersion} sincronizada com sucesso em todo o ecossistema!`);
console.log(`\nPara criar a tag no Git e enviar ao repositório:`);
console.log(`  git add .`);
console.log(`  git commit -m "chore(release): v${nextVersion}"`);
console.log(`  git tag v${nextVersion}`);
console.log(`  git push origin main --tags\n`);
