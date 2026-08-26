/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** URL do app (destino do CTA — cadastro do candidato a promotor) */
  readonly PUBLIC_APP_URL?: string;
  /** Comissão direta por matrícula paga (R$) */
  readonly PUBLIC_COMMISSION_DIRECT?: string;
  /** Bônus flat por bloco de indicações pagas na semana (R$) */
  readonly PUBLIC_BONUS_FLAT?: string;
  /** Tamanho do bloco que destrava o bônus */
  readonly PUBLIC_BONUS_THRESHOLD?: string;
  /** Bônus repete a cada bloco? ("true"/"false") */
  readonly PUBLIC_BONUS_REPEATS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
