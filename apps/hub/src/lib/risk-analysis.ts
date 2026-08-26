import type { ReviewItem } from "./types";

export interface RiskEvaluation {
  level: "critical" | "warning" | "normal";
  score: number; // 0 to 100
  divergences: string[];
  summary: string;
  reasons: string[];
}

/**
 * Normaliza strings para comparação fonética/textual básica.
 */
function normalize(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Avalia divergência de nome entre cadastro e documento extraído.
 */
export function checkNameDivergence(
  registeredName: string | null | undefined,
  extractedName: string | null | undefined,
): { hasDivergence: boolean; similarity: number; message?: string } {
  const reg = normalize(registeredName);
  const ext = normalize(extractedName);

  if (!reg || !ext) {
    return { hasDivergence: false, similarity: 1 };
  }

  if (reg === ext) {
    return { hasDivergence: false, similarity: 1 };
  }

  const regTokens = reg.split(/\s+/).filter(Boolean);
  const extTokens = ext.split(/\s+/).filter(Boolean);

  // Primeiro e último nome coincidem?
  const firstMatch = regTokens[0] === extTokens[0];
  const lastMatch = regTokens[regTokens.length - 1] === extTokens[extTokens.length - 1];

  // Interseção de palavras
  const common = regTokens.filter((token) => extTokens.includes(token));
  const similarity = (2 * common.length) / (regTokens.length + extTokens.length);

  if (firstMatch && lastMatch && similarity >= 0.6) {
    return {
      hasDivergence: false,
      similarity,
      message: "Variação menor de grafia ou abreviação intermediária.",
    };
  }

  if (similarity < 0.5) {
    return {
      hasDivergence: true,
      similarity,
      message: `Divergência expressiva de nome: cadastrado "${registeredName}" vs doc "${extractedName}".`,
    };
  }

  return {
    hasDivergence: true,
    similarity,
    message: `Possível divergência no nome: cadastrado "${registeredName}" vs doc "${extractedName}".`,
  };
}

/**
 * Gera o resumo do caso e avaliação de risco a partir dos dados do item de revisão.
 */
export function evaluateReviewRisk(item: ReviewItem): RiskEvaluation {
  const divergences: string[] = [];
  const reasons: string[] = [];
  let score = 20; // pontuação base

  const analysisReason = item.analysis_reason || item.validation_reason || "";
  const analysisStatus = item.analysis_status || item.validation_status || "";

  // 1. Verificação de status de análise do backend / OCR
  if (analysisStatus === "rejected" || analysisStatus === "failed") {
    score += 50;
    reasons.push(`Análise prévia falhou: ${analysisReason || "Documento com inconformidade detectada"}`);
    divergences.push("Falha de validação automática");
  } else if (analysisStatus === "manual_review" || analysisStatus === "pending") {
    score += 25;
    if (analysisReason) reasons.push(analysisReason);
  }

  // 2. Análise de palavras-chave no motivo da IA
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

  // 3. Tempo na fila
  if (item.since) {
    try {
      const waitDays = (Date.now() - new Date(item.since).getTime()) / (1000 * 60 * 60 * 24);
      if (waitDays > 2) {
        score += 15;
        reasons.push(`Aguardando revisão há mais de ${Math.floor(waitDays)} dias.`);
      }
    } catch {
      // Ignore date parsing
    }
  }

  // 4. Se for promotor travado no treino
  if (item.kind === "locked_training") {
    score += 20;
    reasons.push("Promotor com matéria de treino bloqueada aguardando liberação do coordenador.");
  }

  // Determinação do Nível
  let level: "critical" | "warning" | "normal" = "normal";
  if (score >= 65 || divergences.length > 1) {
    level = "critical";
  } else if (score >= 40 || divergences.length === 1) {
    level = "warning";
  }

  // Resumo IA sintético
  let summary = "";
  if (item.kind === "rg" || item.kind === "document") {
    if (level === "critical") {
      summary = `Atenção: Validação do documento ${item.doc_type || "RG"} identificou possíveis inconformidades ou baixa legibilidade. Revise atentamente a foto antes de aprovar.`;
    } else if (level === "warning") {
      summary = `Revisão do documento ${item.doc_type || "RG"}: Dados extraídos com ressalvas pontuais. Requer confirmação visual do coordenador.`;
    } else {
      summary = `Documento ${item.doc_type || "RG"} processado pelo sistema. Verifique a conformidade visual e decida.`;
    }
  } else if (item.kind === "selfie") {
    if (level === "critical") {
      summary = "Atenção: A biometria facial indicou baixa correspondência ou inconsistência de enquadramento com a foto do documento.";
    } else {
      summary = "Selfie de assinatura pendente de confirmação visual com o documento cadastrado.";
    }
  } else if (item.kind === "locked_training") {
    summary = "Promotor concluiu tentativa do módulo de capacitação e necessita de liberação de matéria pelo polo.";
  } else if (item.kind === "awaiting_approval") {
    summary = "Candidato concluiu todas as etapas cadastrais e aguarda homologação do coordenador para se tornar Promotor.";
  } else {
    summary = analysisReason || "Item aguardando análise e validação do coordenador.";
  }

  return {
    level,
    score,
    divergences,
    summary,
    reasons,
  };
}

/**
 * Ordena fila de revisões priorizando risco crítico e tempo de espera.
 */
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
