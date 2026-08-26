"use client";

import { useEffect, useState } from "react";

function label(target: Date, now: Date): string {
  const msLeft = Math.max(0, target.getTime() - now.getTime());
  const hoursLeft = Math.floor(msLeft / 3_600_000);
  const daysLeft = Math.floor(hoursLeft / 24);
  const minLeft = Math.floor((msLeft % 3_600_000) / 60_000);
  if (daysLeft > 0) return `${daysLeft}d ${hoursLeft % 24}h`;
  if (hoursLeft > 0) return `${hoursLeft}h ${minLeft}min`;
  return `${minLeft}min`;
}

/**
 * Contagem regressiva até um instante ISO (fechamento da semana). Só calcula no
 * client (depende do relógio — evita mismatch de hidratação) e atualiza a cada
 * 30s. `urgentBelowHours` acende o tempo em âmbar na reta final (ex.: meta
 * ainda aberta a menos de 24h do fechamento).
 */
export function Countdown({
  target,
  urgentBelowHours,
}: {
  target: string;
  urgentBelowHours?: number;
}) {
  const [text, setText] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const t = new Date(target);
    if (Number.isNaN(t.getTime())) return;
    const tick = () => {
      const now = new Date();
      setText(label(t, now));
      if (urgentBelowHours != null) {
        const hoursLeft = (t.getTime() - now.getTime()) / 3_600_000;
        setUrgent(hoursLeft > 0 && hoursLeft < urgentBelowHours);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [target, urgentBelowHours]);

  if (!text) return <span aria-hidden>…</span>;
  return <span className={urgent ? "font-bold text-brand-warn-soft" : undefined}>{text}</span>;
}
