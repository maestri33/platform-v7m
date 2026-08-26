/**
 * Formatação/máscara pt-BR compartilhada (server e client). Valores monetários
 * do backend chegam como STRING decimal — nunca aritmética em float no front
 * além da exibição.
 */

/** "1234.50" | 1234.5 → "R$ 1.234,50". Entrada inválida → "—". */
export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Data ISO (AAAA-MM-DD) → "DD/MM/AAAA", sem passar por Date (evita o pulo de
 * fuso em data-só). Formato desconhecido volta como veio.
 */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Telefone mascarado pra exibição: (11) 987••••34. */
export function maskPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length < 8) return "•".repeat(d.length || 3);
  const ddd = d.length >= 10 ? `(${d.slice(0, 2)}) ` : "";
  const rest = d.length >= 10 ? d.slice(2) : d;
  return `${ddd}${rest.slice(0, 3)}${"•".repeat(Math.max(0, rest.length - 5))}${rest.slice(-2)}`;
}

/** CPF mascarado pra exibição: ···.842.···-9 (mostra só o 2º bloco e 1 dígito). */
export function maskCpf(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return "···";
  return `···.${d.slice(3, 6)}.···-${d.slice(9, 10)}`;
}

/** Chave Pix mascarada pra exibição (só as pontas). */
export function maskPixKey(raw: string | null | undefined): string {
  if (!raw) return "—";
  if (raw.includes("@")) {
    const [user, domain] = raw.split("@");
    return `${user.slice(0, 2)}•••@${domain}`;
  }
  if (raw.length <= 6) return `${raw.slice(0, 2)}•••`;
  return `${raw.slice(0, 4)}•••${raw.slice(-3)}`;
}
