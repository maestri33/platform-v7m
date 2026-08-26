// Máscaras + validação client-side da auth (handoff design). Máscara ao digitar,
// valida no blur; mensagens pt-BR. Espelha as regras do backend p/ falhar cedo.

/** (00) 00000-0000 — aceita 10 ou 11 dígitos. */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 000.000.000-00 */
export function maskCpf(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Telefone BR: DDD não inicia em 0; 11 dígitos → 3º dígito deve ser 9 (celular). */
export function validatePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d) return "Informe seu telefone com DDD.";
  if (d.length < 10 || d.length > 11) return "Número incompleto. Use DDD + número.";
  if (d[0] === "0") return "DDD inválido.";
  if (d.length === 11 && d[2] !== "9")
    return "Número de celular deve começar com 9 após o DDD.";
  return null;
}

/** CPF: rejeita repetidos, valida os 2 dígitos verificadores. */
export function validateCpf(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d))
    return "CPF inválido. Confira os dígitos.";
  const dv = (base: string, factor: number) => {
    let sum = 0;
    for (const ch of base) sum += Number(ch) * factor--;
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (dv(d.slice(0, 9), 10) !== Number(d[9])) return "CPF inválido. Confira os dígitos.";
  if (dv(d.slice(0, 10), 11) !== Number(d[10])) return "CPF inválido. Confira os dígitos.";
  return null;
}

/** E-mail: formato básico (o backend é a validação canônica). */
export function validateEmail(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Informe seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "E-mail inválido.";
  return null;
}

/** 00000-000 */
export function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** CEP: exatamente 8 dígitos (o ViaCEP é a validação canônica do endereço). */
export function validateCep(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d) return "Informe seu CEP.";
  if (d.length !== 8) return "CEP incompleto. Use os 8 dígitos.";
  return null;
}
