/**
 * Bandeira-diploma — a bandeira do Brasil estilizada (losango + círculo + check
 * da marca) que desenrola e enrola como um diploma, em loop. 100% SVG + CSS
 * (estilos em globals.css, classes .diploma-flag / .df-*), sem JS. Em
 * prefers-reduced-motion fica aberta e estática. Portada da landing
 * (DiplomaFlag.astro) para dar continuidade visual entre site e app.
 *
 * `name`: quando informado, estampa uma plaquinha "Certificado de NOME" na
 * folha — vira uma credencial. `className`: dimensiona/posiciona de fora.
 */
export function DiplomaFlag({ name, className }: { name?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className ? className : ""}`} aria-hidden="true">
      <div className="diploma-flag w-full">
      <svg viewBox="0 0 560 380" fill="none">
        <defs>
          <linearGradient id="df-sheet-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#007a52" />
            <stop offset="1" stopColor="#00543a" />
          </linearGradient>
          <linearGradient id="df-roll-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#003d29" />
            <stop offset="0.45" stopColor="#00875b" />
            <stop offset="0.7" stopColor="#00543a" />
            <stop offset="1" stopColor="#002e1f" />
          </linearGradient>
        </defs>

        {/* sombra projetada (cresce junto com o desenrolar) */}
        <ellipse className="df-shadow" cx="280" cy="358" rx="248" ry="13" fill="#0b1220" />

        {/* folha: bandeira estilizada */}
        <g className="df-sheet">
          <rect x="20" y="40" width="520" height="300" rx="12" fill="url(#df-sheet-g)" />
          <rect
            x="34"
            y="54"
            width="492"
            height="272"
            rx="7"
            stroke="var(--color-brand-yellow)"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />

          <path d="M280 78 L488 190 280 302 72 190Z" fill="var(--color-brand-yellow)" />
          <circle cx="280" cy="190" r="70" fill="var(--color-brand-blue)" />
          <path
            className="df-check"
            d="M248 192l23 23 46-50"
            stroke="#ffffff"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
          />

          {/* brilho de papel */}
          <rect x="20" y="40" width="520" height="60" rx="12" fill="#ffffff" opacity="0.05" />

          {/* carimbo da marca */}
          <g className="df-stamp">
            <circle
              cx="462"
              cy="288"
              r="33"
              fill="none"
              stroke="var(--color-brand-yellow)"
              strokeWidth="2.2"
              strokeOpacity="0.95"
            />
            <circle
              cx="462"
              cy="288"
              r="26.5"
              fill="none"
              stroke="var(--color-brand-yellow)"
              strokeWidth="1.4"
              strokeDasharray="3 5.2"
              strokeLinecap="round"
              strokeOpacity="0.9"
            />
            <path
              d="M462 273l12.5 12.5L462 298l-12.5-12.5Z"
              fill="none"
              stroke="var(--color-brand-yellow)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M456.5 286l4 4 8-8.5"
              fill="none"
              stroke="var(--color-brand-yellow)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

        </g>

        {/* rolo (viaja da esquerda pra direita ao desenrolar) */}
        <g className="df-roll">
          <rect x="10" y="46" width="42" height="288" rx="21" fill="url(#df-roll-g)" />
          <ellipse cx="31" cy="60" rx="19" ry="9" fill="#002e1f" />
          <ellipse cx="31" cy="60" rx="10" ry="4.5" fill="none" stroke="#e9efe9" strokeWidth="2" strokeOpacity="0.6" />
          <ellipse cx="31" cy="320" rx="19" ry="9" fill="#002e1f" />
          <ellipse cx="31" cy="320" rx="10" ry="4.5" fill="none" stroke="#e9efe9" strokeWidth="2" strokeOpacity="0.45" />
          <rect x="46" y="50" width="5" height="280" rx="2.5" fill="var(--color-brand-yellow)" opacity="0.85" />

          {/* fita: só enquanto está enrolado */}
          <g className="df-ribbon">
            <rect x="2" y="168" width="58" height="42" rx="8" fill="var(--color-brand-yellow)" />
            <path d="M14 210l-12 26 20-9 9 11z" fill="#d9a400" />
            <path d="M48 210l12 26-20-9-9 11z" fill="#d9a400" />
            <circle cx="31" cy="189" r="8.5" fill="var(--color-brand-ink)" opacity="0.85" />
          </g>
        </g>
      </svg>
    </div>
      {name ? (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-500/20">
            Certificado reservado para {name}
          </span>
        </div>
      ) : null}
    </div>
  );
}
