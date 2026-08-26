"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Escala mínima — abaixo disso o conteúdo fica ilegível; se mesmo assim
// transbordar, o problema é a tela ter conteúdo demais (compactar no design).
const MIN_SCALE = 0.65;

/**
 * FitViewport — enquandra o conteúdo na altura disponível SEM scrollar.
 * Se o conteúdo transborda, aplica transform: scale() pra caber (handoff §23,
 * a técnica `fitToViewport()` da Auth). Re-medide em resize e em mudança de
 * conteúdo (ResizeObserver). Respeita prefers-reduced-motion (só escala, sem
 * animação de transição pesada).
 */
export function FitViewport({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const avail = container.clientHeight;
      // scrollHeight reflete o layout natural — transform NÃO o afeta.
      const needed = content.scrollHeight;
      const next = needed > avail ? Math.max(MIN_SCALE, avail / needed) : 1;
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  });

  return (
    <div
      ref={containerRef}
      className={`flex justify-center overflow-hidden ${className}`}
    >
      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        className="w-full max-w-md"
      >
        {children}
      </div>
    </div>
  );
}
