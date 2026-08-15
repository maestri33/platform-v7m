// Config das 7 cenas + tipos: arquivo puro (sem 'use client', sem JSX) pra
// servir de FONTE ÚNICA também pro e2e — o teste de integridade de assets
// deriva a lista de URLs daqui, então cena nova = cobertura automática.
import { MAPS, WHATSAPP } from "./site-data";

export interface ScrollWorldSection {
  id: string;
  label: string;
  still: string;
  stillMobile?: string;
  clip: string;
  clipMobile?: string;
  accent?: string;
  scroll?: number;
  linger?: number;
  eyebrow?: string;
  title?: string;
  body?: string;
  tags?: string[];
  cta?: {
    primary?: { label: string; href: string };
    secondary?: { label: string; href: string };
  };
}

export interface ScrollWorldConfig {
  brand?: { name: string; href: string };
  cta?: { label: string; href: string };
  hint?: string;
  nav?: boolean;
  atmosphere?: boolean;
  crossfade?: number;
  diveScroll?: number;
  connScroll?: number;
  sections: ScrollWorldSection[];
  connectors?: (string | null)[];
  connectorsMobile?: (string | null)[];
}

export const BASE = "/scroll-world";

export const CONFIG: ScrollWorldConfig = {
  brand: { name: "IEADPG · Jardim Amália", href: "#" },
  cta: { label: "Fale com a gente", href: WHATSAPP },
  hint: "role pra voar",
  // sem `crossfade`: a engine dá z-index 120 + opacidade 1 ao segmento ativo,
  // então o fade do que sai fica embaixo de uma camada opaca — o valor é
  // inerte e as emendas trocam direto (por isso o frame-lock dos clipes é o
  // que importa aqui, não o dissolve).
  diveScroll: 1.3,
  sections: [
    {
      id: "voo",
      label: "Decolagem",
      still: `${BASE}/am1-a.webp`,
      stillMobile: `${BASE}/am1-a-m.webp`,
      clip: `${BASE}/am1-a.mp4?v=g4`,
      clipMobile: `${BASE}/am1-a-m.mp4?v=540`,
      accent: "#e6d282",
      scroll: 1.4,
      linger: 0.25,
      eyebrow: "Igreja Evangélica Assembleia de Deus",
      title: "Somos uma família",
      body: "Vivendo a unidade em amor — role e voe com a gente até o sonho que Deus plantou no Jardim Amália.",
    },
    {
      id: "revelacao",
      label: "Revelação",
      still: `${BASE}/am1-b.webp`,
      stillMobile: `${BASE}/am1-b-m.webp`,
      clip: `${BASE}/am1-b.mp4?v=g4b`,
      clipMobile: `${BASE}/am1-b-m.mp4?v=540b`,
      scroll: 1.35,
      linger: 0.4,
      eyebrow: "A nossa casa tem nome",
      title: "IEADPG · Jardim Amália",
      body: "Aqui você é acolhido, edificado e preparado para viver o seu propósito em Deus.",
    },
    {
      id: "missao",
      label: "Missão",
      still: `${BASE}/am1-c.webp`,
      stillMobile: `${BASE}/am1-c-m.webp`,
      clip: `${BASE}/am1-c.mp4?v=g4`,
      clipMobile: `${BASE}/am1-c-m.mp4?v=540`,
      scroll: 1.3,
      linger: 0.35,
      eyebrow: "Nossa missão",
      title: "O que nos move",
      body: "“Juntos, caminhamos, aprendemos e servimos, construindo uma comunidade viva e transformadora.”",
    },
    {
      id: "dna",
      label: "DNA",
      still: `${BASE}/am2.webp`,
      stillMobile: `${BASE}/am2-m.webp`,
      clip: `${BASE}/am2.mp4?v=g4b`,
      clipMobile: `${BASE}/am2-m.mp4?v=540b`,
      scroll: 1.5,
      linger: 0.35,
      eyebrow: "Nosso DNA",
      title: "Seis verdades nos unem",
      body: "A essência de quem somos como família.",
      tags: ["Fé", "Unidade", "Família", "Palavra", "Amor", "Serviço"],
    },
    {
      id: "sonho",
      label: "O sonho",
      still: `${BASE}/am3.webp`,
      stillMobile: `${BASE}/am3-m.webp`,
      clip: `${BASE}/am3.mp4?v=g4`,
      clipMobile: `${BASE}/am3-m.mp4?v=540`,
      accent: "#faaa0a",
      scroll: 1.6,
      linger: 0.4,
      eyebrow: "Nosso sonho em construção",
      title: "O que Deus está levantando",
      body: "Assim vai ser a nossa nova casa — Rua Paulina Oliveira Gomes, 1071, no coração do Jardim Amália. Projeto em construção, fé em movimento.",
    },
    {
      id: "cultos",
      label: "Cultos",
      still: `${BASE}/am4.webp`,
      stillMobile: `${BASE}/am4-m.webp`,
      clip: `${BASE}/am4.mp4?v=g4`,
      clipMobile: `${BASE}/am4-m.mp4?v=540`,
      accent: "#fa5a0a",
      scroll: 1.5,
      linger: 0.3,
      eyebrow: "Cultos e encontros",
      title: "A semana tem ritmo",
      body: "Domingo 19h · Celebração — Quarta 20h · Alinhamento. Na Rua Paulina Oliveira Gomes, 1071: louvor, Palavra e comunhão.",
    },
    {
      id: "visite",
      label: "Visite",
      still: `${BASE}/am5.webp`,
      stillMobile: `${BASE}/am5-m.webp`,
      clip: `${BASE}/am5.mp4?v=g4`,
      clipMobile: `${BASE}/am5-m.mp4?v=540`,
      accent: "#faaa0a",
      scroll: 1.8,
      linger: 0.45,
      eyebrow: "Sua família te espera",
      title: "Venha sonhar com a gente",
      body: "O prédio ainda está nascendo, mas a família já está aqui, de portas abertas. “Acima de tudo, revistam-se do amor” — Colossenses 3:14.",
      cta: {
        primary: { label: "Quero fazer parte", href: WHATSAPP },
        secondary: { label: "Como chegar", href: MAPS },
      },
    },
  ],
};

