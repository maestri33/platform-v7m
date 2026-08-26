// Extensões opcionais que as variantes de KanbanBoard leem dos items
// (KanbanItem já aceita `[key: string]: unknown`, então estes tipos são
// apenas contratos de leitura — não precisam ser aplicados em runtime).

/** Estados visuais suportados pelas variantes. */
export type KanbanCardState =
  | "default"
  | "attention"
  | "success"
  | "info"
  | "muted";

/** Identidade visual de uma pessoa (avatar opcional). */
export type KanbanAssignee = {
  name: string;
  /** URL de foto opcional; quando ausente, usa `initials` como fallback. */
  avatarUrl?: string | null;
  /** Iniciais (1-2 caracteres) renderizadas sobre fundo gold quando sem foto. */
  initials: string;
};

export type KanbanCardAccent =
  | "gold"
  | "ok"
  | "info"
  | "danger"
  | "muted";

/** Cor de acento (vinda da coluna) usada no SectionedBoard. */
export type KanbanSectionAccent = KanbanCardAccent;

/** Mapa de cor por accent — usado pelas variantes (sem tocar tokens). */
export const ACCENT_TOKENS: Record<KanbanCardAccent, { color: string; bg: string; ring: string }> = {
  gold: {
    color: "var(--gold-soft)",
    bg: "rgba(217, 177, 90, 0.18)",
    ring: "rgba(217, 177, 90, 0.55)",
  },
  ok: {
    color: "var(--ok-soft)",
    bg: "rgba(47, 143, 91, 0.20)",
    ring: "rgba(47, 143, 91, 0.45)",
  },
  info: {
    color: "var(--info-soft)",
    bg: "rgba(47, 111, 176, 0.20)",
    ring: "rgba(47, 111, 176, 0.45)",
  },
  danger: {
    color: "var(--danger-soft)",
    bg: "rgba(192, 57, 43, 0.20)",
    ring: "rgba(255, 107, 107, 0.55)",
  },
  muted: {
    color: "var(--muted-on-dark)",
    bg: "rgba(255, 255, 255, 0.06)",
    ring: "rgba(255, 255, 255, 0.18)",
  },
};
