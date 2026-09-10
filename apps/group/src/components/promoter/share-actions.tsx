"use client";

import { useState } from "react";
import { Copy, Check, Share2, MessageSquare, ExternalLink } from "lucide-react";
import { QRCodeDialog } from "@/components/promoter/qr-code-dialog";

interface TemplateOption {
  id: string;
  label: string;
  generateText: (url: string) => string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "amigos",
    label: "Amigos & Família",
    generateText: (url) =>
      `Oi! Lembrei de você: o Maestri.group está com inscrições abertas para quem quer concluir os estudos ou se qualificar rápido. Dá uma olhada e faça sua matrícula por este link: ${url}`,
  },
  {
    id: "bolsa",
    label: "Bolsa & Oportunidade",
    generateText: (url) =>
      `Consegui uma oportunidade incrível para quem quer terminar os estudos com bolsa e flexibilidade. Veja como funciona por aqui: ${url}`,
  },
  {
    id: "direto",
    label: "Direto ao Ponto",
    generateText: (url) =>
      `Se você precisa concluir o Ensino Médio ou Fundamental com rapidez e validade oficial, matricule-se pelo meu link do Maestri.group: ${url}`,
  },
];

export function ShareActions({
  refUrl,
}: {
  refUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("amigos");
  const [showTemplates, setShowTemplates] = useState(false);

  const currentTemplate =
    TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0];
  const shareMessage = currentTemplate.generateText(refUrl);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(refUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Maestri.group · Inscrições e Bolsas",
          text: shareMessage,
          url: refUrl,
        });
      } catch {
        // Ignored
      }
    } else {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-3">
      {/* Campo de link com botão de cópia */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center bg-slate-900/40 rounded-xl border border-white/10 px-3.5 py-2.5 backdrop-blur-md">
          <code className="text-xs text-white/90 truncate select-all font-mono">
            {refUrl}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${
            copied
              ? "bg-emerald-500 text-white"
              : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
          }`}
          aria-label={copied ? "Link copiado" : "Copiar link de indicação"}
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-white" aria-hidden="true" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Seletor de Modelo de Mensagem WhatsApp */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-amber-300 hover:text-amber-200 transition cursor-pointer"
          aria-expanded={showTemplates}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            <span>Modelo da mensagem: <strong>{currentTemplate.label}</strong></span>
          </span>
          <span className="text-[11px] text-slate-300 underline underline-offset-2">
            {showTemplates ? "recolher" : "trocar modelo"}
          </span>
        </button>

        {showTemplates && (
          <div className="grid grid-cols-3 gap-1.5 pt-1 animate-in fade-in duration-150">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(t.id);
                  setShowTemplates(false);
                }}
                className={`rounded-xl border px-2.5 py-2 text-xs font-medium transition-all cursor-pointer text-center truncate ${
                  selectedTemplateId === t.id
                    ? "border-amber-400/60 bg-amber-400/20 text-white font-bold shadow-xs"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botões de Ação de Growth Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] px-4 py-2.5 text-xs font-black text-slate-950 transition-all shadow-md active:scale-[0.98]"
        >
          <span className="text-base leading-none" aria-hidden="true">💬</span>
          <span>Enviar no WhatsApp</span>
          <ExternalLink className="size-3 opacity-60 ml-auto" />
        </a>

        <div className="flex gap-2">
          <div className="shrink-0">
            <QRCodeDialog url={refUrl} label="QR Code" />
          </div>

          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white transition-all active:scale-[0.98] cursor-pointer"
            aria-label="Mais opções de compartilhamento"
          >
            <Share2 className="size-3.5" aria-hidden="true" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
