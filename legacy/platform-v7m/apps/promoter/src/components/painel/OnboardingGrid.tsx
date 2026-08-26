import {
  Camera,
  CheckCircle2,
  GraduationCap,
  Home,
  IdCard,
  KeyRound,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { OnboardingStep, OnboardingSteps } from "@/lib/api/types";

/**
 * Grade de 5 cards que substitui o wizard forçado. Cada card é um
 * `<Link>` para a rota da etapa correspondente — o usuário faz na ordem
 * que quiser, no seu ritmo. Ao terminar, cada etapa volta pro `/painel`
 * (não avança pra próxima).
 *
 * Estados visuais:
 *  - `done` + `status === "approved"`  → card "concluído" (verde, sem CTA)
 *  - `done` + `status === "rejected"` → card "refazer" (âmbar, CTA = refazer)
 *  - `!done` + `reason` definido      → card "rejeitado" (CTA = refazer)
 *  - `!done` + `status === "review"`  → card "em revisão" (azul, sem CTA)
 *  - `!done`                          → card pendente (CTA = "Concluir")
 *
 * Ícones Lucide (não emoji — design system proíbe). Acessibilidade: cada
 * card é um link com `aria-label` que descreve o estado.
 */
export function OnboardingGrid({ steps }: { steps: OnboardingSteps }) {
  const tiles: Tile[] = [
    {
      key: "documents",
      label: "RG ou CNH",
      hint: "Documento com foto",
      icon: IdCard,
      step: steps.documents,
      href: "/documento",
    },
    {
      key: "address",
      label: "Comprovante",
      hint: "Conta de luz, água etc.",
      icon: Home,
      step: steps.address,
      href: "/endereco",
    },
    {
      key: "pix",
      label: "Chave Pix",
      hint: "Pra receber comissões",
      icon: KeyRound,
      step: steps.pix,
      href: "/pix",
    },
    {
      key: "education",
      label: "Escolaridade",
      hint: "Última série cursada",
      icon: GraduationCap,
      step: steps.education,
      href: "/escolaridade",
    },
    {
      key: "selfie",
      label: "Selfie",
      hint: "Assinatura eletrônica",
      icon: Camera,
      step: steps.selfie,
      href: "/selfie",
    },
  ];

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-text-muted)]">
        Conclua para receber
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {tiles.map((tile) => (
          <TileCard key={tile.key} tile={tile} />
        ))}
      </ul>
    </div>
  );
}

type Tile = {
  key: keyof OnboardingSteps;
  label: string;
  hint: string;
  icon: typeof IdCard;
  step: OnboardingStep;
  href: string;
};

function TileCard({ tile }: { tile: Tile }) {
  const { done, status, reason } = tile.step;
  const Icon = tile.icon;

  // ── concluído ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <li>
        <a
          href={tile.href}
          aria-label={`${tile.label}: concluído. Toque para revisar.`}
          className="group flex h-full min-h-[112px] flex-col justify-between gap-2 rounded-[var(--radius)] border border-ok/40 bg-ok/8 p-3 transition-colors hover:border-ok focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ok"
        >
          <div className="flex items-start justify-between">
            <Icon aria-hidden className="size-5 text-ok" />
            <CheckCircle2 aria-hidden className="size-4 text-ok" />
          </div>
          <div>
            <p className="font-display text-sm leading-snug text-[var(--surface-text)]">
              {tile.label}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--surface-text-muted)]">
              Concluído
            </p>
          </div>
        </a>
      </li>
    );
  }

  // ── em revisão (humana) ───────────────────────────────────────────────────
  if (status === "review" || status === "pending") {
    return (
      <li>
        <a
          href={tile.href}
          aria-label={`${tile.label}: em análise. Toque para ver detalhes.`}
          className="group flex h-full min-h-[112px] flex-col justify-between gap-2 rounded-[var(--radius)] border border-info/40 bg-info/8 p-3 transition-colors hover:border-info focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
        >
          <div className="flex items-start justify-between">
            <Icon aria-hidden className="size-5 text-info" />
            <RefreshCcw aria-hidden className="size-4 text-info" />
          </div>
          <div>
            <p className="font-display text-sm leading-snug text-[var(--surface-text)]">
              {tile.label}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--surface-text-muted)]">
              Em análise
            </p>
          </div>
        </a>
      </li>
    );
  }

  // ── rejeitado (precisa refazer) ───────────────────────────────────────────
  if (status === "rejected" || (reason && status !== "approved")) {
    return (
      <li>
        <a
          href={tile.href}
          aria-label={`${tile.label}: precisa refazer. ${reason ?? ""} Toque para abrir.`}
          className="group flex h-full min-h-[112px] flex-col justify-between gap-2 rounded-[var(--radius)] border border-warn/40 bg-warn/10 p-3 transition-colors hover:border-warn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn"
        >
          <div className="flex items-start justify-between">
            <Icon aria-hidden className="size-5 text-warn" />
            <TriangleAlert aria-hidden className="size-4 text-warn" />
          </div>
          <div>
            <p className="font-display text-sm leading-snug text-[var(--surface-text)]">
              {tile.label}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--surface-text-muted)]">
              {reason ? "Refazer · " + truncate(reason, 40) : "Refazer"}
            </p>
          </div>
        </a>
      </li>
    );
  }

  // ── pendente (ainda não enviado) ──────────────────────────────────────────
  return (
    <li>
      <a
        href={tile.href}
        aria-label={`${tile.label}: pendente. ${tile.hint}. Toque para concluir.`}
        className="group flex h-full min-h-[112px] flex-col justify-between gap-2 rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 transition-colors hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
      >
        <div className="flex items-start justify-between">
          <Icon
            aria-hidden
            className="size-5 text-[var(--surface-text-muted)] group-hover:text-brand-gold"
          />
          <Badge tone="muted">Pendente</Badge>
        </div>
        <div>
          <p className="font-display text-sm leading-snug text-[var(--surface-text)]">
            {tile.label}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--surface-text-muted)]">
            {tile.hint}
          </p>
        </div>
      </a>
    </li>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
