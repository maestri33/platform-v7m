/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** URL do app de matrícula (destino dos CTAs) */
  readonly PUBLIC_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
