import type { Metadata } from "next";

import { VariantShowcase } from "./VariantShowcase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kanban · Variantes",
  description: "Variantes drop-in do Kanban Glass Columns.",
};

// 404 em produção — não é rota de produto. Reaproveita o padrão do
// /dev-preview/ (mesma estética dark/aurora, mesmo header minimal).
export default function KanbanVariantsPage() {
  if (process.env.NODE_ENV === "production") return null;
  return <VariantShowcase />;
}
