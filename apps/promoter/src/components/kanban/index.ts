// Barrel do módulo Kanban Glass Columns. Surface pública mínima:
// board + átomos + tipos + variantes independentes. Tudo o que é
// interno (helpers de classe, resolução de colunas) fica fora daqui.
export { KanbanBoard } from "./KanbanBoard";
export type { KanbanBoardProps } from "./KanbanBoard";
export { KanbanColumn } from "./KanbanColumn";
export { KanbanCard } from "./KanbanCard";
export type { KanbanItem, KanbanColumnDef } from "./types";

// Variantes drop-in (cada uma é um board independente que pode ser
// copiado pra outro projeto sem precisar do resto do módulo).
export { KanbanAttentionBoard } from "./variants/AttentionBoard";
export type { AttentionItem } from "./variants/AttentionBoard";
export { KanbanWithAvatarsBoard } from "./variants/WithAvatarsBoard";
export type { WithAvatarItem } from "./variants/WithAvatarsBoard";
export { KanbanSectionedBoard } from "./variants/SectionedBoard";
export type { SectionedItem } from "./variants/SectionedBoard";
export { KanbanCompactMobileBoard } from "./variants/CompactMobileBoard";
export type { CompactItem } from "./variants/CompactMobileBoard";
export { Avatar, AvatarStack } from "./variants/Avatar";
export type { KanbanAssignee, KanbanCardState, KanbanCardAccent } from "./variants/types";
