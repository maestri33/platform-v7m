// Tipos genéricos e agnósticos de domínio para o Kanban Glass Columns.
// O componente NÃO impõe schema: cada item é um registro com `id` e
// `columnId` obrigatórios, e qualquer outro campo (title, tags, assignee,
// due, priority, …) é transportado como `unknown` no índice aberto.
//
// O consumidor (página / rota / store) tipa o item com a forma concreta
// (ex.: `type Card = KanbanItem & { title: string; tags: string[] }`) e
// injeta os renderizadores via `renderCard` / `renderMeta` / `renderTags`.

/** Item mínimo do kanban: id estável + coluna atual. */
export type KanbanItem = {
  id: string;
  columnId: string;
  // O índice aberto permite anexar qualquer domínio sem re-tipagem do
  // componente. O consumidor usa `render*` props para projetar.
  [key: string]: unknown;
};

/** Definição estática de coluna (id + título visível + acento opcional). */
export type KanbanColumnDef = {
  id: string;
  title: string;
  /** Acento opcional para o header/pílula — só cosmético. */
  accent?: "gold" | "ok" | "info" | "muted";
};
