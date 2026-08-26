/**
 * Auth server-side: lê o cookie `v7m_access` e devolve a sessão
 * (ou `null` se não autenticado / token expirado).
 *
 * O JWT é **opaco** pro front — quem valida é o Django. O Next só repassa.
 */
import "server-only";

import { cookies } from "next/headers";

import { djangoFetch } from "@/lib/api/client";


// `WhoamiOut` real = {external_id, roles, name} — phone/cpf NÃO vêm (P2.1).
export type Session = {
  external_id: string;
  roles: string[];
  name: string | null;
};

// Roteamento por role vive em `lib/auth/roles.ts`. A área de coordenação mora
// num app separado (hub.maestri.group) — coordinator/staff no JWT acessam este app
// como promotor (todo coordenador é promotor).

/** Lê o cookie; se houver, consulta o whoami do Django (devolve TODAS as roles). */
export async function readSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get("v7m_access")?.value;
  if (!access) return null;

  try {
    return await djangoFetch<Session>("/api/v1/collaborators/whoami");
  } catch {
    return null;
  }
}

/**
 * Sessão autenticada do colaborador.
 * No modelo assíncrono, a verificação de `training` não sequestra o roteamento.
 */
export async function readUnlockedSession(): Promise<Session | null> {
  return readSession();
}

