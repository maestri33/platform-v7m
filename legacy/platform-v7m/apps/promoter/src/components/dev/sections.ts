/**
 * Constantes puras (sem "use client") — seguras pra server components.
 * Mantém a lista de seções em UM lugar só; o SectionNav (cliente) e o
 * DevPreviewPage (servidor) importam daqui.
 */
export const SECTIONS: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: "overview", label: "Overview", hint: "Índice do showcase" },
  { id: "components", label: "Components", hint: "Primitivos em todos os estados" },
  { id: "forms", label: "Forms", hint: "Forms em todos os estados" },
  { id: "pages", label: "Pages", hint: "Mock das páginas reais" },
  { id: "states", label: "States", hint: "Loading/empty/error/success" },
  { id: "auth", label: "Auth", hint: "CheckFlow em 3 estágios" },
];
