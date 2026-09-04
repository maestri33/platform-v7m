/**
 * Fonte única da JANELA PROMOCIONAL — o prazo real da condição de preço.
 *
 * Por que existe: a página já dizia "Preço promocional — pode subir a qualquer
 * momento" (vago mas honesto) e "Promoção por tempo limitado" nas páginas de
 * SEO. Escassez com prazo REAL converte mais e é a única forma legal de fazê-la.
 *
 * REGRA DURA: sem `PUBLIC_PROMO_ENDS_AT`, este módulo devolve `null` e o
 * componente não renderiza NADA. Mesma política do CNPJ e do HUB_BRANDS no
 * landing-promotor: dado ausente se omite, não se inventa. Contador falso que
 * reinicia a cada visita é publicidade enganosa (CDC art. 37 §1º) e alegação
 * não comprovável perante o CONAR (Anexo B — Educação) — além de ser
 * exatamente o padrão que este público já aprendeu a farejar como golpe.
 *
 * O prazo é decisão COMERCIAL, não técnica: quem define é quem pode cumprir.
 * Quando a data passar, o preço tem que subir de verdade. Se não vai subir,
 * não configure a variável.
 *
 * Variáveis de ambiente:
 *   PUBLIC_PROMO_ENDS_AT           ISO 8601 com fuso. Ex.: 2026-09-30T23:59:59-03:00
 *   PUBLIC_PROMO_NEXT_PIX          (opcional) Pix depois do prazo. Ex.: 1290
 *   PUBLIC_PROMO_NEXT_INSTALLMENT  (opcional) parcela depois do prazo. Ex.: 129
 *   PUBLIC_PROMO_COHORT_LABEL      (opcional) nome de turma real. Ex.: Turma de outubro
 *
 * NÃO existe contador de vagas aqui, de propósito. "Restam 3 vagas" só é
 * legítimo se houver limite real de vagas modelado em algum lugar — e não há:
 * `api/clients/routers/pricing.py` devolve apenas preço, sem estoque nem
 * validade. Número de vaga inventado é o mesmo delito do contador falso.
 */
import { PRICE } from './price';

/** Janela máxima aceita. "Promoção" que dura mais que isto não é promoção. */
const MAX_WINDOW_DAYS = 120;

export interface Promo {
  /** instante em que a condição expira */
  endsAt: Date;
  /** epoch em ms — o que o script do cliente consome */
  endsAtMs: number;
  /** ISO original, para o atributo datetime do <time> */
  endsAtISO: string;
  /** "30 de setembro" — sem ano, que polui a leitura no mobile */
  endsAtLabel: string;
  /** "30/09/2026, 23:59" — completa, para o title e o leitor de tela */
  endsAtFull: string;
  /** preço Pix que passa a valer depois do prazo, se declarado */
  nextPixTotal: number | null;
  /** parcela que passa a valer depois do prazo, se declarada */
  nextPerMonth: number | null;
  /** nome da turma real, se houver ciclo de turma de verdade */
  cohortLabel: string | null;
}

function parsePositive(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function loadPromo(): Promo | null {
  const raw = import.meta.env.PUBLIC_PROMO_ENDS_AT?.trim();
  if (!raw) return null;

  const endsAt = new Date(raw);
  if (Number.isNaN(endsAt.getTime())) {
    console.warn(`[promo] PUBLIC_PROMO_ENDS_AT não é data válida: "${raw}" — bloco omitido.`);
    return null;
  }

  const now = Date.now();
  if (endsAt.getTime() <= now) {
    console.warn(
      `[promo] prazo já passou (${raw}) — bloco omitido. Atualize a data ou remova a variável.`
    );
    return null;
  }

  const daysOut = (endsAt.getTime() - now) / 86_400_000;
  if (daysOut > MAX_WINDOW_DAYS) {
    console.warn(
      `[promo] prazo a ${Math.round(daysOut)} dias excede a janela de ${MAX_WINDOW_DAYS} — ` +
        `bloco omitido. Urgência com prazo distante não é urgência, é ruído.`
    );
    return null;
  }

  const nextPixTotal = parsePositive(import.meta.env.PUBLIC_PROMO_NEXT_PIX);
  const nextPerMonth = parsePositive(import.meta.env.PUBLIC_PROMO_NEXT_INSTALLMENT);

  // Sanidade da promessa: o preço "de depois" tem que ser MAIOR que o de agora.
  // Se vier menor ou igual, a afirmação "vai subir" é falsa — melhor calar.
  const pixOk = nextPixTotal === null || nextPixTotal > PRICE.pixTotal;
  const perMonthOk = nextPerMonth === null || nextPerMonth > PRICE.perMonth;
  if (!pixOk || !perMonthOk) {
    console.warn(
      `[promo] preço futuro (pix ${nextPixTotal} / parcela ${nextPerMonth}) não é maior que o ` +
        `atual (pix ${PRICE.pixTotal} / parcela ${PRICE.perMonth}) — valores futuros descartados.`
    );
  }

  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts }).format(endsAt);

  return {
    endsAt,
    endsAtMs: endsAt.getTime(),
    endsAtISO: endsAt.toISOString(),
    endsAtLabel: fmt({ day: 'numeric', month: 'long' }),
    endsAtFull: fmt({ dateStyle: 'short', timeStyle: 'short' }),
    nextPixTotal: pixOk ? nextPixTotal : null,
    nextPerMonth: perMonthOk ? nextPerMonth : null,
    cohortLabel: import.meta.env.PUBLIC_PROMO_COHORT_LABEL?.trim() || null,
  };
}

export const PROMO: Promo | null = loadPromo();

/** true quando há janela promocional real e vigente para exibir */
export const hasPromo = PROMO !== null;
