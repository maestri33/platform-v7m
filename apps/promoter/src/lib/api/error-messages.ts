// Mensagens de erro pt-BR do funil do candidato, roteadas por `code` do envelope
// {detail, code, ...extra} do backend (CONVENTION §3 — NUNCA parsear `detail`).
// Um único mapa compartilhado: telas passam o `code` e recebem copy acolhedora
// com o caminho de saída. Casos com copy específica de tela (ex.: PIX_INVALID com
// `reason`, upload de imagem) ficam na própria tela; este é o piso comum.
//
// Substitui os ~5 sites que mostravam `detail` cru e o getErrorMessage() morto.

export type ApiErrorExtra = {
  retry_after_s?: number;
  expected_status?: string;
  reason?: string;
  allowed?: string[];
};

/** Piso comum de mensagens por `code`. Retorna null quando não há caso — a tela
 *  decide o fallback (normalmente `detail` já normalizado pelo client). */
export function apiErrorMessage(
  code: string | undefined,
  detail: string | undefined,
  extra?: ApiErrorExtra,
): string {
  switch (code) {
    // ── Sessão / permissão ────────────────────────────────────────────────
    case "UNAUTHORIZED":
    case "SESSION_EXPIRED":
      return "Sua sessão expirou. Entre de novo pra continuar.";
    case "NOT_IN_FUNNEL":
      return "Seu número existe, mas ainda não está no programa de promotores. Entre pelo link de indicação ou fale com o suporte.";
    case "FORBIDDEN_ROLE":
    case "ROLE_NOT_HELD":
      return "Esse acesso não é pro seu perfil agora.";

    // ── Ritmo / rede ──────────────────────────────────────────────────────
    case "RATE_LIMITED":
      return `Muitas tentativas seguidas. Respira ${
        extra?.retry_after_s ? `${extra.retry_after_s} segundos` : "um instante"
      } e tente de novo.`;
    case "INTERNAL":
      return "Tivemos um problema aqui do nosso lado. Tente de novo em instantes.";

    // ── Fluxo do funil ────────────────────────────────────────────────────
    case "WRONG_STATUS":
      // Normalmente a tela redireciona pela etapa certa; a msg é só fallback.
      return "Essa etapa já foi concluída ou ainda não chegou a vez dela.";
    case "MISSING_FIELD":
    case "VALIDATION_ERROR":
      return detail ?? "Confira os campos e tente de novo.";

    // ── Documento ─────────────────────────────────────────────────────────
    case "IMAGE_TYPE_INVALID":
    case "INVALID_DOC_TYPE":
      return "Esse formato a gente ainda não lê — envie uma foto (JPEG, PNG, WEBP) ou um PDF.";
    case "IMAGE_TOO_LARGE":
      return "O arquivo ficou pesado demais. Uma foto mais leve resolve.";
    case "DOC_TYPE_LOCKED":
      return "O tipo do documento já foi definido no primeiro envio — mantenha o mesmo.";
    case "DOC_TYPE_NOT_SET":
      return "Envie primeiro a foto do documento pra gente identificar o tipo.";
    case "SLOT_INVALID":
      return "Essa foto não encaixa aqui. Recarregue a página e tente de novo.";
    case "DOC_NOT_IN_REVIEW":
      return "Esse documento não está em análise agora.";

    // ── Endereço / comprovante ────────────────────────────────────────────
    case "DESCRIPTION_REQUIRED":
      return "Conte rapidinho de quem é o comprovante pra gente liberar.";

    // ── Pix ───────────────────────────────────────────────────────────────
    case "PROFILE_CPF_MISSING":
      return "Precisamos do seu CPF no cadastro antes de validar a chave Pix.";
    case "PIX_INVALID":
      return extra?.reason
        ? `Não validamos essa chave: ${extra.reason}`
        : "Essa chave Pix não passou. Confira e tente de novo.";

    // ── Escolaridade ──────────────────────────────────────────────────────
    case "EDUCATION_LEVEL_INVALID":
      return "Selecione um nível de escolaridade válido.";

    // ── Selfie ────────────────────────────────────────────────────────────
    case "SELFIE_NOT_IN_REVIEW":
      return "Sua selfie não está em análise manual agora.";

    // ── Cadastro (CPF/telefone/e-mail) ────────────────────────────────────
    case "CPF_INVALID":
      return "Esse CPF não fechou — confira os números.";
    case "CPF_NOT_FOUND":
      return "Não achamos esse CPF na Receita. Confira os números.";
    case "PHONE_INVALID":
      return "Telefone inválido. Confira o DDD e o número.";

    default:
      return detail ?? "Não deu pra completar agora. Tente de novo em instantes.";
  }
}
