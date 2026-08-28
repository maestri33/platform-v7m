"use client";

import * as React from "react";
import Link from "next/link";
import {
  DocumentHubGrid,
  type DocumentItem,
} from "@v7m/ui";
import {
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Award,
} from "lucide-react";

const INITIAL_PROMOTER_DOCS: DocumentItem[] = [
  {
    id: "identity",
    title: "1. Documento de Identidade (RG ou CNH)",
    category: "civil",
    description: "Identificação civil para KYC e prevenção a fraudes.",
    status: "approved",
    extractedInfo: "CNH 06198519808 • Victor Vanderley Maestri • Val: 2033",
    fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    fileName: "cnh-digital-victor.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["promoter", "student"],
  },
  {
    id: "selfie",
    title: "2. Selfie com Biometria Facial",
    category: "biometric",
    description: "Prova de vida e validação com a foto do documento.",
    status: "approved",
    extractedInfo: "Score Biométrico: 98.4% Match (Liveness Pass)",
    fileUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    fileName: "selfie-biometria.jpg",
    mimeType: "image/jpeg",
    allowedAudiences: ["promoter", "student"],
  },
  {
    id: "address",
    title: "3. Comprovante de Residência",
    category: "address",
    description: "Conta de luz, água ou internet recente (últimos 90 dias).",
    status: "approved",
    extractedInfo: "Rua Marechal Deodoro, 500 - Curitiba/PR • CEP 80010-010",
    fileUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=1200&q=80",
    fileName: "fatura-sanepar.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["promoter", "student"],
  },
  {
    id: "pix",
    title: "4. Chave PIX & Titularidade",
    category: "finance",
    description: "Chave bancária em seu nome para repasse das comissões toda sexta.",
    status: "approved",
    extractedInfo: "Chave CPF: 091.***.***-39 • Nubank (Titularidade Confirmada)",
    fileUrl: null,
    fileName: null,
    allowedAudiences: ["promoter"],
  },
  {
    id: "school_history",
    title: "5. Declaração de Escolaridade",
    category: "academic",
    description: "Comprovação básica de escolaridade para registro cadastral.",
    status: "approved",
    extractedInfo: "Ensino Médio Concluído • Colégio Estadual do Paraná",
    fileUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=1200&q=80",
    fileName: "historico-escolar.jpg",
    mimeType: "image/jpeg",
    allowedAudiences: ["promoter"],
  },
  {
    id: "contract",
    title: "6. Termo de Parceria / Afiliado",
    category: "legal",
    description: "Regras de comissionamento de R$ 100/venda e diretrizes de compliance.",
    status: "approved",
    extractedInfo: "Assinado Digitalmente em 28/08/2026 01:10 (IP 187.**.**.**)",
    fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
    fileName: "termo-adesao-promotor.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["promoter"],
  },
];

const INITIAL_STUDENT_DOCS: DocumentItem[] = [
  {
    id: "identity",
    title: "1. Carteira de Identidade (Apenas RG/CIN)",
    category: "civil",
    description: "Documento oficial exigido pelo MEC/Secretaria de Educação (CNH não permitida).",
    status: "approved",
    extractedInfo: "RG 267601 SESP/PR • Victor Vanderley Maestri",
    fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    fileName: "rg-frente-verso.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["student"],
  },
  {
    id: "selfie",
    title: "2. Foto do Aluno (Selfie Prova de Vida)",
    category: "biometric",
    description: "Foto oficial para o prontuário escolar e carteirinha do estudante.",
    status: "approved",
    extractedInfo: "Biometria Aprovada • Foto Registrada no Prontuário",
    fileUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    fileName: "foto-aluno.jpg",
    mimeType: "image/jpeg",
    allowedAudiences: ["student"],
  },
  {
    id: "address",
    title: "3. Comprovante de Residência",
    category: "address",
    description: "Conta de consumo recente para comprovação do polo regional.",
    status: "approved",
    extractedInfo: "Rua Marechal Deodoro, 500 - Curitiba/PR • CEP 80010-010",
    fileUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=1200&q=80",
    fileName: "comprovante-residencia.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["student"],
  },
  {
    id: "school_history",
    title: "4. Histórico Escolar Anterior",
    category: "academic",
    description: "Comprova os anos concluídos para aproveitamento de disciplinas.",
    status: "approved",
    extractedInfo: "Origem: Colégio Estadual • Apto p/ Ensino Médio",
    fileUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=1200&q=80",
    fileName: "historico-anterior.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["student"],
  },
  {
    id: "civil_certificate",
    title: "5. Certidão de Nascimento ou Casamento",
    category: "civil",
    description: "Obrigatória pelo CEE/SISTEC para comprovação de estado civil e nome de registro.",
    status: "approved",
    extractedInfo: "Certidão de Nascimento • Registro Civil 1º Ofício de Curitiba",
    fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    fileName: "certidao-civil.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["student"],
  },
  {
    id: "voter_card",
    title: "6. Título de Eleitor & Quitação",
    category: "civil",
    description: "Exigência legal para colação de grau e homologação do certificado.",
    status: "approved",
    extractedInfo: "Título: 0123.4567.8900 • Zona 001 - Curitiba/PR",
    fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    fileName: "titulo-eleitor.jpg",
    mimeType: "image/jpeg",
    allowedAudiences: ["student"],
  },
  {
    id: "military_certificate",
    title: "7. Certificado de Reservista (Militar)",
    category: "civil",
    description: "Obrigatório para alunos do sexo masculino entre 18 e 45 anos.",
    status: "approved",
    extractedInfo: "Certificado de Dispensa de Incorporação (CDI) Nº 123456",
    fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    fileName: "reservista.jpg",
    mimeType: "image/jpeg",
    allowedAudiences: ["student"],
  },
  {
    id: "contract",
    title: "8. Contrato de Prestação Educacional",
    category: "legal",
    description: "Contrato formal de matrícula do Supletivo EJA EAD com aceite digital.",
    status: "approved",
    extractedInfo: "Contrato Assinado Digitalmente em 28/08/2026 (Hash SHA-256)",
    fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
    fileName: "contrato-matricula-eja.pdf",
    mimeType: "application/pdf",
    allowedAudiences: ["student"],
  },
];

