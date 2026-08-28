import type { Metadata } from "next";
import { DocumentosAlunoClient } from "../../documentos/DocumentosAlunoClient";

export const metadata: Metadata = {
  title: "Pasta Acadêmica do Aluno · Supletivo Brasil",
  description: "Resolução e acompanhamento dos 8 documentos regulatórios MEC do aluno.",
};

export default function AlunoDocumentosPage() {
  return (
    <main id="conteudo" className="flex-1">
      <DocumentosAlunoClient />
    </main>
  );
}
