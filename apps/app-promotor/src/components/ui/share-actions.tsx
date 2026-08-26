"use client";

import { useState } from "react";
import { Copy, Check, Share2, MessageSquare } from "lucide-react";
import { Button } from "./button";
import { QRCodeDialog } from "./qr-code-dialog";

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
      `Oi! Lembrei de você: a V7M está com inscrições abertas para quem quer concluir os estudos ou se qualificar rápido. Dá uma olhada e faça sua matrícula por este link: ${url}`,
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
      `Se você precisa concluir o Ensino Médio ou Fundamental com rapidez e validade oficial, matricule-se pelo meu link da V7M: ${url}`,
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
          title: "V7M · Inscrições e Bolsas",
          text: shareMessage,
          url: refUrl,
        });
      } catch {
        // Usuário cancelou ou navegador não suportou
      }
    } else {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-3">
      {/* Campo de link com botão de cópia integrado */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center bg-[var(--bg)] rounded-[var(--radius-sm)] border border-[var(--surface-border)] px-3 py-2">
          <code className="text-xs text-[var(--surface-text)] truncate select-all">
            {refUrl}
          </code>
        </div>
        <Button
          type="button"
          size="md"
          variant={copied ? "primary" : "ghost"}
          onClick={handleCopy}
          className="shrink-0 text-xs px-3 min-h-10 min-w-10 gap-1.5"
          aria-label={copied ? "Link copiado" : "Copiar link de indicação"}
        >
          {copied ? (
            <>
              <Check size={15} className="text-brand-ok" aria-hidden="true" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={15} aria-hidden="true" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Seletor de Modelo de Mensagem WhatsApp */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="w-full flex items-center justify-between text-[11px] font-medium text-brand-gold-ink dark:text-brand-gold-light hover:underline cursor-pointer"
          aria-expanded={showTemplates}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare size={13} aria-hidden="true" />
            <span>Modelo da mensagem: <strong>{currentTemplate.label}</strong></span>
          </span>
          <span className="text-[10px] text-[var(--surface-text-muted)]">
            {showTemplates ? "recolher" : "trocar modelo"}
          </span>
        </button>

        {showTemplates && (
          <div className="grid grid-cols-3 gap-1 pt-1 animate-in fade-in duration-150">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(t.id);
                  setShowTemplates(false);
                }}
                className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors cursor-pointer text-center truncate ${
                  selectedTemplateId === t.id
                    ? "border-brand-gold bg-brand-gold/15 text-brand-gold-ink dark:text-brand-gold-light font-bold"
                    : "border-[var(--surface-border)] bg-[var(--surface)] text-[var(--surface-text-muted)] hover:text-[var(--surface-text)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botões de Ação de Growth Rápida */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[#25D366] px-3 py-2 text-xs font-bold text-black transition-opacity hover:opacity-95 active:scale-[0.98]"
        >
          <span className="text-sm font-normal" aria-hidden="true">💬</span>
          <span>Enviar no WhatsApp</span>
        </a>

        <div className="flex gap-2">
          <QRCodeDialog url={refUrl} />

          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-brand-gold/50 bg-brand-gold/10 px-2 py-2 text-xs font-bold text-brand-gold-ink dark:text-brand-gold-light transition-all hover:bg-brand-gold/20 active:scale-[0.98] cursor-pointer"
            aria-label="Mais opções de compartilhamento"
          >
            <Share2 size={15} aria-hidden="true" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
