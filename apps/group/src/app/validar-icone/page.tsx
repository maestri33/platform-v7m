"use client";

import * as React from "react";
import {
  IdentityDocTriggerIcon,
  IdentityDocumentCaptureFlow,
  type IdentityRole,
  type IdentityDocStatus,
} from "@v7m/ui";
import {
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

export default function ValidarIconePublicoPage() {
  const [selectedRole, setSelectedRole] = React.useState<IdentityRole>("student");
  const [docStatus, setDocStatus] = React.useState<IdentityDocStatus>("empty");
  const [lastRejection, setLastRejection] = React.useState<string | null>(null);
  const [aiLogs, setAiLogs] = React.useState<Array<{ time: string; msg: string; type: "info" | "success" | "error" }>>([
    {
      time: new Date().toLocaleTimeString(),
      msg: "Sistema pronto. Suba um documento real para testar a classificação da IA.",
      type: "info",
    },
  ]);

  const addLog = (msg: string, type: "info" | "success" | "error" = "info") => {
    setAiLogs((prev) => [
      { time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 9),
    ]);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#012169] text-slate-100 p-4 sm:p-6 font-sans flex flex-col items-center">
      {/* Barra de Controle de Teste no Topo */}
      <div className="w-full max-w-xl mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white/70">Testar como:</span>
          <button
            type="button"
            onClick={() => {
              setSelectedRole("student");
              addLog("Perfil alterado para: ALUNO (MEC exige estritamente RG; CNH será bloqueada).", "info");
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRole === "student"
                ? "bg-white text-[#012169] shadow-xs"
                : "bg-white/10 text-white/80 hover:text-white"
            }`}
          >
            Aluno (RG Obrigatório)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole("promoter");
              addLog("Perfil alterado para: PROMOTOR (RG e CNH aceitos; CNH PDF exige formato oficial CDT).", "info");
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRole === "promoter"
                ? "bg-white text-[#012169] shadow-xs"
                : "bg-white/10 text-white/80 hover:text-white"
            }`}
          >
            Promotor (RG ou CNH)
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setDocStatus("empty");
            setLastRejection(null);
            addLog("Estado resetado para vazio.", "info");
          }}
          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-semibold transition cursor-pointer"
        >
          Limpar Estado
        </button>
      </div>

      {/* Card da Aplicação Real com o Gatilho */}
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-blue block">
              {selectedRole === "student" ? "Matrícula do Aluno" : "Cadastro de Promotor"}
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Etapa: Documento Oficial
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="size-4 text-brand-blue" />
            <span>Validação IA</span>
          </div>
        </div>

        {/* Componente Centralizado com Captação e IA */}
        <IdentityDocumentCaptureFlow
          role={selectedRole}
          status={docStatus}
          rejectionReason={lastRejection}
          onStatusChange={(newStatus, reason) => {
            setDocStatus(newStatus);
            setLastRejection(reason || null);
            if (newStatus === "rejected") {
              addLog(`IA REJEITOU: ${reason}`, "error");
            } else if (newStatus === "analyzing") {
              addLog("IA APROVOU pré-checagem. Documento enviado e em análise no backend.", "success");
            }
          }}
          onSubmitToBackend={async (files) => {
            addLog(
              `Enviando ao backend: ${
                files.full
                  ? `Documento completo (${files.full.name})`
                  : `Frente (${files.front?.name}) + Verso (${files.back?.name})`
              }`,
              "info"
            );
            await new Promise((r) => setTimeout(r, 600));
          }}
        />
      </div>

      {/* Terminal de Diagnóstico da IA em Tempo Real */}
      <div className="w-full max-w-xl mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-xs shadow-xl space-y-2">
        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
            <Terminal className="size-3.5 text-brand-blue" />
            <span>Log da IA (groq/qwen/qwen3.6-27b)</span>
          </div>
          <span className="text-[10px] text-slate-400">ai.v7m.live</span>
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
          {aiLogs.map((log, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 leading-relaxed ${
                log.type === "error"
                  ? "text-red-400 font-semibold"
                  : log.type === "success"
                  ? "text-emerald-400 font-semibold"
                  : "text-slate-300"
              }`}
            >
              <span className="text-slate-400 text-[10px] shrink-0">[{log.time}]</span>
              <span>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
