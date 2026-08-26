"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, Copy, Check } from "lucide-react";
import { Button } from "./button";

export function QRCodeDialog({
  url,
  label = "Seu QR Code de Captação",
}: {
  url: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={() => setOpen(true)}
        className="text-xs gap-1.5 border border-[var(--surface-border)]"
        aria-label="Abrir QR Code de indicação"
      >
        <QrCode size={15} aria-hidden="true" />
        <span>Ver QR Code</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="relative w-full max-w-xs rounded-2xl border border-brand-gold/40 bg-[var(--bg)] p-6 shadow-2xl space-y-4 text-center">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 rounded-full p-1.5 text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="space-y-1 pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-gold-ink dark:text-brand-gold-light">
                Indicação Presencial
              </p>
              <h3 className="font-display text-lg text-[var(--surface-text)]">
                {label}
              </h3>
              <p className="text-xs text-[var(--surface-text-muted)]">
                Mostre este código para quem quiser se matricular pelo seu link.
              </p>
            </div>

            {/* Frame do QR Code */}
            <div className="mx-auto flex w-fit items-center justify-center rounded-xl bg-white p-4 shadow-inner">
              <QRCodeSVG
                value={url}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="bg-[var(--surface)] rounded-lg p-2 text-xs font-mono text-[var(--surface-text-muted)] truncate select-all">
                {url}
              </div>
              <Button
                type="button"
                size="md"
                variant={copied ? "primary" : "ghost"}
                onClick={handleCopy}
                className="w-full text-xs gap-1.5"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-brand-ok" aria-hidden="true" />
                    <span>Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden="true" />
                    <span>Copiar link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
