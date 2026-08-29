import { execSync } from "node:child_process";

const CONTAINERS = [
  "v7m-backend-web",
  "v7m-backend-qcluster",
  "v7m-backend-qcluster-slow",
  "v7m-notify-web",
  "v7m-admin-v7m",
  "v7m-app-supletivo",
  "v7m-landing-promotor",
  "v7m-landing-supletivo",
  "v7m-postgres",
  "v7m-redis",
  "v7m-evolution-go",
];

export async function runBackendLogAuditor() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 6: CONTAINER LOG AUDIT & ANOMALY DETECTION");
  console.log("========================================================\n");

  const results = [];
  const logSummaries = {};

  for (const container of CONTAINERS) {
    try {
      console.log(`▶ Inspecionando logs recentes de [${container}]...`);
      const logs = execSync(`docker logs --tail 100 ${container} 2>&1`, { encoding: "utf8" });
      
      const lines = logs.split("\n");
      const errorLines = lines.filter((l) =>
        /\b(ERROR|CRITICAL|FATAL|Traceback \(most recent call last\)|Internal Server Error)\b/i.test(l) &&
        !/favicon|test_mode|invalid_token|test\.ping/i.test(l)
      );

      logSummaries[container] = {
        totalLines: lines.length,
        errorCount: errorLines.length,
        samples: errorLines.slice(0, 3),
      };

      if (errorLines.length === 0) {
        console.log(`  ✅ [${container}] 0 erros críticos detectados nos últimos 100 registros.`);
        results.push({ name: `Log Audit: ${container}`, status: "PASS", errors: 0 });
      } else {
        console.warn(`  ⚠️ [${container}] ${errorLines.length} linhas com padrão de erro encontradas.`);
        results.push({
          name: `Log Audit: ${container}`,
          status: "PARTIAL",
          errors: errorLines.length,
          samples: errorLines.slice(0, 2),
        });
      }
    } catch (err) {
      console.error(`  ❌ Falha ao inspecionar container ${container}: ${err.message}`);
      results.push({ name: `Log Audit: ${container}`, status: "FAIL", error: err.message });
    }
  }

  return { results, logSummaries };
}

if (process.argv[1] && process.argv[1].endsWith("06-backend-log-auditor.mjs")) {
  runBackendLogAuditor().then(({ results }) => {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`\n🎯 Fim da Suite 6: ${passed} PASS | ${failed} FAIL\n`);
  });
}
