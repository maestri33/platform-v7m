// Avatar reutilizável pelas variantes. Renderiza:
//   - se `src` válida: <img> circular 24px
//   - senão: span circular com iniciais, fundo gold-soft, texto black
//
// Agnóstico de tema (cores via tokens). Não usa libs externas.

import type { KanbanAssignee } from "./types";

export function Avatar({
  assignee,
  size = 24,
}: {
  assignee: KanbanAssignee;
  size?: number;
}) {
  const dim = `${size}px`;
  if (assignee.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10"
        style={{ width: dim, height: dim }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assignee.avatarUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[var(--black)]"
      style={{
        width: dim,
        height: dim,
        fontSize: `${Math.max(9, Math.round(size * 0.45))}px`,
        background: "var(--gold-soft)",
        color: "var(--black)",
      }}
    >
      {assignee.initials.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Grupo de avatares (stack com overlap negativo). Limita a 3 + "+N". */
export function AvatarStack({
  assignees,
  max = 3,
  size = 22,
}: {
  assignees: KanbanAssignee[];
  max?: number;
  size?: number;
}) {
  if (assignees.length === 0) return null;
  const visible = assignees.slice(0, max);
  const overflow = assignees.length - visible.length;
  return (
    <span className="inline-flex items-center">
      {visible.map((a, i) => (
        <span
          key={`${a.name}-${i}`}
          className="ring-1 ring-[var(--char-2)]"
          style={{ marginLeft: i === 0 ? 0 : -6, borderRadius: "9999px" }}
        >
          <Avatar assignee={a} size={size} />
        </span>
      ))}
      {overflow > 0 ? (
        <span
          aria-hidden="true"
          className="ml-[-6px] inline-flex items-center justify-center rounded-full border border-white/10 bg-[var(--char-2)] text-[10px] font-semibold text-[var(--paper)] ring-1 ring-[var(--char-2)]"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
