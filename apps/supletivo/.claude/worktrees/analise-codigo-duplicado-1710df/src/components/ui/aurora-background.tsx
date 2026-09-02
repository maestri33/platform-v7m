/**
 * Aurora background — portado do Aceternity "Aurora Background", recolorido para
 * a bandeira (verde, azul e dourado). Camada fixa, decorativa, atrás de todo o
 * conteúdo. Leve de propósito: um único elemento com UMA animação de 60s
 * (background-position) e blur; respeita prefers-reduced-motion. Estilos em
 * globals.css (.aurora-wrap / .aurora-layer).
 */
export function AuroraBackground() {
  return (
    <div className="aurora-wrap" aria-hidden="true">
      <div className="aurora-layer" />
    </div>
  );
}
