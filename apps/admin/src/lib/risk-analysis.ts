export interface ReviewItem {
  id?: string;
  external_id: string;
  kind?: string;
  type?: string;
  name?: string | null;
  doc_type?: string | null;
  since?: string | null;
  status?: string;
  analysis_status?: string;
  analysis_reason?: string;
  validation_status?: string;
  validation_reason?: string;
  [key: string]: unknown;
}

export interface RiskEvaluation {
  level: "critical" | "warning" | "normal";
  score: number; // 0 to 100
  divergences: string[];
  summary: string;
  reasons: string[];
}

export function evaluateReviewRisk(item: ReviewItem): RiskEvaluation {
  const divergences: string[] = [];
  const reasons: string[] = [];
  let score = 20;

  const analysisReason = item.analysis_reason || item.validation_reason || "";
  const analysisStatus = item.analysis_status || item.validation_status || "";

  if (analysisStatus === "rejected" || analysisStatus === "failed") {
    score += 50;
    reasons.push(`Análise prévia falhou: ${analysisReason || "Documento com inconformidade detectada"}`);
    divergences.push("Falha de validação automática");
  } else if (analysisStatus === "manual_review" || analysisStatus === "pending") {
    score += 25;
    if (analysisReason) reasons.push(analysisReason);
  }

  const lowerReason = analysisReason.toLowerCase();
  if (
    lowerReason.includes("diverg") ||
    lowerReason.includes("diferente") ||
    lowerReason.includes("não confere") ||
    lowerReason.includes("ilegível") ||
    lowerReason.includes("borrado")
  ) {
    score += 35;
    divergences.push(analysisReason);
  }

  if (
    lowerReason.includes("fraude") ||
    lowerReason.includes("falsifica") ||
    lowerReason.includes("foto de foto") ||
    lowerReason.includes("spoof")
  ) {
    score += 60;
    divergences.push("Alerta de autenticidade / Biometria");
  }

  if (item.since) {
    try {
      const waitDays = (Date.now() - new Date(item.since).getTime()) / (1000 * 60 * 60 * 24);
      if (waitDays > 2) {
        score += 15;
        reasons.push(`Aguardando revisão há mais de ${Math.floor(waitDays)} dias.`);
      }
    } catch {
      // Ignore
    }
  }

  let level: "critical" | "warning" | "normal" = "normal";
  if (score >= 65 || divergences.length > 1) {
    level = "critical";
  } else if (score >= 40 || divergences.length === 1) {
    level = "warning";
  }

  const summary = analysisReason || "Item aguardando análise e validação do coordenador.";

  return {
    level,
    score,
    divergences,
    summary,
    reasons,
  };
}

export function sortReviewsByRisk(items: ReviewItem[]): ReviewItem[] {
  return [...items].sort((a, b) => {
    const riskA = evaluateReviewRisk(a);
    const riskB = evaluateReviewRisk(b);

    if (riskA.level !== riskB.level) {
      const order = { critical: 0, warning: 1, normal: 2 };
      return order[riskA.level] - order[riskB.level];
    }

    return riskB.score - riskA.score;
  });
}
