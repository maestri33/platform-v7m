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
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs gap-1.5"
        aria-label="Abrir QR Code de indicação"
      >
        <QrCode size={14} aria-hidden="true" />
        <span>Ver QR Code</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="relative w-full max-w-xs rounded-2xl border border-brand-border bg-white p-6 shadow-2xl space-y-4 text-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 rounded-full p-1.5 text-brand-muted hover:text-brand-ink hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-gold">
                Indicação Presencial
              </p>
              <h3 className="text-base font-bold text-brand-ink">
                {label}
              </h3>
              <p className="text-xs text-brand-muted">
                Mostre este código para quem quiser se matricular pelo seu link.
              </p>
            </div>

            <div className="mx-auto flex w-fit items-center justify-center rounded-xl bg-slate-50 border border-brand-border p-4">
              <QRCodeSVG
                value={url}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="bg-slate-50 border border-brand-border rounded-lg p-2 text-xs font-mono text-brand-muted truncate select-all">
                {url}
              </div>
              <Button
                type="button"
                variant={copied ? "default" : "outline"}
                onClick={handleCopy}
                className="w-full text-xs gap-1.5"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-brand-green" aria-hidden="true" />
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
