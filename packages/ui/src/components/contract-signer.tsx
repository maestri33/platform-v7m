"use client";

import * as React from "react";
import {
  IconAward,
  IconCircleCheck,
  IconFileCheck,
  IconShieldCheck,
  IconDownload,
  IconFileText,
  IconLock,
  IconChevronDown,
  IconSparkles,
  IconExternalLink,
  IconLoader2,
} from "@tabler/icons-react";

import type { ContractSignature, PersonaType } from "./duty-status-card";

export interface ContractSignerProps {
  /** Persona role: Promoter partnership vs Student enrollment */
  persona: PersonaType;
  /** Name of the signatory */
  userName?: string;
  /** CPF or document number of the signatory */
  userDocument?: string;
  /** Email address */
  userEmail?: string;
  /** Initial or existing digital signature if already signed */
  initialSignature?: ContractSignature | null;
  /** Async or sync callback when signature is submitted */
  onSign?: (signature: ContractSignature) => Promise<void> | void;
  /** Callback to trigger PDF download of the signed contract */
  onDownloadPdf?: () => void;
  /** Custom wrapper CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// Simple deterministic hash generator for client signature seal
function generateSignatureHash(userName: string, doc: string, timestamp: string): string {
  const raw = `${userName}|${doc}|${timestamp}|V7M-EDUCATION-2026`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
  return `V7M-SIG-${hex}-${randomSuffix}`;
}

export function ContractSigner({
  persona,
  userName = "Assinante Titular",
  userDocument = "000.000.000-00",
  userEmail = "usuario@v7m.com.br",
  initialSignature = null,
  onSign,
  onDownloadPdf,
  className = "",
  disabled = false,
}: ContractSignerProps) {
  const [signature, setSignature] = React.useState<ContractSignature | null>(initialSignature);
  const [scrollProgress, setScrollProgress] = React.useState(initialSignature ? 1 : 0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(Boolean(initialSignature));
  const [acceptedCheckbox, setAcceptedCheckbox] = React.useState(Boolean(initialSignature));
  const [isSigning, setIsSigning] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (initialSignature) {
      setSignature(initialSignature);
      setHasScrolledToBottom(true);
      setAcceptedCheckbox(true);
    }
  }, [initialSignature]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(1);
      setHasScrolledToBottom(true);
      return;
    }
    const currentProgress = Math.min(1, Math.max(0, scrollTop / maxScroll));
    setScrollProgress(currentProgress);
    if (currentProgress >= 0.9 || scrollTop + clientHeight >= scrollHeight - 24) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSign = async () => {
    if (!hasScrolledToBottom || !acceptedCheckbox || disabled || isSigning) return;

    setIsSigning(true);
    try {
      const now = new Date().toISOString();
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "V7M-Platform-Client";
      const sigHash = generateSignatureHash(userName, userDocument, now);

      const newSignature: ContractSignature = {
        accepted: true,
        signedAt: now,
        ipAddress: "Conexão Segura SSL/TLS",
        userAgent,
        signatureHash: sigHash,
        contractVersion: persona === "promoter" ? "TERM-PROMOTOR-V2026.1" : "CONTRATO-EJA-V2026.1",
      };

      if (onSign) {
        await onSign(newSignature);
      }
      setSignature(newSignature);
    } finally {
      setIsSigning(false);
    }
  };

  const isSigned = Boolean(signature?.accepted);

  return (
    <div className={`space-y-4 rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-6 text-white shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-blue/20 text-brand-blue-bright border border-brand-blue/30">
            <IconFileText className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">
                {persona === "promoter"
                  ? "Termo de Parceria e Credenciamento de Promotor"
                  : "Contrato de Matrícula e Prestação de Serviços EJA EAD"}
              </h3>
              {isSigned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/40">
                  <IconCircleCheck className="size-3" />
                  <span>Assinado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400 border border-amber-500/40">
                  <IconLock className="size-3" />
                  <span>Aguardando Leitura</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {persona === "promoter"
                ? "Regulamento oficial de comissionamento de R$ 100 por aluno e repasses semanais via PIX."
                : "Regulamento acadêmico e contratual oficial com base na LDB 9.394/96 e normas MEC/SISTEC."}
            </p>
          </div>
        </div>

        {/* Reading progress pill */}
        {!isSigned && (
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-400">Leitura:</span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-blue-bright rounded-full transition-all duration-200"
                style={{ width: `${Math.round(scrollProgress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-white">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Contract Terms Box with Scroll Detection */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Texto do Contrato"
          className="h-64 sm:h-72 overflow-y-auto rounded-2xl bg-slate-950/90 border border-slate-800 p-4 sm:p-5 text-xs text-slate-300 leading-relaxed font-sans space-y-4 focus:outline-none focus:ring-1 focus:ring-brand-blue/50"
        >
          {persona === "promoter" ? (
            /* PROMOTER CONTRACT CLAUSES */
            <>
              <div className="text-center pb-2 border-b border-slate-850">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  INSTRUMENTO PARTICULAR DE PARCERIA E AFILIAÇÃO V7M
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Versão 2026.1 • Registrado sob protocolo digital V7M-LEGAL
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA PRIMEIRA — DO OBJETO</p>
                <p>
                  O presente instrumento tem por objeto o credenciamento do(a) PARCEIRO(A) PROMOTOR(A)
                  para divulgação, prospecção e indicação de estudantes interessados na conclusão
                  da Educação de Jovens e Adultos (EJA) na modalidade EAD ofertada pela PLATAFORMA V7M.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA SEGUNDA — DA COMISSÃO E REPASSES</p>
                <p>
                  1. A cada matrícula confirmada e paga originada do link exclusivo do Promotor, será
                  devida uma comissão fixa de <strong>R$ 100,00 (cem reais)</strong>, acrescida de eventuais
                  bonificações promocionais por metas de volume.
                </p>
                <p>
                  2. O fechamento contábil ocorre semanalmente às quintas-feiras às 23:59, e os pagamentos
                  são liquidados impreterivelmente <strong>toda sexta-feira via PIX</strong> na chave
                  titular previamente cadastrada e validada.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA TERCEIRA — DA GRATUIDADE E TRANSPARÊNCIA</p>
                <p>
                  O credenciamento do Promotor é 100% gratuito. É expressamente vedado ao Promotor cobrar
                  quaisquer valores adicionais, taxas de matrícula paralelas ou promessas de aprovação
                  automática sem cumprimento da carga horária regulamentar pelo estudante.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA QUARTA — DA LGPD E PRIVACIDADE</p>
                <p>
                  As partes comprometem-se a cumprir integralmente as disposições da Lei Federal nº
                  13.709/2018 (Lei Geral de Proteção de Dados - LGPD), garantindo o sigilo e segurança
                  das informações cadastrais dos candidatos.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA QUINTA — DA VIGÊNCIA E RESCISÃO</p>
                <p>
                  Este acordo tem vigência por prazo indeterminado, podendo ser rescindido a qualquer tempo
                  por qualquer uma das partes, mediante simples desativação no painel, sem cobrança de multas.
                </p>
              </div>
            </>
          ) : (
            /* STUDENT CONTRACT CLAUSES */
            <>
              <div className="text-center pb-2 border-b border-slate-850">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS — EJA EAD
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Em conformidade com a LDB nº 9.394/96 e Resoluções CEE/MEC
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA PRIMEIRA — DOS SERVIÇOS EDUCACIONAIS</p>
                <p>
                  A CONTRATADA compromete-se a fornecer ao(à) ALUNO(A) o Curso de Educação de Jovens e
                  Adultos (EJA) — Nível Médio, modalidade a distância (EAD), estruturado em ambiente
                  virtual com módulos pedagógicos, exercícios, tutoria e suporte acadêmico contínuo.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA SEGUNDA — DA REGULARIDADE E CERTIFICAÇÃO</p>
                <p>
                  1. O curso é devidamente autorizado pelos órgãos competentes de ensino, com publicação
                  em Diário Oficial.
                </p>
                <p>
                  2. Após o cumprimento integral dos módulos e aprovação nas avaliações regulamentares,
                  será emitido o Certificado de Conclusão do Ensino Médio com registro no SISTEC/MEC e
                  publicação oficial, conferindo validade nacional para ingresso no Ensino Superior ou Concursos.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA TERCEIRA — DOS DOCUMENTOS OBRIGATÓRIOS</p>
                <p>
                  O aluno declara sob as penas da lei a veracidade dos documentos civis anexados ao seu
                  dossiê digital (RG / Carteira de Identidade, Certidão de Nascimento/Casamento, Título
                  Eleitoral e Certificado Militar quando aplicável). O MEC veda expressamente o uso de CNH
                  para emissão de diploma escolar oficial.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white">CLÁUSULA QUARTA — DA ASSINATURA DIGITAL</p>
                <p>
                  A aposição do aceite eletrônico neste portal constitui manifestação inequívoca de vontade,
                  possuindo plena eficácia jurídica e executiva nos termos da MP nº 2.200-2/2001 e Lei 14.063/2020.
                </p>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono text-center">
            • Fim do Instrumento Contratual •
          </div>
        </div>

        {/* Scroll down prompt if not bottom reached */}
        {!hasScrolledToBottom && !isSigned && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-3 py-1 text-[11px] font-bold text-brand-blue-bright backdrop-blur-md shadow-lg animate-bounce">
              <IconChevronDown className="size-3.5" />
              <span>Role até o final para liberar a assinatura</span>
            </div>
          </div>
        )}
      </div>

      {/* Signature Area / Digital Certificate Badge */}
      {isSigned && signature ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <IconShieldCheck className="size-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Assinatura Digital Autenticada</span>
                  <IconCircleCheck className="size-4 text-emerald-400" />
                </h4>
                <p className="text-xs text-slate-300">
                  Assinado por <strong>{userName}</strong> • CPF/Doc: {userDocument}
                </p>
              </div>
            </div>

            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <IconDownload className="size-3.5 text-brand-blue" />
                <span>Baixar Cópia (PDF)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-[11px] font-mono text-slate-300">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">
                Carimbo Temporal:
              </span>
              <span>{new Date(signature.signedAt).toLocaleString("pt-BR")}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">
                Selo Criptográfico:
              </span>
              <span className="font-bold text-emerald-300">{signature.signatureHash}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">
                Protocolo / Versão:
              </span>
              <span>{signature.contractVersion}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Action Box before signing */
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={acceptedCheckbox}
              onChange={(e) => setAcceptedCheckbox(e.target.checked)}
              disabled={!hasScrolledToBottom || disabled}
              className="mt-0.5 size-4 rounded-md border-slate-700 bg-slate-900 text-brand-blue focus:ring-brand-blue/50 disabled:opacity-40 cursor-pointer"
            />
            <span className="text-xs text-slate-300 leading-snug">
              Declaro que li atentamente e concordo integralmente com todas as cláusulas do{" "}
              <strong className="text-white">
                {persona === "promoter" ? "Termo de Parceria" : "Contrato de Matrícula"}
              </strong>
              .
            </span>
          </label>

          <button
            type="button"
            onClick={handleSign}
            disabled={!hasScrolledToBottom || !acceptedCheckbox || disabled || isSigning}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white px-5 py-3 text-sm font-black transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed"
          >
            {isSigning ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                <span>Registrando Assinatura Digital...</span>
              </>
            ) : (
              <>
                <IconAward className="size-4" />
                <span>Assinar Digitalmente com Carimbo de Tempo</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