export default function DocumentHubShowcasePage() {
  const [currentAudience, setCurrentAudience] = React.useState<"promoter" | "student">("promoter");
  const [promoterDocs, setPromoterDocs] = React.useState<DocumentItem[]>(INITIAL_PROMOTER_DOCS);
  const [studentDocs, setStudentDocs] = React.useState<DocumentItem[]>(INITIAL_STUDENT_DOCS);

  const activeDocs = currentAudience === "promoter" ? promoterDocs : studentDocs;

  const handleUploadMock = async (item: DocumentItem, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const updated = activeDocs.map((doc) => {
      if (doc.id === item.id) {
        return {
          ...doc,
          status: "approved" as const,
          fileUrl: objectUrl,
          fileName: file.name,
          mimeType: file.type,
          extractedInfo: `Arquivo carregado: ${file.name} (Validado via OCR)`,
        };
      }
      return doc;
    });

    if (currentAudience === "promoter") {
      setPromoterDocs(updated);
    } else {
      setStudentDocs(updated);
    }
  };

  const handleSignContractMock = async (item: DocumentItem) => {
    const updated = activeDocs.map((doc) => {
      if (doc.id === item.id) {
        return {
          ...doc,
          status: "approved" as const,
          extractedInfo: "Assinado Digitalmente agora mesmo (IP Registrado)",
        };
      }
      return doc;
    });

    if (currentAudience === "promoter") {
      setPromoterDocs(updated);
    } else {
      setStudentDocs(updated);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/30">
                Document Hub Live Studio
              </span>
              <span className="text-xs text-slate-400 font-mono">@v7m/ui • DutyStatusCard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Central Unificada de Documentos & Contratos
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Cards com status vivo, OCR automático, resolução de vínculo e visualizador seguro <code>[GET]</code> para todas as personas da plataforma.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="size-3.5" />
            <span>Voltar ao Painel</span>
          </Link>
        </div>

        {/* Persona Selector Tabs */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentAudience("promoter")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentAudience === "promoter"
                  ? "bg-brand-blue text-white shadow-md font-black"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Briefcase className="size-4" />
              <span>1. Pasta do Promotor (6 Documentos)</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentAudience("student")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentAudience === "student"
                  ? "bg-emerald-600 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <GraduationCap className="size-4" />
              <span>2. Pasta Acadêmica do Aluno (8 Documentos)</span>
            </button>
          </div>

          <span className="hidden sm:inline-flex text-[11px] font-mono text-slate-400 pr-2">
            Persona Ativa: <strong className="text-white capitalize ml-1">{currentAudience}</strong>
          </span>
        </div>

        {/* Live Grid */}
        <DocumentHubGrid
          audience={currentAudience}
          items={activeDocs}
          onUpload={handleUploadMock}
          onSignContract={handleSignContractMock}
        />
      </div>
    </div>
  );
}
