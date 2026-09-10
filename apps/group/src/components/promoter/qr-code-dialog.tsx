"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, Copy, Check } from "lucide-react";
import { Button } from "@v7m/ui";

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
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-brand-border bg-white p-6 shadow-xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-slate-100 transition"
              aria-label="Fechar modal"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-brand-ink">{label}</h2>
              <p className="text-xs text-brand-muted">
                Aponte a câmera do celular do candidato para abrir o formulário com sua indicação
              </p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-xl border border-brand-border/60 shadow-inner">
              <QRCodeSVG
                value={url}
                size={200}
                level="M"
                includeMargin
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 28,
                  width: 28,
                  excavate: true,
                }}
              />
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-brand-border text-left">
              <p className="text-xs text-brand-muted font-mono truncate flex-1 select-all">
                {url}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-md text-brand-blue hover:bg-brand-blue/10 transition"
                title="Copiar link"
                aria-label="Copiar link"
              >
                {copied ? <Check size={14} className="text-brand-green-dark" /> : <Copy size={14} />}
              </button>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Pronto
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
