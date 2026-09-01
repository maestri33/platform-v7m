interface StepperProps {
  /** 0..N-1 (the active step). When >= labels.length, the stepper renders as "all done". */
  current: number;
  labels: string[];
  /** aria-label for the <ol> (describes which flow). */
  ariaLabel?: string;
}

/**
 * Stepper visual de barras (sem numeração) — verde = concluído, azul = ativo,
 * branco translúcido = pendente. Promovido de aluno/_components pra ui/ porque é
 * o MESMO componente usado em /aluno, /provas e na matrícula (antes clonado
 * inline). Uma só fonte da verdade pro progresso do funil.
 */
export function Stepper({ current, labels, ariaLabel = "Etapas" }: StepperProps) {
  return (
    <ol className="flex gap-2" aria-label={ariaLabel}>
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              aria-current={active ? "step" : undefined}
              className={`h-1.5 rounded-full transition ${
                done ? "bg-brand-green" : active ? "bg-brand-blue-bright" : "bg-white/25"
              }`}
            />
            <span
              className={`text-center text-[11px] font-bold ${
                done
                  ? "text-brand-green-light"
                  : active
                    ? "text-white font-extrabold"
                    : "text-white/60"
              }`}
            >
              {done ? "✓ " : ""}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
