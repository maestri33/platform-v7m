/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** URL do app de matrícula (destino dos CTAs) */
  readonly PUBLIC_APP_URL?: string;
  /** ID do Google Tag Manager (ex.: GTM-XXXXXXX) */
  readonly PUBLIC_GTM_ID?: string;
  /** URL do backend (precificação dinâmica por ref) */
  readonly PUBLIC_BACKEND_URL?: string;
  /** Fim da janela promocional, ISO 8601 com fuso. Ausente = sem bloco de urgência */
  readonly PUBLIC_PROMO_ENDS_AT?: string;
  /** Preço Pix que passa a valer depois do prazo (BRL, só dígitos) */
  readonly PUBLIC_PROMO_NEXT_PIX?: string;
  /** Parcela que passa a valer depois do prazo (BRL, só dígitos) */
  readonly PUBLIC_PROMO_NEXT_INSTALLMENT?: string;
  /** Nome de turma real, se houver ciclo de turma. Ex.: "Turma de outubro" */
  readonly PUBLIC_PROMO_COHORT_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
