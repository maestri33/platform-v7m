/**
 * Configuração única da landing de recrutamento de promotor.
 *
 * Esta página NÃO é a landing de captação de aluno (aquela que o promotor
 * compartilha com ?ref=<external_id dele>). Aqui o público é quem quer ganhar
 * dinheiro indicando matrículas — o CTA inicia o funil do candidato a promotor.
 */

/* ----------------------------------------------------------------------------
 * Destino do CTA (cadastro do candidato a promotor)
 * -------------------------------------------------------------------------- */
const rawAppUrl =
  import.meta.env.PUBLIC_APP_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://app.maestri.group');

// sem barra final: evita param colado em path duplicado e 301 no destino
export const APP_URL: string = rawAppUrl.replace(/\/+$/, '');

export const BRAND = 'Maestri.group';
/** Selo do programa exibido junto ao wordmark */
export const PROGRAM = 'Promotor';

/** Texto único de CTA em toda a página (regra de copy) */
export const CTA_LABEL = 'Quero ser promotor';

/* ----------------------------------------------------------------------------
 * Vínculo com o polo (hub) via URL
 *
 * A landing lê ?hub=<polo> (nome próprio, não colide com o ?ref= que é o link
 * de trabalho do promotor já aprovado). No clique do CTA o valor é repassado ao
 * app como ?ref=<polo> — que é o parâmetro consumido por create_candidate para
 * amarrar o novo promotor ao polo certo. Sem hub → polo padrão (decidido na API).
 * `ref` na URL é aceito como alias de entrada (compatibilidade).
 * -------------------------------------------------------------------------- */
/** Parâmetro lido da URL da landing para identificar o polo */
export const HUB_PARAM = 'hub';
/** Parâmetro enviado ao app (o que create_candidate consome) */
export const APP_REF_PARAM = 'ref';

/* ----------------------------------------------------------------------------
 * Comissão — FONTE ÚNICA dos números (espelha finance/config.py).
 * Valores via .env (PUBLIC_*) para a calculadora poder ler no client.
 * -------------------------------------------------------------------------- */
const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Comissão direta por matrícula PAGA (R$) */
export const COMMISSION_DIRECT = num(import.meta.env.PUBLIC_COMMISSION_DIRECT, 100);
/** Bônus flat por bloco de indicações pagas na semana (R$) */
export const BONUS_FLAT = num(import.meta.env.PUBLIC_BONUS_FLAT, 500);
/** Tamanho do bloco que destrava o bônus (ex.: 5 = a cada 5 pagas) */
export const BONUS_THRESHOLD = num(import.meta.env.PUBLIC_BONUS_THRESHOLD, 5);
/**
 * Bônus repete a cada bloco?
 *  - true  → a cada 5 pagas, +R$ 500 (escada: +500, +1000, ...)
 *  - false → degrau único: paga 1x ao atingir o threshold
 * ⚠️ Conferir contra finance/config.py antes de produção (promessa de dinheiro).
 */
export const BONUS_REPEATS = (import.meta.env.PUBLIC_BONUS_REPEATS ?? 'false') !== 'false';

/**
 * Fechamento semanal (pagamento por Pix) — espelha closing_weekday/closing_hour
 * do finance/config.py. Via .env para não dessincronizar com a API (promessa de
 * dinheiro: se a hora mudar lá, basta mudar PUBLIC_CLOSING_LABEL aqui).
 */
export const CLOSING_LABEL: string =
  import.meta.env.PUBLIC_CLOSING_LABEL ?? 'toda sexta, às 18h';

/* ----------------------------------------------------------------------------
 * Identificação legal do fornecedor (CDC art. 31 / LGPD art. 9).
 * Via .env: o CNPJ NUNCA deve ser hardcoded — placeholder em produção é
 * bloqueador jurídico. Sem PUBLIC_CNPJ, o rodapé omite a linha do CNPJ em vez
 * de exibir um número falso (pior do que ausência).
 * -------------------------------------------------------------------------- */
/** Razão/nome jurídico da PJ que opera o programa */
export const LEGAL_NAME: string = import.meta.env.PUBLIC_LEGAL_NAME ?? 'Maestri.group';
/** CNPJ real da PJ (vazio = não renderiza; não inventar placeholder) */
export const CNPJ: string = (import.meta.env.PUBLIC_CNPJ ?? '48.811.016/0001-00').trim();
/** E-mail de contato (SAC) */
export const CONTACT_EMAIL: string =
  import.meta.env.PUBLIC_CONTACT_EMAIL ?? 'contato@maestri.group';
/** E-mail do encarregado de dados (DPO / LGPD) */
export const DPO_EMAIL: string =
  import.meta.env.PUBLIC_DPO_EMAIL ?? 'dpo@maestri.group';
/** WhatsApp em E.164 só dígitos (ex.: 5511999999999); vazio = não renderiza */
export const CONTACT_WHATSAPP: string = (
  import.meta.env.PUBLIC_CONTACT_WHATSAPP ?? '5511920062177'
).replace(/\D/g, '');

/** ID do Google Tag Manager (ex.: GTM-XXXXXXX); null se não configurado */
export const GTM_ID: string | null = import.meta.env.PUBLIC_GTM_ID?.trim() || null;

/**
 * Marcas das instituições do polo (HUB_BRANDS). Vazio por decisão de projeto:
 * exibir logo/nome é pendência jurídica/comercial. Preencher libera o bloco.
 */
export const HUB_BRANDS: string[] = [];

/* ----------------------------------------------------------------------------
 * Produto indicado — o curso que o promotor divulga (supletivo.net.br).
 * Fonte única da copy do produto. Fatos espelham supletivo.net.br.
 * NÃO é linkado na UI de propósito: mantém o promotor no funil de recrutamento.
 * Claim do certificado segue exatamente o site de origem (instituição parceira
 * credenciada / LDB) — não overclaim "certificado do MEC".
 * -------------------------------------------------------------------------- */
/** Nome curto do produto, usado na copy */
export const PRODUCT_NAME = 'supletivo do Maestri.group';

/* ----------------------------------------------------------------------------
 * Helpers de cálculo (usados no server p/ fallback e no client p/ a calculadora)
 * -------------------------------------------------------------------------- */
/** Quantos blocos de bônus uma quantidade de indicações pagas destrava */
export function bonusBlocks(paid: number): number {
  if (paid < BONUS_THRESHOLD) return 0;
  return BONUS_REPEATS ? Math.floor(paid / BONUS_THRESHOLD) : 1;
}

/** Ganho da semana para `paid` indicações pagas: comissão direta + bônus */
export function weeklyEarnings(paid: number): {
  direct: number;
  bonus: number;
  total: number;
} {
  const safe = Math.max(0, Math.floor(paid));
  const direct = safe * COMMISSION_DIRECT;
  const bonus = bonusBlocks(safe) * BONUS_FLAT;
  return { direct, bonus, total: direct + bonus };
}

/** Formata número como moeda BRL sem centavos (R$ 1.234) */
export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}
