import "server-only";

/**
 * O assistente da escolaridade só funciona com o OmniRoute configurado
 * (`OMNIROUTE_BASE_URL` + `OMNIROUTE_API_KEY`). Sem isso o cliente aponta pra
 * `/v1` e toda conversa morre — então a etapa abre direto no formulário manual
 * em vez de empurrar todo candidato pra um chat mudo.
 *
 * `server-only`: lê env do servidor, nunca vai pro bundle do client.
 */
export function isEducationAssistantConfigured(): boolean {
  return Boolean(
    process.env.OMNIROUTE_BASE_URL?.trim() && process.env.OMNIROUTE_API_KEY?.trim(),
  );
}
