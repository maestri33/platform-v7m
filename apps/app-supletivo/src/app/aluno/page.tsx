import type { Metadata } from "next";
import { DocumentosAlunoClient } from "../documentos/DocumentosAlunoClient";

export const metadata: Metadata = {
  title: "Área do Aluno · Supletivo Brasil",
  description: "Acompanhamento da matrícula, documentos regulatórios e liberação de provas.",
};

export default function AlunoPage() {
  return (
    <main id="conteudo" className="flex flex-1 flex-col">
      <DocumentosAlunoClient />
    </main>
  );
}

