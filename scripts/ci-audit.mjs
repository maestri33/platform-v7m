#!/usr/bin/env node
/**
 * CI/CD Pipeline Entrypoint — Auditoria Completa E2E & Pre-Deploy Gate
 * Executa as 9 suites de auditoria e garante código de saída 0 para deploy.
 */

import { executeFullMasterLoopAudit } from "../qa-audit/run-all-audit.mjs";

async function runCiPipeline() {
  console.log("🚀 [CI/CD Gate] Iniciando pipeline de validação pré-deploy V7M...");
  try {
    const report = await executeFullMasterLoopAudit();
    if (report.summary.failed > 0) {
      console.error(`❌ [CI/CD Gate] Pipeline falhou: ${report.summary.failed} testes com erro.`);
      process.exit(1);
    } else {
      console.log(`✅ [CI/CD Gate] Pipeline aprovado: ${report.summary.passed}/${report.summary.total} testes com sucesso.`);
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ [CI/CD Gate] Erro fatal durante a execução do pipeline:", err);
    process.exit(1);
  }
}

runCiPipeline();
