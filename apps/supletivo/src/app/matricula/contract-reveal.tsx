"use client";

import { useEffect, useState } from "react";
import { getContract, whoami } from "@/lib/api";
import {
  StudentContractReveal,
  DEFAULT_CONTRACT_CLAUSES,
  type ContractClause,
} from "@v7m/ui";

/**
 * Wrapper de domínio da revelação de contrato para o app-supletivo.
 * Busca o texto oficial do backend (GET /contract/current) e renderiza
 * o componente canônico StudentContractReveal do @v7m/ui.
 */
export function ContractReveal({ onAccept }: { onAccept: () => void }) {
  const [name, setName] = useState<string | null>(null);
  const [clauses, setClauses] = useState<ContractClause[]>(
    DEFAULT_CONTRACT_CLAUSES
  );

  useEffect(() => {
    let cancelled = false;
    whoami()
      .then((w) => {
        if (!cancelled && typeof w.name === "string" && w.name.trim())
          setName(w.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getContract()
      .then((c) => {
        if (cancelled) return;
        const blocks = c.text
          .split(/\n\s*\n/)
          .map((b) => b.replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (!blocks.length) return;
        const [head, ...rest] = blocks;
        setClauses([
          { t: head, d: rest[0] ?? "" },
          ...rest.slice(1).map((d, i) => ({ t: `Cláusula ${i + 2}`, d })),
          {
            t: "Versão deste contrato",
            d: `${c.version} · ${c.hash.slice(0, 12)}…`,
          },
        ]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StudentContractReveal
      onAccept={onAccept}
      studentName={name ?? "Seu nome"}
      clauses={clauses}
    />
  );
}
