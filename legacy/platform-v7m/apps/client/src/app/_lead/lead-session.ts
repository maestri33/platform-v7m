/**
 * Sessão do funil do lead (protótipo, em memória) — ponte reativa entre o
 * funil (que sabe quem é o usuário mockado) e o AppHeader global ("Olá, {nome}").
 * Store externo minúsculo p/ useSyncExternalStore: mesmo padrão do session.ts,
 * mas same-tab (o funil não navega entre rotas, então evento de storage não rola).
 */

export interface LeadSession {
  loggedIn: boolean;
  name: string | null;
}

let session: LeadSession = { loggedIn: false, name: null };
const listeners = new Set<() => void>();

export function setLeadSession(next: LeadSession): void {
  if (next.loggedIn === session.loggedIn && next.name === session.name) return;
  session = next;
  for (const listener of listeners) listener();
}

export function subscribeLeadSession(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getLeadSession(): LeadSession {
  return session;
}

/** Snapshot do servidor: referência ESTÁVEL (exigência do useSyncExternalStore). */
const SERVER_SESSION: LeadSession = { loggedIn: false, name: null };

export function getServerLeadSession(): LeadSession {
  return SERVER_SESSION;
}
