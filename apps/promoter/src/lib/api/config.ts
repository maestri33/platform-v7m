/**
 * Configuração de ambiente (server-side).
 *
 * Lê do `.env` / process.env no boot do server. Não exposto ao client.
 * `BACKEND_URL` = endereço do Django+Ninja:
 *   dev  → http://localhost:80 (default)
 *   prod → https://backend.v7m.live  (setado pelo runtime/CD, ver .env.example)
 */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:80";

const validAppEnvs = new Set(["prod", "staging", "preview", "test"]);
export const APP_ENV = process.env.APP_ENV ?? "prod";
if (!validAppEnvs.has(APP_ENV)) {
  throw new Error(`APP_ENV inválido: ${APP_ENV}`);
}

export const isProd = APP_ENV === "prod" && BACKEND_URL.startsWith("https://");
