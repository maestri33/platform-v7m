import type { Metadata } from "next";

// canonical null: o "/" do layout vazaria pra cá junto do noindex (conflito)
export const metadata: Metadata = {
  title: "Página não encontrada · IEADPG Jardim Amália",
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0b0b0b",
        color: "#f4efe6",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <p
          style={{
            color: "#d2b264",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            fontSize: ".8rem",
            fontWeight: 700,
          }}
        >
          IEADPG · Jardim Amália
        </p>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
            lineHeight: 1.05,
            margin: "14px 0",
          }}
        >
          Essa página ainda não existe
        </h1>
        <p style={{ color: "#b3a996", maxWidth: 420, margin: "0 auto 28px" }}>
          Mas o sonho está de pé.
        </p>
        {/* <a> e não <Link>: navegação de documento garante uma única
            instância da engine (mountScrollWorld não expõe teardown) */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="sw-fallback__cta" href="/">
          Voltar pro voo
        </a>
      </div>
    </main>
  );
}
