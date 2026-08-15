import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { LogoutButton } from "@/app/(app)/LogoutButton";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, PromoterMe } from "@/lib/api/types";
import { roleLabels } from "@/lib/candidate/labels";
import { readUnlockedSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Conta" };

// Estado de análise em pt-BR (enum cru nunca chega ao usuário).
const DOC_STATUS_LABEL: Record<string, string> = {
  approved: "verificado ✓",
  pending: "em análise",
  review: "em revisão",
  rejected: "reprovado",
};

/**
 * Conta do promotor/candidato: identidade + o que está cadastrado (tudo
 * mascarado) + papéis ativos amigáveis + sair. Dados de `whoami` +
 * `candidate/me` + `promoter/me`, cada um só quando a role permite.
 */
export default async function ContaPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  const [me, promoter] = await Promise.all([
    session.roles.includes("candidate")
      ? djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me").catch(() => null)
      : Promise.resolve(null),
    session.roles.includes("promoter")
      ? djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me").catch(() => null)
      : Promise.resolve(null),
  ]);

  // `documents` é bloco rico por tipo — o tipo vem da presença de rg/cnh.
  const docSlot = me?.documents?.rg ?? me?.documents?.cnh ?? null;
  const docType = me?.documents?.rg ? "RG" : me?.documents?.cnh ? "CNH" : null;
  const address = me?.address ?? null;
  const takenAt = me?.selfie?.taken_at ?? null;
  const selfiePhoto =
    typeof me?.selfie?.photo === "string" && /^https?:\/\//i.test(me.selfie.photo)
      ? me.selfie.photo
      : null;
  const signatureVerified = me?.selfie?.analysis_status === "approved";
  const pixValidated = me?.pix_validated === true;
  const labels = roleLabels(session.roles);
  const initials = (session.name ?? "V7M")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <PageShell>
      <CompactHeader kicker="V7M · Você" title="Sua conta" />

      {/* Identidade — thumb da selfie quando houver; senão, iniciais */}
      <div className="auth-card flex items-center gap-4">
        {selfiePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto vem do backend, domínio desconhecido em build
          <img
            src={selfiePhoto}
            alt="Sua selfie"
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--gold-grad)] font-display text-lg text-[var(--surface-text)]"
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-lg truncate">{session.name ?? "—"}</p>
          <p className="text-sm text-[var(--surface-text-muted)] flex flex-wrap items-center gap-2">
            {promoter && (
              <Badge tone={promoter.status === "active" ? "ok" : "danger"}>
                {promoter.status === "active" ? "Ativo" : "Suspenso"}
              </Badge>
            )}
            <span>
              {labels.join(" · ") || "—"}
              {signatureVerified ? " · assinatura verificada ✓" : ""}
            </span>
          </p>
        </div>
      </div>

      {/* Cadastro — telefone/CPF ficam de fora até o whoami expor (P2.1) */}
      <div className="auth-card divide-y divide-[var(--surface-border)]">
        {docType && (
          <Row label="Documento">
            {docType}
            {typeof docSlot?.validation_status === "string"
              ? ` · ${DOC_STATUS_LABEL[docSlot.validation_status] ?? "—"}`
              : ""}
          </Row>
        )}
        {address?.city && (
          <Row label="Endereço">
            {address.city}
            {address.state ? ` / ${address.state}` : ""}
          </Row>
        )}
        {pixValidated && <Row label="Chave Pix">validada ✓</Row>}
        {takenAt && (
          <Row label="Selfie assinada em">
            {new Date(takenAt).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </Row>
        )}
        <Row label="Papéis ativos">{labels.join(" · ") || "—"}</Row>
        <div className="pt-3">
          <LogoutButton className="inline-flex items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:border-danger hover:text-danger" />
        </div>
      </div>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-[var(--surface-text-muted)] text-right">{children}</p>
    </div>
  );
}
