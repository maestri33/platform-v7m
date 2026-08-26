/** Rótulos pt-BR de valores canônicos do backend (regra §12: enum cru nunca chega ao usuário). */

export const MARITAL_OPTIONS = [
  { value: "", label: "—" },
  { value: "single", label: "Solteiro(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "divorced", label: "Divorciado(a)" },
  { value: "widowed", label: "Viúvo(a)" },
  { value: "separated", label: "Separado(a)" },
] as const;

export function maritalLabel(value: string | null | undefined): string {
  return MARITAL_OPTIONS.find((o) => o.value === (value ?? ""))?.label ?? "—";
}

/**
 * Papéis ativos em linguagem amigável — a string crua da role nunca aparece.
 * `candidate` só conta enquanto não virou promotor; role desconhecida é omitida.
 */
export function roleLabels(roles: string[]): string[] {
  const labels: string[] = [];
  if (roles.includes("promoter")) labels.push("Promotor(a)");
  if (roles.includes("training")) labels.push("Treinamento obrigatório");
  if (roles.includes("candidate") && !roles.includes("promoter")) {
    labels.push("Candidato(a)");
  }
  return labels;
}
