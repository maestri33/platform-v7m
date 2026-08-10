"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ENDERECO, MAPS, WHATSAPP } from "./site-data";

interface ScrollWorldSection {
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

interface ScrollWorldConfig {
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

declare global {
  interface Window {
    mountScrollWorld?: (el: HTMLElement, cfg: ScrollWorldConfig) => void;
  }
}

const BASE = "/scroll-world";

const CONFIG: ScrollWorldConfig = {
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
      clip: `${BASE}/am1-a.mp4`,
      clipMobile: `${BASE}/am1-a-m.mp4?v=540`,
      accent: "#e6d282",
      scroll: 1.6,
      eyebrow: "Igreja Evangélica Assembleia de Deus",
      title: "Somos uma família",
      body: "Vivendo a unidade em amor — role e voe com a gente até o sonho que Deus plantou no Jardim Amália.",
    },
    {
      id: "revelacao",
      label: "Revelação",
      still: `${BASE}/am1-b.webp`,
      stillMobile: `${BASE}/am1-b-m.webp`,
      clip: `${BASE}/am1-b.mp4`,
      clipMobile: `${BASE}/am1-b-m.mp4?v=540`,
      scroll: 1.5,
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
      clip: `${BASE}/am1-c.mp4`,
      clipMobile: `${BASE}/am1-c-m.mp4?v=540`,
      eyebrow: "Nossa missão",
      title: "O que nos move",
      body: "“Juntos, caminhamos, aprendemos e servimos, construindo uma comunidade viva e transformadora.”",
    },
    {
      id: "dna",
      label: "DNA",
      still: `${BASE}/am2.webp`,
      stillMobile: `${BASE}/am2-m.webp`,
      clip: `${BASE}/am2.mp4`,
      clipMobile: `${BASE}/am2-m.mp4?v=540`,
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
      clip: `${BASE}/am3.mp4`,
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
      clip: `${BASE}/am4.mp4`,
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
      clip: `${BASE}/am5.mp4`,
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

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [engineFailed, setEngineFailed] = useState(false);

  // Sincroniza com um sistema externo (a engine vendorizada): os setState abaixo
  // refletem o resultado do mount, que só pode ser conhecido depois dele.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!engineReady) return;
    const host = ref.current;
    if (!host) return;
    if (!window.mountScrollWorld) {
      // script carregou mas a global não existe (cache truncado, extensão):
      // revela o fallback em vez de deixar a página preta
      setEngineFailed(true);
      return;
    }
    // StrictMode roda o effect 2x em dev: a engine monta uma vez só, mas o
    // observer abaixo precisa religar nas duas passadas
    if (host.dataset.swMounted) {
      setMounted(true);
    } else {
      try {
        host.dataset.swMounted = "1";
        window.mountScrollWorld(host, CONFIG);
        setMounted(true);
      } catch {
        // mount pode falhar no meio (DOM parcial da engine já anexado):
        // limpa antes de revelar o fallback, senão o sky fixo cobre a página
        delete host.dataset.swMounted; // falha não pode passar por mount ok
        host.replaceChildren();
        host.classList.remove("sw-root");
        setEngineFailed(true);
        return;
      }
    }

    // A engine marca o destino atual só com a classe .is-active; espelha isso
    // em aria-current pra quem navega por leitor de tela saber onde está.
    const rail = host.querySelector(".sw-route");
    const nav = host.querySelector(".sw-nav");
    const sync = () => {
      for (const root of [rail, nav]) {
        if (!root) continue;
        for (const btn of root.querySelectorAll("button")) {
          if (btn.classList.contains("is-active")) {
            btn.setAttribute("aria-current", "true");
          } else {
            btn.removeAttribute("aria-current");
          }
        }
      }
    };
    sync();
    const obs = new MutationObserver(sync);
    for (const root of [rail, nav]) {
      if (root) {
        obs.observe(root, {
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    }

    // --- Virtualização de decodificadores (só em telefone) ---------------
    // A engine carrega os 7 clipes e NUNCA os libera: no fim da página são 7
    // <video> fullscreen vivos. Telefone tem um teto de decodificadores de
    // hardware simultâneos (tipicamente 2-4) — estourar não deixa lento, TRAVA.
    // Mantém no máximo 3 (a cena atual e as vizinhas) e devolve as outras pro
    // poster, restaurando o src pelo blob que a engine já criou.
    let releaseCleanup: (() => void) | undefined;
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      const scenes = Array.from(host.querySelectorAll<HTMLElement>(".sw-scene"));
      const blobs = new WeakMap<HTMLVideoElement, string>();
      let queued = false;

      const virtualize = () => {
        queued = false;
        // cena atual = a de maior opacidade (a engine escreve inline)
        let active = 0;
        let best = -1;
        scenes.forEach((el, i) => {
          const op = parseFloat(el.style.opacity) || 0;
          if (op > best) {
            best = op;
            active = i;
          }
        });
        // até 3 decodificadores vivos cabe no orçamento de qualquer telefone:
        // só libera acima disso (o teto limita a LIBERAÇÃO, nunca o retorno —
        // senão a primeira liberação deixaria a cena em poster pra sempre)
        let vivos = scenes.filter((el) => {
          const v = el.querySelector("video");
          return !!v?.src;
        }).length;
        scenes.forEach((el, i) => {
          const v = el.querySelector("video");
          if (!v) return;
          if (v.src && !blobs.has(v)) blobs.set(v, v.src);
          const near = Math.abs(i - active) <= 1;
          if (near && !v.src) {
            const url = blobs.get(v);
            if (!url) return;
            v.src = url;
            vivos++;
            // o listener 'seeked' original da engine já disparou uma vez
            v.addEventListener("seeked", () => el.classList.add("has-clip"), {
              once: true,
            });
          } else if (!near && v.src && vivos > 3) {
            el.classList.remove("has-clip"); // volta o poster estático
            v.removeAttribute("src");
            v.load(); // libera o decodificador de fato
            vivos--;
          }
        });
      };

      const onScroll = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(virtualize);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      const iv = window.setInterval(virtualize, 1000); // pega clipes que carregam depois
      releaseCleanup = () => {
        window.removeEventListener("scroll", onScroll);
        window.clearInterval(iv);
      };
    }

    return () => {
      obs.disconnect();
      releaseCleanup?.();
    };
  }, [engineReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <Script
        src="/scroll-world/scrub-engine.js"
        strategy="afterInteractive"
        onReady={() => setEngineReady(true)}
        onError={() => setEngineFailed(true)}
      />
      {/* Conteúdo prerenderizado: indexável sem JS; vira a página visível se a
          engine falhar em carregar. aria-hidden quando a engine está no ar pra
          não duplicar a leitura em leitor de tela. */}
      {/* predicados espelham o isMobile() da engine: ((hover:none) and
          (pointer:coarse)) OU ≤860px. Poster = LCP → prioridade alta;
          clipe só é consumido pós-mount → baixa. Os as="fetch" levam
          crossOrigin="anonymous" pra casar com o fetch() default da engine
          (cors + same-origin) — sem isso o preload é descartado e o clipe
          baixa duas vezes; os as="image" ficam SEM crossorigin (o img.src
          da engine é no-cors e já casa). */}
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        href={`${BASE}/am1-a.webp`}
        media="(min-width: 861px) and (hover: hover), (min-width: 861px) and (pointer: fine)"
      />
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        href={`${BASE}/am1-a-m.webp`}
        media="(max-width: 860px), ((hover: none) and (pointer: coarse))"
      />
      {/* clipe não é baixado pela engine sob prefers-reduced-motion nem sem
          JS — as guardas entram em CADA alternativa (vírgula = OR) */}
      <link
        rel="preload"
        as="fetch"
        fetchPriority="low"
        crossOrigin="anonymous"
        href={`${BASE}/am1-a.mp4`}
        media="(min-width: 861px) and (hover: hover) and (prefers-reduced-motion: no-preference) and (scripting: enabled), (min-width: 861px) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (scripting: enabled)"
      />
      <link
        rel="preload"
        as="fetch"
        fetchPriority="low"
        crossOrigin="anonymous"
        href={`${BASE}/am1-a-m.mp4?v=540`}
        media="(max-width: 860px) and (prefers-reduced-motion: no-preference) and (scripting: enabled), ((hover: none) and (pointer: coarse)) and (prefers-reduced-motion: no-preference) and (scripting: enabled)"
      />
      {/* logo da topbar: descoberto só no mount sem isto (pop-in tardio) */}
      <link
        rel="preload"
        as="image"
        href="/ieadpg-logo.webp"
        media="(min-width: 521px)"
      />
      <link
        rel="preload"
        as="image"
        href="/flame.webp"
        media="(max-width: 520px)"
      />
      {/* aria-hidden/inert só DEPOIS do mount bem-sucedido: o HTML servido
          fica limpo pro caminho no-JS (noscript revela um fallback vivo); a
          janela pré-boot fica fora do tab-order via visibility:hidden. */}
      <main>
      <section
        className={`sw-fallback${engineFailed ? " is-visible" : ""}`}
        aria-labelledby="sw-fallback-title"
        aria-hidden={mounted ? true : undefined}
        inert={mounted ? true : undefined}
      >
        <p className="sw-fallback__eyebrow">
          Igreja Evangélica Assembleia de Deus
        </p>
        <h1 id="sw-fallback-title">IEADPG · Jardim Amália</h1>
        <p>
          Somos uma família vivendo a unidade em amor — e estamos construindo a
          nossa nova casa no Jardim Amália. O prédio que aparece nos vídeos
          deste site é o projeto: o nosso sonho tomando forma. Aqui você é
          acolhido, edificado e preparado para viver o seu propósito em Deus.
        </p>
        <p>
          <strong>Cultos:</strong> Domingo 19h · Celebração — Quarta 20h ·
          Alinhamento
        </p>
        <p>
          <strong>Endereço:</strong> {ENDERECO}
        </p>
        <p>
          “Juntos, caminhamos, aprendemos e servimos, construindo uma comunidade
          viva e transformadora.”
        </p>
        <p>
          <strong>Nosso DNA:</strong> Fé, Unidade, Família, Palavra, Amor e
          Serviço — a essência de quem somos.
        </p>
        <p>
          “Acima de tudo, revistam-se do amor” — Colossenses 3:14. Essa é a
          marca da nossa família, e o sonho da nova casa é fé em movimento.
        </p>
        <p>
          <a className="sw-fallback__cta" href={WHATSAPP}>
            Falar com a gente no WhatsApp
          </a>{" "}
          <a href={MAPS}>Como chegar</a>
        </p>
      </section>
      {/* h1 do caminho engine-ok (o do fallback fica inert pós-mount): sempre
          exatamente um h1 ativo, e os h2 das cenas deixam de ser órfãos. */}
      {mounted && (
        <h1 className="sw-sronly">
          IEADPG Jardim Amália — um voo até o nosso sonho
        </h1>
      )}
      {/* host exclusivo da engine: ela dá appendChild aqui e o catch limpa
          com replaceChildren, então nada do React pode morar dentro */}
      <div
        ref={ref}
        role={mounted ? "region" : undefined}
        aria-label={mounted ? "Voo pelo sonho da nova casa" : undefined}
      />
      </main>
      {/* hero pré-boot: o primeiro poster pinta direto do HTML (LCP), atrás de
          tudo (z-index -1, position fixed). Sai do DOM no mount — camada
          fullscreen permanente na composição é jank de celular. */}
      {!mounted && (
        <picture>
          <source
            media="(max-width: 860px), ((hover: none) and (pointer: coarse))"
            srcSet={`${BASE}/am1-a-m.webp`}
          />
          <img
            className="sw-preboot"
            src={`${BASE}/am1-a.webp`}
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      )}
    </>
  );
}
