/**
 * Brazilian PII & Synthetic Data Factory for QA and E2E Testing.
 *
 * Generates mathematically valid / invalid CPFs (Mod11), Brazilian mobile phone numbers (E.164),
 * realistic ViaCEP address structures, and synthetic KYC document base64 representations.
 */

export class BrazilianDataFactory {
  static readonly VALID_DDDS = [
    "11", "12", "13", "14", "15", "16", "17", "18", "19", // SP
    "21", "22", "24",                                     // RJ
    "27", "28",                                           // ES
    "31", "32", "33", "34", "35", "37", "38",             // MG
    "41", "42", "43", "44", "45", "46",                   // PR
    "47", "48", "49",                                     // SC
    "51", "53", "54", "55",                               // RS
    "61", "62", "64", "63", "65", "66", "67",             // Centro-Oeste / Norte
    "71", "73", "74", "75", "77", "79", "81", "87", "82", "83", "84", "85", "88", "86", "89", // Nordeste
    "91", "93", "94", "92", "97", "95", "96", "98", "99", // Norte
  ];

  /**
   * Generates a valid (or intentionally invalid) Brazilian CPF using Modulo 11.
   */
  static generateCpf(formatted = false, valid = true): string {
    if (!valid) {
      const invalidDigit = Math.floor(Math.random() * 9) + 1;
      const rawInvalid = String(invalidDigit).repeat(11);
      return formatted
        ? rawInvalid.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        : rawInvalid;
    }

    const rnd = () => Math.floor(Math.random() * 9);
    const n = Array.from({ length: 9 }, rnd);

    // Evita 111111111, 222222222, etc.
    if (new Set(n).size === 1) {
      n[0] = (n[0] + 1) % 10;
    }

    // Primeiro dígito verificador
    const s1 = n.reduce((acc, digit, idx) => acc + digit * (10 - idx), 0);
    const r1 = (s1 * 10) % 11;
    const d1 = r1 === 10 ? 0 : r1;
    n.push(d1);

    // Segundo dígito verificador
    const s2 = n.reduce((acc, digit, idx) => acc + digit * (11 - idx), 0);
    const r2 = (s2 * 10) % 11;
    const d2 = r2 === 10 ? 0 : r2;
    n.push(d2);

    const raw = n.join("");
    return formatted ? raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : raw;
  }

  /**
   * Generates a valid Brazilian mobile phone number in E.164 format (e.g. 5541998765432).
   */
  static generatePhone(ddd?: string): string {
    const chosenDdd = ddd && this.VALID_DDDS.includes(ddd)
      ? ddd
      : this.VALID_DDDS[Math.floor(Math.random() * this.VALID_DDDS.length)];
    const number = Math.floor(10000000 + Math.random() * 90000000);
    return `55${chosenDdd}9${number}`;
  }

  /**
   * Generates a coherent ViaCEP address dictionary.
   */
  static generateAddress(): {
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
    numero: string;
    complemento: string;
  } {
    const addresses = [
      { cep: "80010000", logradouro: "Praça Tiradentes", bairro: "Centro", cidade: "Curitiba", uf: "PR" },
      { cep: "01310100", logradouro: "Avenida Paulista", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" },
      { cep: "20040002", logradouro: "Rua Primeiro de Março", bairro: "Centro", cidade: "Rio de Janeiro", uf: "RJ" },
      { cep: "30130000", logradouro: "Praça Sete de Setembro", bairro: "Centro", cidade: "Belo Horizonte", uf: "MG" },
    ];
    const chosen = addresses[Math.floor(Math.random() * addresses.length)];
    return {
      ...chosen,
      numero: String(Math.floor(Math.random() * 2000) + 1),
      complemento: Math.random() > 0.5 ? "Apto 101" : "",
    };
  }

  /**
   * Generates a synthetic RG or selfie SVG data URI for automated browser upload testing.
   */
  static generateSyntheticDocDataUrl(kind: "rg_front" | "rg_back" | "selfie"): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="${kind.startsWith("rg") ? "#d0ecd0" : "#f0f0f0"}" rx="10"/>
      <rect x="20" y="20" width="560" height="360" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="6,6"/>
      <text x="50" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="#333">SYNTHETIC ${kind.toUpperCase()}</text>
      ${kind === "selfie" ? '<circle cx="300" cy="200" r="80" fill="#bbb"/><circle cx="300" cy="180" r="40" fill="#999"/>' : '<line x1="50" y1="120" x2="550" y2="120" stroke="#999" stroke-width="2"/><line x1="50" y1="160" x2="400" y2="160" stroke="#999" stroke-width="2"/><line x1="50" y1="200" x2="500" y2="200" stroke="#999" stroke-width="2"/>'}
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
