/**
 * IBGE Localidades — public API, CORS-enabled. Drives UF -> cidade selects so
 * birthplace never arrives as free text.
 * https://servicodados.ibge.gov.br/api/docs/localidades
 */
const IBGE_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export interface UfOption {
  sigla: string;
  nome: string;
}

export async function fetchUfs(): Promise<UfOption[]> {
  const res = await fetch(`${IBGE_BASE}/estados?orderBy=nome`);
  if (!res.ok) throw new Error(`IBGE estados: ${res.status}`);
  const data = (await res.json()) as { sigla: string; nome: string }[];
  return data.map((e) => ({ sigla: e.sigla, nome: e.nome }));
}

export async function fetchCities(uf: string): Promise<string[]> {
  const res = await fetch(`${IBGE_BASE}/estados/${uf}/municipios?orderBy=nome`);
  if (!res.ok) throw new Error(`IBGE municípios: ${res.status}`);
  const data = (await res.json()) as { nome: string }[];
  return data.map((m) => m.nome);
}
