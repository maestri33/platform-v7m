import type { BlockOut, ExplainedBlock } from "./types";

/**
 * Traduz descrições técnicas de bloqueio e recusas em orientações claras e práticas em português.
 * Regras claras, sem jargões jurídicos ou termos de infraestrutura.
 */
export function explainBlock(block: BlockOut): ExplainedBlock {
  const desc = (block.description || "").toLowerCase();
  const source = (block.source_type || "").toLowerCase();
  const title = block.title || "Ajuste necessário";

  // RG e Identidade
  if (source.includes("rg") || source.includes("identity") || desc.includes("rg") || desc.includes("cnh")) {
    if (desc.includes("reflexo") || desc.includes("flash") || desc.includes("brilho") || desc.includes("clarão")) {
      return {
        original: block,
        title: "Foto com reflexo no documento",
        friendlyReason: "A luz refletiu nos números do seu documento e impediu a leitura.",
        tip: "Dica: tire a foto em um ambiente iluminado, mas desligue o flash e evite luz direta sobre o plástico.",
        actionLabel: block.action_label || "Tirar nova foto do RG",
        actionRoute: block.action_route || "/matricula",
        severity: "warning",
      };
    }
    if (desc.includes("desfoc") || desc.includes("borrad") || desc.includes("ilegível") || desc.includes("qualidade")) {
      return {
        original: block,
        title: "Foto do documento ficou borrada",
        friendlyReason: "Não conseguimos ler os dados do seu RG porque a imagem ficou desfocada.",
        tip: "Dica: apoie o documento sobre uma mesa reta e segure o celular firme ao clicar.",
        actionLabel: block.action_label || "Reenviar foto do RG",
        actionRoute: block.action_route || "/matricula",
        severity: "warning",
      };
    }
    if (desc.includes("cort") || desc.includes("borda") || desc.includes("incomplet")) {
      return {
        original: block,
        title: "Documento cortado na foto",
        friendlyReason: "As bordas do seu RG ficaram de fora da imagem.",
        tip: "Dica: afaste um pouco a câmera para que apareçam os quatro cantos do documento.",
        actionLabel: block.action_label || "Enquadrar documento",
        actionRoute: block.action_route || "/matricula",
        severity: "warning",
      };
    }
    return {
      original: block,
      title: block.title || "Reenvio de documento necessário",
      friendlyReason: block.description || "Precisamos de uma nova foto do seu documento para prosseguir com a matrícula.",
      tip: "Dica: certifique-se de que todos os dados estejam 100% legíveis e sem cortes.",
      actionLabel: block.action_label || "Ajustar documento",
      actionRoute: block.action_route || "/matricula",
      severity: "warning",
    };
  }

  // Comprovante de Residência
  if (source.includes("address") || desc.includes("endereço") || desc.includes("residência") || desc.includes("comprovante")) {
    if (desc.includes("90 dias") || desc.includes("antigo") || desc.includes("vencid") || desc.includes("data")) {
      return {
        original: block,
        title: "Comprovante de endereço antigo",
        friendlyReason: "O comprovante enviado tem mais de 90 dias.",
        tip: "Dica: envie uma conta de luz, água, gás ou internet dos últimos 3 meses.",
        actionLabel: block.action_label || "Enviar comprovante recente",
        actionRoute: block.action_route || "/matricula",
        severity: "warning",
      };
    }
    if (desc.includes("parentesco") || desc.includes("titular") || desc.includes("nome de terceiro") || desc.includes("kinship")) {
      return {
        original: block,
        title: "Confirmação de parentesco necessária",
        friendlyReason: "A conta enviada está no nome de outra pessoa.",
        tip: "Dica: confirme o parentesco (pais, cônjuge, etc.) para que possamos validar o endereço.",
        actionLabel: block.action_label || "Confirmar parentesco",
        actionRoute: block.action_route || "/matricula",
        severity: "info",
      };
    }
    return {
      original: block,
      title: "Comprovante de residência",
      friendlyReason: block.description || "Por favor, envie um comprovante de residência legível e recente.",
      tip: "Dica: contas de concessionárias públicas (água/luz) são aprovadas mais rápido.",
      actionLabel: block.action_label || "Reenviar comprovante",
      actionRoute: block.action_route || "/matricula",
      severity: "warning",
    };
  }

  // Selfie / Assinatura
  if (source.includes("selfie") || desc.includes("selfie") || desc.includes("rosto") || desc.includes("facial")) {
    if (desc.includes("óculos") || desc.includes("boné") || desc.includes("acessório") || desc.includes("chapéu")) {
      return {
        original: block,
        title: "Rosto coberto na selfie",
        friendlyReason: "Não foi possível validar sua selfie para a assinatura do contrato.",
        tip: "Dica: retire boné, óculos escuros ou qualquer acessório que cubra o rosto.",
        actionLabel: block.action_label || "Tirar nova selfie",
        actionRoute: block.action_route || "/matricula",
        severity: "warning",
      };
    }
    return {
      original: block,
      title: "Validação da selfie",
      friendlyReason: block.description || "Precisamos de uma nova foto do seu rosto para confirmar sua assinatura.",
      tip: "Dica: centralize o rosto no contorno indicado e fique em um lugar bem iluminado.",
      actionLabel: block.action_label || "Refazer selfie",
      actionRoute: block.action_route || "/matricula",
      severity: "warning",
    };
  }

  // Pagamento / Financeiro
  if (source.includes("payment") || desc.includes("pagamento") || desc.includes("pix") || desc.includes("cartão") || desc.includes("taxa")) {
    return {
      original: block,
      title: title || "Confirmação de pagamento",
      friendlyReason: block.description || "Identificamos uma pendência de pagamento para liberar sua próxima etapa.",
      tip: "Dica: pagamentos via Pix são compensados em poucos segundos.",
      actionLabel: block.action_label || "Ver opções de pagamento",
      actionRoute: block.action_route || "/checkout",
      severity: "error",
    };
  }

  // Genérico / Default
  return {
    original: block,
    title,
    friendlyReason: block.description || "Há uma pendência que precisa da sua atenção para continuar.",
    tip: "Clique no botão abaixo para resolver agora mesmo.",
    actionLabel: block.action_label || "Resolver agora",
    actionRoute: block.action_route || "/painel",
    severity: "warning",
  };
}
