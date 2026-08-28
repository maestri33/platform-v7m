import type { Metadata } from "next";
import { DocumentosAlunoClient } from "./DocumentosAlunoClient";

export const metadata: Metadata = {
  title: "Documentos e Pasta Acadêmica · Supletivo Brasil",
  description: "Resolução e acompanhamento dos 8 documentos regulatórios MEC do aluno.",
};

export default function DocumentosPage() {
  return (
    <main id="conteudo" className="flex-1">
      <DocumentosAlunoClient />
    </main>
  );
}
