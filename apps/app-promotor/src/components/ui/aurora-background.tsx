// Fundo aurora (atmosfera dourado/prata sobre grafite) — recolor da régua do
// app dos alunos, sem cor de bandeira. Puramente decorativo: fixed atrás de
// tudo, aria-hidden; o movimento é silenciado por prefers-reduced-motion
// (kill-switch global no globals.css). Toda a pintura vive no `.aurora`.
export function AuroraBackground() {
  return <div className="aurora" aria-hidden="true" />;
}
