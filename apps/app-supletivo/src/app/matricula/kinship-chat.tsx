"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const COPY = {
  confirm: {
    title: "Qual é o parentesco?",
    body: "O comprovante parece estar no nome de alguém da sua família. Confirma pra gente quem é e o grau de parentesco?",
    placeholder: "Ex.: É da minha mãe, Maria da Silva…",
    chips: [
      "Mãe",
      "Pai",
      "Cônjuge / Esposo(a)",
      "Filho(a)",
      "Irmão / Irmã",
      "Avô / Avó",
      "Tio(a)",
    ],
  },
  justify: {
    title: "De quem é a conta?",
    body: "O comprovante está no nome de outra pessoa. Conte pra gente quem é o titular e qual é o seu vínculo com esse endereço — pode escolher uma opção ou escrever abaixo.",
    placeholder: "Ex.: Moro de aluguel e a conta de luz vem no nome do locador…",
    chips: [
      "Cônjuge / Esposo(a)",
      "Moro com meus pais",
      "Aluguel / Locador",
      "Pensão / Quitinete",
      "Moro de favor",
      "Imóvel da família",
    ],
  },
} as const;

export function KinshipChat({
  onSubmit,
  busy = false,
  kind = "justify",
}: {
  /** registra o parentesco (texto) → submitAddressProofKinship no chamador */
  onSubmit: (relation: string) => Promise<void>;
  busy?: boolean;
  /** "confirm" = sobrenome em comum (só o grau) · "justify" = sem relação aparente (vínculo). */
  kind?: "confirm" | "justify";
}) {
  const copy = COPY[kind];
  const [relation, setRelation] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  function handleSelectChip(chip: string) {
    setSelectedChip(chip);
    setRelation(chip);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = relation.trim();
    if (!text || busy) return;
    await onSubmit(text);
  }

  const isValid = relation.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-brand-ink">{copy.title}</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-brand-muted">{copy.body}</p>
      </div>

      {/* Chips de seleção rápida para facilitar o preenchimento em tela touch */}
      <div className="flex flex-wrap gap-2">
        {copy.chips.map((chip) => {
          const isSelected = selectedChip === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => handleSelectChip(chip)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
                isSelected
                  ? "bg-brand-blue text-white shadow-sm"
                  : "border border-brand-border bg-white text-brand-ink hover:border-brand-blue/40"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="kinship-input" className="text-xs font-semibold text-brand-muted">
          Ou explique com suas palavras:
        </label>
        <textarea
          id="kinship-input"
          value={relation}
          onChange={(e) => {
            setRelation(e.target.value);
            if (selectedChip && e.target.value !== selectedChip) {
              setSelectedChip(null);
            }
          }}
          placeholder={copy.placeholder}
          rows={3}
          disabled={busy}
          className="w-full resize-none rounded-xl border border-brand-border bg-white p-3 text-[15px] text-brand-ink placeholder:text-brand-muted/60 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:bg-brand-border/30"
        />
      </div>

      <Button
        type="submit"
        disabled={!isValid || busy}
        loading={busy}
        variant="primary"
        className="w-full"
      >
        Confirmar e avançar
      </Button>
    </form>
  );
}
