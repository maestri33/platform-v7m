"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DiplomaFlag } from "@/components/ui/diploma-flag";
import { whoami } from "@/lib/api";

/** Contrato fatiado em cláusulas — texto provisório (versão final a definir). */
const CLAUSES: { t: string; d: string }[] = [
  {
    t: "Sua matrícula no Supletivo Brasil",
    d: "Pelo presente instrumento particular, o(a) ALUNO(A) contrata os serviços educacionais do SUPLETIVO BRASIL para a conclusão do nível de ensino indicado em sua matrícula, na modalidade de Educação de Jovens e Adultos (EJA), 100% online.",
  },
  {
    t: "Veracidade e uso de imagem",
    d: "O(A) ALUNO(A) declara que as informações prestadas são verdadeiras e autoriza o uso da sua imagem e biometria exclusivamente para fins de identificação e validação da matrícula.",
  },
  {
    t: "Assinatura por biometria",
    d: "A assinatura digital coletada nesta etapa, por meio de captura fotográfica, tem valor de aceite e confirma a identidade do(a) contratante.",
  },
  {
    t: "Proteção dos seus dados (LGPD)",
    d: "O presente contrato observa a Lei Geral de Proteção de Dados (LGPD). Seus dados são tratados apenas para os fins da matrícula.",
  },
  {
    t: "Cláusulas completas no painel",
    d: "Demais cláusulas, prazos e condições serão disponibilizados na íntegra no painel do(a) ALUNO(A). (Texto provisório — versão final a definir.)",
  },
];

/**
 * Contrato em "sticky scroll reveal": as cláusulas rolam de um lado; do outro,
 * fixo, o diploma com o nome do aluno vai se revelando (escala + opacidade)
 * conforme o scroll avança. O aceite só libera ao chegar ao fim da leitura.
 * Reveal animado com GSAP (quickTo); respeita prefers-reduced-motion.
 */
export function ContractReveal({ onAccept }: { onAccept: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const diplomaRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    whoami()
      .then((w) => {
        if (!cancelled && typeof w.name === "string" && w.name.trim()) setName(w.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const dip = diplomaRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (dip) gsap.set(dip, reduce ? { scale: 1, opacity: 1 } : { scale: 0.82, opacity: 0.4 });
    const setScale = !reduce && dip ? gsap.quickTo(dip, "scale", { duration: 0.4, ease: "power3.out" }) : null;
    const setOpacity = !reduce && dip ? gsap.quickTo(dip, "opacity", { duration: 0.4, ease: "power3.out" }) : null;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = el.scrollHeight - el.clientHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1;
        setProgress(p);
        const sections = el.querySelectorAll<HTMLElement>("[data-clause]");
        const mid = el.scrollTop + el.clientHeight * 0.5;
        let idx = 0;
        sections.forEach((s, i) => {
          if (s.offsetTop <= mid) idx = i;
        });
        setActiveIdx(idx);
        if (setScale && setOpacity) {
          setScale(0.82 + 0.18 * p);
          setOpacity(0.4 + 0.6 * p);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const canAccept = progress > 0.9;

  return (
    <div className="fixed inset-0 z-50 bg-brand-ink/70 backdrop-blur-md">
      <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
        <div className="relative mx-auto max-w-4xl px-5 py-8 md:grid md:grid-cols-2 md:gap-10">
          {/* Diploma fixo (banner no topo no mobile; coluna direita no desktop) */}
          <div className="sticky top-0 z-10 -mx-5 mb-4 flex flex-col items-center gap-2 bg-brand-ink/50 px-5 py-3 backdrop-blur-md md:order-2 md:mx-0 md:mb-0 md:h-dvh md:justify-center md:bg-transparent md:py-0 md:backdrop-blur-none">
            <div ref={diplomaRef} className="w-40 will-change-transform md:w-full md:max-w-xs">
              <DiplomaFlag name={name ?? "Seu nome"} />
            </div>
            <p className="hidden text-center text-xs font-semibold text-white/60 md:block">
              Role para ler — seu diploma vai aparecendo
            </p>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-brand-green-light"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          {/* Cláusulas */}
          <div className="flex flex-col gap-7 md:order-1">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-brand-green-light">
                Contrato de matrícula
              </p>
              <h3 className="text-2xl font-extrabold text-white">Leia e assine</h3>
              <p className="text-[14px] leading-relaxed text-white/70">
                Role até o fim para liberar a assinatura.
              </p>
            </div>

            {CLAUSES.map((c, i) => (
              <section
                key={c.t}
                data-clause
                className={`rounded-2xl border p-5 transition-colors duration-300 ${
                  i === activeIdx
                    ? "border-brand-green-light/60 bg-white/10"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <h4 className="mb-2 text-base font-bold text-white">{c.t}</h4>
                <p className="text-[14px] leading-relaxed text-white/75">{c.d}</p>
              </section>
            ))}

            <div className="pb-2">
              <Button onClick={onAccept} disabled={!canAccept}>
                {canAccept ? "Li e aceito os termos" : "Role até o fim para aceitar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
