"use client";

/**
 * Erro fatal (renderização da root layout falhou).
 * Substitui TUDO — mantém o fundo escuro da marca via inline styles (globals.css
 * não carrega aqui) e o card de vidro, pra não destoar do resto do app.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily:
            "var(--font-geist-sans, system-ui), system-ui, -apple-system, sans-serif",
          minHeight: "100dvh",
          margin: 0,
          padding: "4rem 1.5rem",
          background:
            "radial-gradient(ellipse at top, #1d1d20 0%, #0b0b0c 60%)",
          color: "#f5f4f1",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            margin: "0 auto",
            padding: "clamp(1rem, 0.8rem + 1.5vw, 1.5rem)",
            background: "rgba(17, 17, 19, 0.78)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(231, 228, 221, 0.14)",
            borderRadius: 14,
            boxShadow: "0 24px 60px -24px rgba(0,0,0,0.7)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#f0d493",
              marginBottom: 18,
            }}
          >
            V7M · Erro
          </p>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 0.5rem" }}>
            Algo deu errado
          </h1>
          <p style={{ color: "#b4b4bb", marginBottom: "1.5rem" }}>
            A gente já registrou. Tenta de novo — se persistir, recarregue a
            página e entre de novo na sua conta.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              background:
                "linear-gradient(135deg, #f4dca0 0%, #d9b15a 42%, #b07f30 72%, #ecc97f 100%)",
              color: "#0c0c0d",
              border: 0,
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 16,
              width: "100%",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
