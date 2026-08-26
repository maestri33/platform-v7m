/**
 * Auth server-side: lê o cookie `v7m_access` e devolve a sessão
 * (ou `null` se não autenticado / token expirado).
 *
 * O JWT é **opaco** pro front — quem valida é o Django. O Next só repassa.
 */
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/api/client";
import { isTrainingLocked } from "@/lib/auth/roles";

// `WhoamiOut` real = {external_id, roles, name} — phone/cpf NÃO vêm (P2.1).
export type Session = {
  external_id: string;
  roles: string[];
  name: string | null;
};

// Roteamento por role vive em `lib/auth/roles.ts`. A área de coordenação mora
// num app separado (hub.v7m.org) — coordinator/staff no JWT acessam este app
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
 * Sessão com a TRAVA de treinamento aplicada. Use nas telas de promotor e
 * coordenação: se `training` está nas roles, manda a pessoa pro LMS e não deixa
 * sair até o back parar de devolver `training` (curso inicial OU atualização/
 * recado obrigatório). As telas do LMS (`/treinamento`) usam `readSession`, não
 * esta — senão entram em loop de redirect.
 */
export async function readUnlockedSession(): Promise<Session | null> {
  const session = await readSession();
  if (!session) return null;
  if (isTrainingLocked(session.roles)) redirect("/treinamento");
  return session;
}
