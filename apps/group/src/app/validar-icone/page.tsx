"use client";

import * as React from "react";
import {
  IdentityDocTriggerIcon,
  type IdentityRole,
  type IdentityDocStatus,
} from "@v7m/ui";
import {
  Home,
  KeyRound,
  GraduationCap,
  Camera,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

const SAMPLE_RG_FRONT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
      <rect width="400" height="260" rx="14" fill="#0f291e" stroke="#10b981" stroke-width="4"/>
      <rect x="20" y="20" width="360" height="35" rx="6" fill="#064e3b"/>
      <text x="200" y="42" fill="#a7f3d0" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">REPÚBLICA FEDERATIVA DO BRASIL</text>
      <rect x="25" y="70" width="105" height="135" rx="8" fill="#022c22" stroke="#34d399" stroke-width="2"/>
      <circle cx="77" cy="115" r="28" fill="#10b981" opacity="0.8"/>
      <path d="M45 185 C45 150 110 150 110 185 Z" fill="#059669"/>
      <rect x="150" y="80" width="220" height="18" rx="4" fill="#065f46"/>
      <text x="160" y="93" fill="#d1fae5" font-size="10" font-family="sans-serif" font-weight="bold">REGISTRO GERAL (RG)</text>
      <rect x="150" y="110" width="220" height="25" rx="4" fill="#042f2e"/>
      <text x="160" y="127" fill="#6ee7b7" font-size="14" font-family="monospace" font-weight="bold">12.345.678-9 SSP/SP</text>
    </svg>
  `);

const SAMPLE_RG_BACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
      <rect width="400" height="260" rx="14" fill="#0f291e" stroke="#10b981" stroke-width="4"/>
      <rect x="20" y="20" width="360" height="30" rx="6" fill="#064e3b"/>
      <text x="200" y="40" fill="#a7f3d0" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">FILIAÇÃO E DADOS COMPLEMENTARES</text>
      <rect x="25" y="65" width="350" height="22" rx="4" fill="#022c22"/>
      <text x="35" y="80" fill="#a7f3d0" font-size="10" font-family="sans-serif">NOME: ESTUDANTE EXEMPLO V7M</text>
      <rect x="25" y="95" width="350" height="22" rx="4" fill="#022c22"/>
      <text x="35" y="110" fill="#6ee7b7" font-size="10" font-family="sans-serif">MÃE: MARIA DE FATIMA EXEMPLO</text>
    </svg>
  `);

export default function ValidarIconePublicoPage() {
  const [selectedRole, setSelectedRole] = React.useState<IdentityRole>("student");
  const [docStatus, setDocStatus] = React.useState<IdentityDocStatus>("rejected");

  const rejectionReason =
    selectedRole === "student"
      ? "A Secretaria de Educação exige que seja apresentado o RG original (a CNH não é aceita para fins de matrícula escolar)."
      : "O PDF da CNH deve ser extraído diretamente do aplicativo oficial da CNH Digital (Carteira Digital de Trânsito).";

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#012169] text-slate-100 p-4 sm:p-6 font-sans flex flex-col items-center">
      {/* Barra de controle rápida */}
      <div className="w-full max-w-lg mb-4 flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedRole("student")}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              selectedRole === "student" ? "bg-white text-[#012169] shadow-xs" : "text-white/80 hover:text-white"
            }`}
          >
            Aluno
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("promoter")}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              selectedRole === "promoter" ? "bg-white text-[#012169] shadow-xs" : "text-white/80 hover:text-white"
            }`}
          >
            Promotor
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDocStatus("rejected")}
            className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
              docStatus === "rejected" ? "bg-red-500 text-white" : "text-white/70 hover:text-white"
            }`}
          >
            Rejeitado
          </button>
          <button
            type="button"
            onClick={() => setDocStatus("empty")}
            className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
              docStatus === "empty" ? "bg-white/30 text-white" : "text-white/70 hover:text-white"
            }`}
          >
            Vazio
          </button>
          <button
            type="button"
            onClick={() => setDocStatus("analyzing")}
            className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
              docStatus === "analyzing" ? "bg-amber-400 text-slate-950" : "text-white/70 hover:text-white"
            }`}
          >
            Análise
          </button>
          <button
            type="button"
            onClick={() => setDocStatus("ok")}
            className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
              docStatus === "ok" ? "bg-emerald-500 text-white" : "text-white/70 hover:text-white"
            }`}
          >
            Aprovado (Verde)
          </button>
        </div>
      </div>

      {/* Card da Aplicação Real (Lista de Etapas / Deveres) */}
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-blue block">
              Verificação Cadastral & KYC
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Etapas de Verificação
            </h2>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <ShieldCheck className="size-4 text-brand-blue" />
            <span>5 Deveres</span>
          </div>
        </div>

        {/* LISTA DOS DEVERES — O ÍCONE FICA INTEGRADO NO SEU LUGAR E O CLIQUE ABRE O MODAL */}
        <div className="space-y-3">
          {/* 1. DOCUMENTO OFICIAL (USA O NOVO IDENTITY DOC TRIGGER ICON) */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-brand-blue/40 transition shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* O ÍCONE FICA AQUI E AO CLICAR DISPARA O MODAL CORRETO */}
              <IdentityDocTriggerIcon
                status={docStatus}
                role={selectedRole}
                rejectionReason={docStatus === "rejected" ? rejectionReason : null}
                size="md"
                pulse
                frontUrl={docStatus === "ok" ? SAMPLE_RG_FRONT : null}
                backUrl={docStatus === "ok" ? SAMPLE_RG_BACK : null}
                onStatusChange={(s) => setDocStatus(s)}
              />

              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {selectedRole === "student" ? "RG Oficial" : "Documento de Identificação"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {docStatus === "ok"
                    ? "Documento verificado e aprovado"
                    : docStatus === "analyzing"
                    ? "Em análise pela coordenação..."
                    : docStatus === "rejected"
                    ? "Rejeitado — clique para ajustar"
                    : "Pendente — clique para enviar"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {docStatus === "ok" && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="size-3.5" /> Aprovado
                </span>
              )}
              {docStatus === "analyzing" && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="size-3.5" /> Análise
                </span>
              )}
              {docStatus === "rejected" && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="size-3.5" /> Ajustar
                </span>
              )}
              {docStatus === "empty" && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
                  Pendente
                </span>
              )}
            </div>
          </div>

          {/* 2. Endereço */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white opacity-70">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Home className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Comprovante de Residência</p>
                <p className="text-xs text-slate-400">Conta de consumo recente</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-400" />
          </div>

          {/* 3. Chave PIX */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white opacity-70">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <KeyRound className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Chave PIX</p>
                <p className="text-xs text-slate-400">Para saques e recebimentos</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-400" />
          </div>

          {/* 4. Escolaridade */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white opacity-70">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Histórico Escolar</p>
                <p className="text-xs text-slate-400">Comprovação de estudos</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-400" />
          </div>

          {/* 5. Biometria Facial */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white opacity-70">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Camera className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Biometria Facial</p>
                <p className="text-xs text-slate-400">Selfie com prova de vida</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
