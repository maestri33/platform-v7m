"use client";

import * as React from "react";
import Link from "next/link";
import {
  AddressProofCapture,
  type AddressProofStep,
  type ExtractedProofData,
} from "@v7m/ui";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Users,
  Eye,
  ArrowLeft,
  Home,
} from "lucide-react";

const DEMO_PRESETS: Record<AddressProofStep, ExtractedProofData | null> = {
  empty: null,
  analyzing: null,
  error: null,
  needs_kinship: {
    file_url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=1200&q=80",
    file_name: "conta-de-luz-copel.jpg",
    mime_type: "image/jpeg",
    holder_name: "IMOBILIARIA CURITIBA LTDA",
    is_own_name: false,
    matched_parent: null,
    address: {
      zipcode: "80010-010",
      street: "Rua Marechal Deodoro",
      number: "500",
      complement: "Apto 1204",
      neighborhood: "Centro",
      city: "Curitiba",
      state: "PR",
    },
  },
  satisfied: {
    file_url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=1200&q=80",
    file_name: "fatura-sanepar-victor.pdf",
    mime_type: "application/pdf",
    holder_name: "VICTOR VANDERLEY MAESTRI",
    is_own_name: true,
    matched_parent: null,
    kinship_provided: "Próprio Titular",
    address: {
      zipcode: "80010-010",
      street: "Rua Marechal Deodoro",
      number: "500",
      complement: "Apto 1204",
      neighborhood: "Centro",
      city: "Curitiba",
      state: "PR",
    },
  },
};

export default function AddressProofShowcasePage() {
  const [currentStep, setCurrentStep] = React.useState<AddressProofStep>("empty");
  const [demoData, setDemoData] = React.useState<ExtractedProofData | null>(null);

  const applyPreset = (step: AddressProofStep) => {
    setCurrentStep(step);
    setDemoData(DEMO_PRESETS[step]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-black text-amber-300 border border-amber-400/30">
                Studio UI & Componentes
              </span>
              <span className="text-xs text-slate-400 font-mono">@v7m/ui</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              AddressProofCapture · Comprovante-Primeiro
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Componente inteligente de endereço: extração automática via OCR, tolerância a terceiros/parentesco e visualização segura (GET) do documento.
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

        {/* State Switcher Bar */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-400" />
              Simular Estados da Máquina de Estados (1-Clique):
            </span>
            <span className="text-[11px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
              Estado Atual: <strong>{currentStep}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => applyPreset("empty")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                currentStep === "empty"
                  ? "bg-brand-blue text-white shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <UploadCloud className="size-3.5" />
              <span>1. Vazio</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("analyzing")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                currentStep === "analyzing"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <RefreshCw className="size-3.5 animate-spin" />
              <span>2. Em Análise</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("error")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                currentStep === "error"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <AlertTriangle className="size-3.5" />
              <span>3. Erro / Ilegível</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("needs_kinship")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                currentStep === "needs_kinship"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Users className="size-3.5" />
              <span>4. Terceiro / Vínculo</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("satisfied")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer col-span-2 sm:col-span-1 ${
                currentStep === "satisfied"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              <span>5. Satisfeito</span>
            </button>
          </div>
        </div>

        {/* Live Component Container */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-8 shadow-2xl">
          <AddressProofCapture
            key={currentStep}
            step={currentStep}
            initialData={demoData}
            title="Comprovante de Residência"
            description="Envie uma foto ou PDF recente de luz, água, internet ou gás. O endereço será preenchido automaticamente."
            onUploadFile={async (file: File) => {
              // Interactive real file test
              return {
                file_url: URL.createObjectURL(file),
                file_name: file.name,
                mime_type: file.type,
                holder_name: "VICTOR VANDERLEY MAESTRI",
                is_own_name: true,
                address: {
                  zipcode: "80010-010",
                  street: "Rua Marechal Deodoro",
                  number: "500",
                  complement: "Apto 1204",
                  neighborhood: "Centro",
                  city: "Curitiba",
                  state: "PR",
                },
              };
            }}
            onConfirmKinship={async (kinshipId: string) => {
              applyPreset("satisfied");
            }}
            onReset={() => {
              applyPreset("empty");
            }}
          />
        </div>

        {/* Technical Highlights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Zero Digitação Manual
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O usuário não digita CEP nem rua. O OCR extrai e valida diretamente da imagem ou PDF.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="text-amber-400">✓</span> Tolerância a Terceiros
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Conta de aluguel ou moradia compartilhada é resolvida via modal rápido de vínculo sem travar o funil.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="text-blue-400">✓</span> Visualizador GET Integrado
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Quando satisfeito, permite inspecionar e baixar o documento anexado a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
