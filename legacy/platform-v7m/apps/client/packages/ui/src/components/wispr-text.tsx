"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

interface WisprTextProps {
  text: string;
  className?: string;
  /** Atraso inicial, em segundos. */
  delay?: number;
}

/**
 * Animação de texto estilo "Wispr Flow" (GSAP): as palavras entram em sequência,
 * saindo de um leve blur + deslocamento. O texto fica visível mesmo sem JS — a
 * animação é só enriquecimento — e respeita prefers-reduced-motion.
 */
export function WisprText({ text, className, delay = 0 }: WisprTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = el.querySelectorAll<HTMLElement>("[data-w]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { opacity: 0, yPercent: 40, "--wb": "12px" },
        {
          opacity: 1,
          yPercent: 0,
          "--wb": "0px",
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
          delay,
        },
      );
    }, el);
    return () => ctx.revert();
  }, [text, delay]);

  const words = text.split(" ");
  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          data-w
          className="inline-block"
          style={{ filter: "blur(var(--wb, 0px))", willChange: "transform, opacity, filter" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
