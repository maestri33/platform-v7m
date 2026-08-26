/**
 * Inteligência do campo de e-mail (DOCUMENTACAO §207-219): sugestão de domínio
 * ("Você quis dizer …?") e detecção de descartáveis. Tudo client-side e
 * determinístico — funciona igual com mock e com backend, e é o que o E2E exercita.
 */

/**
 * Domínios que o público realmente usa (ordem = popularidade no BR; decide o
 * empate do autocomplete parcial: "victor@g" sugere gmail.com, não gmx.com).
 */
const KNOWN_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com.br",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
] as const;

/** Descartáveis mais comuns — geram AVISO gentil, nunca bloqueio (§212). */
const TEMP_DOMAINS = [
  "mailinator.com",
  "10minutemail.com",
  "yopmail.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "dispostable.com",
] as const;

/** Mesma régua do submit: precisa ter local, @ e domínio com ponto. */
export const isEmailFormatValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** E-mail (já em formato válido) de provedor temporário? Cobre subdomínios. */
export function isTempEmail(v: string): boolean {
  const domain = v.trim().toLowerCase().split("@")[1] ?? "";
  return TEMP_DOMAINS.some((t) => domain === t || domain.endsWith(`.${t}`));
}

/** Distância de edição clássica — pequena o bastante pra rodar a cada tecla. */
function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = cur;
    }
  }
  return prev[b.length];
}

/**
 * Sugestão de domínio (§211): typo ("gmial.com") ou autocomplete parcial
 * ("victor@g"). Devolve o e-mail COMPLETO corrigido, ou null quando não há o
 * que sugerir (domínio já conhecido, sem @, longe demais de qualquer conhecido).
 */
export function suggestEmail(v: string): string | null {
  const raw = v.trim().toLowerCase();
  const at = raw.indexOf("@");
  if (at <= 0 || raw.indexOf("@", at + 1) !== -1) return null;
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  if (!domain || (KNOWN_DOMAINS as readonly string[]).includes(domain)) return null;

  // Autocomplete parcial: um conhecido COMEÇA com o que foi digitado ("g" → gmail.com,
  // "yahoo.com." → yahoo.com.br). Primeiro da lista vence = mais popular.
  const prefix = KNOWN_DOMAINS.find((d) => d.startsWith(domain));
  if (prefix) return `${local}@${prefix}`;

  // Typo: distância ≤ 2 num domínio "inteiro" (com ponto e tamanho de gente) —
  // sem essas guardas, "victor@a" acharia sugestão pra qualquer rabisco.
  if (domain.length < 5 || !domain.includes(".")) return null;
  let best: string | null = null;
  let bestDist = 3;
  for (const d of KNOWN_DOMAINS) {
    const dist = levenshtein(domain, d);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best ? `${local}@${best}` : null;
}
