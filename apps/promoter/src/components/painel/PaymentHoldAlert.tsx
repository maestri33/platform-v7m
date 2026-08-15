import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { formatBRL } from "@/lib/format";

/**
 * Banner persistente no topo do `/painel` enquanto o candidato não concluiu
 * o onboarding (ou o polo ainda não aprovou). Não-dismissable: esconder
 * significa esquecer de receber, e o custo de não-receber é alto.
 *
 * Três estados visuais (mesma cor da família semântica — `--warn` / `--ok`):
 *  - `onboarding_incomplete` (âmbar + ícone AlertTriangle)
 *  - `pending_polo_approval` (azul-info + ícone Clock3) — onboarding 100%,
 *    aguardando análise do coordenador do polo
 *  - `none` (verde + CheckCircle2) — pagamento liberado, aprovado
 *
 * Copy explica o "porquê" e o "quando" sem juridiquês. Tom direto, sem
 * emoji (o design system proíbe emoji como ícone — trocamos por Lucide).
 */
export function PaymentHoldAlert({
  reason,
  pendingCount,
  amountHeld,
  nextPayoutAt,
  poloWhatsapp,
}: {
  reason: "none" | "onboarding_incomplete" | "pending_polo_approval";
  pendingCount: number;
  amountHeld: string;
  nextPayoutAt: string | null;
  /**
   * WhatsApp do polo (apenas dígitos, ex.: "5531999998888"). Se informado, os
   * estados de hold mostram "Falar com o polo" — o momento de pico de ansiedade
   * (dinheiro retido) ganha uma saída humana de 1 toque.
   */
  poloWhatsapp?: string;
}) {
  if (reason === "none") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-[var(--radius)] border border-ok/40 bg-ok/8 p-4"
      >
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-ok" />
        <div className="min-w-0">
          <p className="font-display text-base text-[var(--surface-text)]">
            Pagamento liberado
          </p>
          <p className="mt-0.5 text-sm text-[var(--surface-text-muted)]">
            Suas comissões entram no Pix toda sexta às 18h.
          </p>
        </div>
      </div>
    );
  }

  if (reason === "pending_polo_approval") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-[var(--radius)] border border-info/40 bg-info/8 p-4"
      >
        <Clock3 aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
        <div className="min-w-0">
          <p className="font-display text-base text-[var(--surface-text)]">
            Cadastro concluído — análise do polo em andamento
          </p>
          <p className="mt-0.5 text-sm text-[var(--surface-text-muted)]">
            Assim que o coordenador confirmar, suas comissões começam a cair na
            sexta seguinte.
          </p>
          <PoloContact whatsapp={poloWhatsapp} />
        </div>
      </div>
    );
  }

  // onboarding_incomplete
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-[var(--radius)] border border-warn/40 bg-warn/10 p-4"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
      <div className="min-w-0">
        <p className="font-display text-base text-[var(--surface-text)]">
          Para você receber, falta{pendingCount === 1 ? "" : "m"}{" "}
          {pendingCount} etapa{pendingCount === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-sm text-[var(--surface-text-muted)]">
          {amountHeld !== "0.00" && Number(amountHeld) > 0 ? (
            <>
              Seu saldo de{" "}
              <strong className="font-semibold text-[var(--surface-text)]">
                {formatBRL(amountHeld)}
              </strong>{" "}
              está acumulado e só libera na próxima sexta depois da última
              etapa.
            </>
          ) : (
            <>Conclua as etapas abaixo pra começar a acumular comissões.</>
          )}
        </p>
        {nextPayoutAt && (
          <p className="mt-1 text-xs text-[var(--surface-text-muted)]">
            Próxima liberação:{" "}
            {new Date(nextPayoutAt).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        )}
        <PoloContact whatsapp={poloWhatsapp} />
      </div>
    </div>
  );
}

/** Link "Falar com o polo no WhatsApp" — só renderiza se houver número. */
function PoloContact({ whatsapp }: { whatsapp?: string }) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--surface-text)] transition-colors hover:border-[var(--surface-border-hover)]"
    >
      Falar com o polo no WhatsApp ↗
    </a>
  );
}
