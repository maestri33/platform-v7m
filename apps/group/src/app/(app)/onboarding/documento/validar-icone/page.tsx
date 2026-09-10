"use client";

import * as React from "react";
import Link from "next/link";
import {
  IdentityDocTriggerIcon,
  type IdentityDocStatus,
  PageShell,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from "@v7m/ui";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function ValidarIconeDocumentoPage() {
  const [activeStatus, setActiveStatus] = React.useState<IdentityDocStatus>("ok");
  const [activeSize, setActiveSize] = React.useState<"sm" | "md" | "lg" | "xl">("lg");
  const [clickedMessage, setClickedMessage] = React.useState<string | null>(null);

  const handleTriggerClick = (status: IdentityDocStatus) => {
    setClickedMessage(`Disparada chamada da captação do documento com status: "${status}"!`);
    setTimeout(() => setClickedMessage(null), 4000);
  };

  return (
    <PageShell
      title="Validação do Ícone de Chamada de Documento"
      description="Componente centralizado em @v7m/ui com sombreamento dinâmico por status."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Sparkles className="size-3.5 text-brand-blue" />
          <span>Centralização UI</span>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/onboarding/documento"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="size-3.5" />
            <span>Voltar para tela de Documento</span>
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
          >
            <span>Ir para lista de etapas (KYC)</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {/* Notificação de clique */}
        {clickedMessage && (
          <div className="p-3.5 rounded-xl bg-brand-blue/20 border border-brand-blue/40 text-sm font-medium text-brand-blue flex items-center justify-between animate-fadeIn">
            <span>{clickedMessage}</span>
            <button
              onClick={() => setClickedMessage(null)}
              className="text-xs font-bold uppercase tracking-wider hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* 1. SEÇÃO PRINCIPAL: OS 3 ESTADOS LADO A LADO COM OS SOMBREAMENTOS ESPECIFICADOS */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Especificação dos 3 Sombreamentos</span>
            </h2>
            <p className="text-sm text-slate-400">
              Cada status projeta seu respectivo glow/sombreamento colorido para indicar o estado da captação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ESTADO 1: TUDO OK -> SOMBREAMENTO VERDE */}
            <Card className="border-emerald-500/30 bg-slate-950/80 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Tudo OK
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    Glow Verde
                  </span>
                </div>
                <CardTitle className="text-base text-white">Documento Aprovado</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  RG/CNH conferido com sucesso. Liberação ativa.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-6 flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 flex items-center justify-center">
                  <IdentityDocTriggerIcon
                    status="ok"
                    size="lg"
                    onClick={() => handleTriggerClick("ok")}
                  />
                </div>
                <p className="text-xs text-emerald-400 font-semibold text-center">
                  Sombreamento Verde Ativo
                </p>
              </CardContent>
            </Card>

            {/* ESTADO 2: EM ANÁLISE -> SOMBREAMENTO AMARELO */}
            <Card className="border-amber-500/30 bg-slate-950/80 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Clock className="size-3.5" /> Em Análise
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    Glow Amarelo
                  </span>
                </div>
                <CardTitle className="text-base text-white">Leitura IA / OCR</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Validação automatizada de nitidez e tipagem em andamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-6 flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 flex items-center justify-center">
                  <IdentityDocTriggerIcon
                    status="analyzing"
                    size="lg"
                    pulse
                    onClick={() => handleTriggerClick("analyzing")}
                  />
                </div>
                <p className="text-xs text-amber-300 font-semibold text-center">
                  Sombreamento Amarelo Ativo (Pulso)
                </p>
              </CardContent>
            </Card>

            {/* ESTADO 3: VAZIO OU REJEITADO -> SOMBREAMENTO VERMELHO */}
            <Card className="border-red-500/30 bg-slate-950/80 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                    <AlertCircle className="size-3.5" /> Vazio / Rejeitado
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/30">
                    Glow Vermelho
                  </span>
                </div>
                <CardTitle className="text-base text-white">Ação Necessária</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Documento não enviado ou ilegível. Clique para abrir.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-6 flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 flex items-center justify-center">
                  <IdentityDocTriggerIcon
                    status="empty"
                    size="lg"
                    pulse
                    onClick={() => handleTriggerClick("empty")}
                  />
                </div>
                <p className="text-xs text-red-400 font-semibold text-center">
                  Sombreamento Vermelho Ativo
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 2. CARD INTERATIVO DE CHAMADA / BANNER INTEGRADO */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Variante em Card / Barra de Chamada (Gatilho Completo)
            </h2>
            <p className="text-sm text-slate-400">
              Ideal para ser posicionado na lista de etapas ou no topo do fluxo.
            </p>
          </div>

          <div className="space-y-3">
            <IdentityDocTriggerIcon
              variant="card"
              status="ok"
              label="Documento Oficial (RG / CNH) — Verificado"
              sublabel="Identidade comprovada e vinculada à sua conta com sucesso."
              onClick={() => handleTriggerClick("ok")}
            />

            <IdentityDocTriggerIcon
              variant="card"
              status="analyzing"
              label="Documento Oficial (RG / CNH) — Em Análise"
              sublabel="Aguardando conferência da IA do backend (OCR e face match)."
              onClick={() => handleTriggerClick("analyzing")}
            />

            <IdentityDocTriggerIcon
              variant="card"
              status="empty"
              label="Documento Oficial (RG / CNH) — Pendente"
              sublabel="Clique aqui para abrir a câmera ou enviar foto frente e verso do RG."
              onClick={() => handleTriggerClick("empty")}
            />
          </div>
        </div>

        {/* 3. CONTROLES DE EXPERIMENTAÇÃO DINÂMICA */}
        <Card className="border-slate-800 bg-slate-950/90 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Laboratório Interativo de Tamanhos e Status</CardTitle>
            <CardDescription className="text-slate-400">
              Alterne os seletores abaixo para testar as transições dinâmicas de sombreamento e tamanhos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              {/* Seletor de Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status Atual:
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={activeStatus === "ok" ? "primary" : "outline"}
                    onClick={() => setActiveStatus("ok")}
                    className={activeStatus === "ok" ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-400" : ""}
                  >
                    Tudo OK (Verde)
                  </Button>
                  <Button
                    size="sm"
                    variant={activeStatus === "analyzing" ? "primary" : "outline"}
                    onClick={() => setActiveStatus("analyzing")}
                    className={activeStatus === "analyzing" ? "bg-amber-600 hover:bg-amber-500 border-amber-400" : ""}
                  >
                    Em Análise (Amarelo)
                  </Button>
                  <Button
                    size="sm"
                    variant={activeStatus === "empty" ? "primary" : "outline"}
                    onClick={() => setActiveStatus("empty")}
                    className={activeStatus === "empty" ? "bg-red-600 hover:bg-red-500 border-red-400" : ""}
                  >
                    Vazio / Rejeitado (Vermelho)
                  </Button>
                </div>
              </div>

              {/* Seletor de Tamanho */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tamanho:
                </label>
                <div className="flex items-center gap-1.5">
                  {(["sm", "md", "lg", "xl"] as const).map((sz) => (
                    <Button
                      key={sz}
                      size="sm"
                      variant={activeSize === sz ? "primary" : "outline"}
                      onClick={() => setActiveSize(sz)}
                      className="uppercase text-xs"
                    >
                      {sz}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visualização Central em Destaque */}
            <div className="py-12 px-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col items-center justify-center gap-4 text-center">
              <IdentityDocTriggerIcon
                status={activeStatus}
                size={activeSize}
                pulse
                onClick={() => handleTriggerClick(activeStatus)}
              />

              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {activeStatus === "ok"
                    ? "Status: Verificado com Sombreamento Verde"
                    : activeStatus === "analyzing"
                    ? "Status: Em Análise com Sombreamento Amarelo"
                    : "Status: Vazio/Rejeitado com Sombreamento Vermelho"}
                </p>
                <p className="text-xs text-slate-400">
                  Tamanho selecionado: <span className="font-mono text-white uppercase">{activeSize}</span> • Clique para simular a chamada da ação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
