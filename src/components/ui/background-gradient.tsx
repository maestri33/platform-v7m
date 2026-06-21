/**
 * Fundo de gradiente animado (inspirado no Aceternity "Background Gradient
 * Animation"): blobs nas cores da bandeira que se movem suavemente atrás do
 * conteúdo. Fixo e decorativo; estilos em globals.css (.bg-gradient-* / .bg-blob).
 */
export function BackgroundGradient() {
  return (
    <div className="bg-gradient-wrap" aria-hidden="true">
      <div className="bg-gradient-container">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
        <div className="bg-blob bg-blob-4" />
        <div className="bg-blob bg-blob-5" />
      </div>
    </div>
  );
}
