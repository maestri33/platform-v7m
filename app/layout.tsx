import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { MAPS } from "./site-data";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // pesos estáticos usados de fato (em vez do eixo variável 100-900: -40 KB)
  weight: ["400", "600", "700"],
  // sem preload: 48 KB em prioridade alta na frente do poster de LCP, e nada
  // usa a fonte antes do mount — a fallback metric-matched cobre o intervalo
  preload: false,
});

// "Igreja" no title: é o head term da busca local e não aparecia no <head>
const TITLE = "IEADPG Jardim Amália · Igreja Assembleia de Deus, Ponta Grossa";
// meta/OG: front-loada a intenção de busca local
const DESCRIPTION =
  "Assembleia de Deus no Jardim Amália, Ponta Grossa: cultos domingo 19h e quarta 20h. Conheça a família e o projeto da nova casa — um voo até o nosso sonho.";
// JSON-LD: descreve a ENTIDADE igreja, não a experiência do site
const CHURCH_DESCRIPTION =
  "Igreja Evangélica Assembleia de Deus no Jardim Amália, em Ponta Grossa (PR). Cultos de domingo às 19h e quarta às 20h, na Rua Paulina Oliveira Gomes, 1071.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ieadpg.org"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "IEADPG Jardim Amália",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  colorScheme: "dark",
  viewportFit: "cover",
};

const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Rua Paulina Oliveira Gomes, 1071",
  addressLocality: "Ponta Grossa",
  addressRegion: "PR",
  addressCountry: "BR",
};

const WEBSITE_LD = {
  "@type": "WebSite",
  "@id": "https://ieadpg.org/#website",
  name: "IEADPG Jardim Amália",
  alternateName: "IEADPG",
  url: "https://ieadpg.org",
  inLanguage: "pt-BR",
  publisher: { "@id": "https://ieadpg.org/#igreja" },
};

const CHURCH_LD = {
  // multi-tipo: Church é um Place, e WebSite.publisher / email / logo pedem
  // Organization — os dois tipos juntos mantêm address/geo válidos
  "@type": ["Church", "Organization"],
  "@id": "https://ieadpg.org/#igreja",
  logo: "https://ieadpg.org/ieadpg-logo.webp",
  name: "IEADPG Jardim Amália",
  alternateName: "Igreja Evangélica Assembleia de Deus — Jardim Amália",
  url: "https://ieadpg.org",
  description: CHURCH_DESCRIPTION,
  image: {
    "@type": "ImageObject",
    url: "https://ieadpg.org/opengraph-image.jpg",
    width: 1280,
    height: 720,
    // legenda no mesmo enquadramento da copy: é render de projeto, não foto
    caption:
      "Render do projeto da nova casa da IEADPG Jardim Amália, em construção",
  },
  telephone: "+55 42 99938-4069",
  email: "amalia@ieadpg.org",
  address: ADDRESS,
  geo: {
    "@type": "GeoCoordinates",
    latitude: -25.1368187,
    longitude: -50.137646,
  },
  hasMap: MAPS,
  sameAs: [
    "https://www.instagram.com/ieadpg.amalia/",
    "https://www.facebook.com/p/Ieadpg-Jardim-Am%C3%A1lia-61587294182189/",
  ],
  event: [
    {
      "@type": "Event",
      name: "Celebração",
      location: {
        "@type": "Place",
        name: "IEADPG Jardim Amália",
        address: ADDRESS,
      },
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: "https://schema.org/Sunday",
        startTime: "19:00",
        scheduleTimezone: "America/Sao_Paulo",
      },
    },
    {
      "@type": "Event",
      name: "Alinhamento",
      location: {
        "@type": "Place",
        name: "IEADPG Jardim Amália",
        address: ADDRESS,
      },
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: "https://schema.org/Wednesday",
        startTime: "20:00",
        scheduleTimezone: "America/Sao_Paulo",
      },
    },
  ],
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [WEBSITE_LD, CHURCH_LD],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <noscript>
          {/* espelho de .sw-fallback.is-visible — o hero pré-boot pinta sem JS,
              então o scrim/cor/fonte precisam vir junto */}
          <style>{`.sw-fallback{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal;visibility:visible;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;gap:14px;max-width:640px;margin:0 auto;padding:48px 24px;line-height:1.6;background:rgba(11,11,11,.78);color:#f4efe6;font-family:var(--font-inter),system-ui,sans-serif}.sw-fallback h1{font-family:var(--font-cormorant),Georgia,serif;font-size:clamp(2.4rem,7vw,3.6rem);line-height:1.05;margin:0}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
