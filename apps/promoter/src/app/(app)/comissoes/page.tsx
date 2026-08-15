import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { Commission } from "@/lib/api/types";
import { formatBRL } from "@/lib/format";
import { readUnlockedSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Comissões" };

// Origem da comissão em pt-BR (enum cru do backend nunca chega ao usuário).
const SOURCE_LABEL: Record<string, string> = {
  lead: "Matrícula paga",
  enrollment: "Matrícula paga",
  bonus: "Bônus da meta",
  goal_bonus: "Bônus da meta",
};

function sourceLabel(sourceType: string): string {
  return SOURCE_LABEL[sourceType] ?? "Comissão";
}

export default async function ComissoesPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const commissions = await djangoFetch<Commission[]>(
    "/api/v1/collaborators/promoter/me/commissions",
  );

  // `amount` é STRING decimal — somar como número só pra exibir.
  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Promotor"
        title="Suas comissões"
        subtitle="R$100 por matrícula paga + R$500 de bônus fixo ao bater 5 na semana. Fecha toda sexta às 18h, pago via Pix."
      />

      <div className="auth-card grid gap-3 sm:grid-cols-2">
        <Stat label="Pendente" value={formatBRL(totalPending)} />
        <Stat label="Pago" value={formatBRL(totalPaid)} />
      </div>

      {commissions.length === 0 ? (
        <div className="auth-card text-[var(--surface-text-muted)]">
          Suas comissões vão aparecer aqui depois do primeiro fechamento —
          toda sexta às 18h, direto na sua chave Pix. Bora buscar a primeira?
        </div>
      ) : (
        <ul className="space-y-3">
          {commissions.map((c) => (
            <li key={c.external_id}>
              <div className="auth-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">{formatBRL(c.amount)}</p>
                    <p className="text-xs text-[var(--surface-text-muted)]">
                      {sourceLabel(c.source)} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge
                    tone={
                      c.status === "paid"
                        ? "ok"
                        : c.status === "failed"
                          ? "danger"
                          : "muted"
                    }
                  >
                    {c.status === "paid"
                      ? "Paga"
                      : c.status === "failed"
                        ? "Falhou"
                        : "Pendente"}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
