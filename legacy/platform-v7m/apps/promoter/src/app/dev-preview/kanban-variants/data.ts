import type { KanbanColumnDef } from "@/components/kanban";
import type {
  AttentionItem,
  CompactItem,
  SectionedItem,
  WithAvatarItem,
} from "@/components/kanban";

export const COLUMNS: KanbanColumnDef[] = [
  { id: "todo", title: "A fazer", accent: "muted" },
  { id: "doing", title: "Em andamento", accent: "info" },
  { id: "done", title: "Concluído", accent: "ok" },
];

export const ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: "a-1",
    columnId: "todo",
    title: "Auditoria de segurança — relatório pendente",
    state: "attention",
  },
  {
    id: "a-2",
    columnId: "todo",
    title: "Definir política de pricing para o trimestre",
  },
  {
    id: "a-3",
    columnId: "doing",
    title: "Migração do banco de leads para Postgres",
    state: "attention",
  },
  {
    id: "a-4",
    columnId: "doing",
    title: "Testes A/B do novo checkout",
  },
  {
    id: "a-5",
    columnId: "done",
    title: "Workshop de Vendas — junho",
  },
];

export const WITH_AVATARS_ITEMS: WithAvatarItem[] = [
  {
    id: "w-1",
    columnId: "todo",
    title: "Benchmark de fornecedores de hospedagem",
    assignee: { name: "Pedro Almeida", initials: "PA" },
    assignees: [
      { name: "Pedro Almeida", initials: "PA" },
      { name: "Lia Fonseca", initials: "LF" },
      { name: "Tiago Ribeiro", initials: "TR" },
      { name: "Helena Prado", initials: "HP" },
    ],
    due: "próxima semana",
  },
  {
    id: "w-2",
    columnId: "doing",
    title: "Atualizar página de produto",
    assignee: { name: "Helena Prado", initials: "HP" },
    due: "15/ago",
  },
  {
    id: "w-3",
    columnId: "done",
    title: "Auditoria de segurança Q2",
    assignee: { name: "Diego Mendes", initials: "DM" },
    due: "concluído",
  },
];

export const SECTIONED_ITEMS: SectionedItem[] = [
  {
    id: "s-1",
    columnId: "todo",
    title: "Revisar contrato com a adquirente",
    assignee: "Lia F.",
    due: "10/ago",
    state: "attention",
  },
  {
    id: "s-2",
    columnId: "doing",
    title: "Migração Postgres",
    assignee: "Bruno S.",
    due: "12/ago",
  },
  {
    id: "s-3",
    columnId: "done",
    title: "Workshop de Vendas",
    assignee: "Sofia L.",
    due: "concluído",
  },
];

export const COMPACT_ITEMS: CompactItem[] = [
  {
    id: "c-1",
    columnId: "todo",
    title: "Definir política de pricing para o trimestre",
    assignee: { name: "Marina C.", initials: "MC" },
    due: "sexta",
    tags: [{ label: "financeiro" }],
    state: "attention",
  },
  {
    id: "c-2",
    columnId: "todo",
    title: "Benchmark de fornecedores de hospedagem",
    assignee: { name: "Pedro A.", initials: "PA" },
    due: "próxima semana",
    tags: [{ label: "operação" }],
  },
  {
    id: "c-3",
    columnId: "doing",
    title: "Testes A/B do novo checkout",
    assignee: { name: "Camila V.", initials: "CV" },
    due: "qua",
    tags: [{ label: "growth" }],
  },
  {
    id: "c-4",
    columnId: "done",
    title: "Auditoria de segurança Q2",
    assignee: { name: "Diego M.", initials: "DM" },
    due: "concluído",
  },
];
