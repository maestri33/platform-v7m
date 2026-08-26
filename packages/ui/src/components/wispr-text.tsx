"use client";

import { useEffect, useState } from "react";

interface WisprTextProps {
  text: string;
  className?: string;
  /** Atraso inicial, em segundos. */
  delay?: number;
}

/**
 * Animação de texto estilo "Wispr Flow": as palavras entram em sequência,
 * saindo de um leve blur + deslocamento. O texto fica visível mesmo sem JS — a
 * animação é só enriquecimento — e respeita prefers-reduced-motion.
 */
export function WisprText({ text, className, delay = 0 }: WisprTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          data-w
          className="inline-block transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none"
          style={{
            transitionDelay: `${delay + i * 0.07}s`,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(40%)",
            filter: mounted ? "blur(0px)" : "blur(8px)",
          }}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
