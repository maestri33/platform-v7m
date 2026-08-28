import { runFullSecuritySuite } from "../../scripts/verify-network-security.mjs";

export async function runNetworkSecuritySuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 10: NETWORK TOPOLOGY, WAN BOUNDARY & ENDPOINT SECURITY");
  console.log("========================================================\n");

  const start = Date.now();
  try {
    const res = await runFullSecuritySuite();
    const suiteDuration = Date.now() - start;

    return res.tests.map((t) => ({
      name: t.name,
      status: t.passed ? "PASS" : "FAIL",
      durationMs: Math.round(suiteDuration / (res.tests.length || 1)),
      details: t.detail || t.error || "",
    }));
  } catch (error) {
    return [
      {
        name: "Network Security & Topology Audit Execution",
        status: "FAIL",
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}
