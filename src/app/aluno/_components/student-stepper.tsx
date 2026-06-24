interface StudentStepperProps {
  /** 0..N-1 (the active step). When >= STEPS.length, the stepper renders as "all done". */
  current: number;
  labels: string[];
}

/**
 * Stepper visual de barras (sem numeração), espelhando o estilo da matrícula.
 * Verde = concluído, azul = ativo, branco translúcido = pendente.
 */
export function StudentStepper({ current, labels }: StudentStepperProps) {
  return (
    <ol className="flex gap-2" aria-label="Etapas da entrega de documentos">
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
                    ? "text-brand-blue-bright"
                    : "text-white/55"
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
