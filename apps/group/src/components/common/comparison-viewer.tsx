"use client";

import * as React from "react";
import { ZoomIn, Eye, FileText, User } from "lucide-react";
import { Button } from "@v7m/ui";

interface ComparisonViewerProps {
  selfieUrl?: string | null;
  documentUrl?: string | null;
  backDocumentUrl?: string | null;
  selfieLabel?: string;
  documentLabel?: string;
  className?: string;
}

export function ComparisonViewer({
  selfieUrl,
  documentUrl,
  backDocumentUrl,
  selfieLabel = "Selfie de Assinatura",
  documentLabel = "Documento de Identidade",
  className,
}: ComparisonViewerProps) {
  const [zoomImage, setZoomImage] = React.useState<string | null>(null);

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selfie Card */}
        <div className="rounded-xl border border-brand-border bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
              <User className="h-3.5 w-3.5 text-brand-blue" />
              <span>{selfieLabel}</span>
            </div>
            {selfieUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setZoomImage(selfieUrl)}
              >
                <ZoomIn className="h-3 w-3 mr-1" /> Zoom
              </Button>
            )}
          </div>
          <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-brand-bg/60 border border-brand-border flex items-center justify-center">
            {selfieUrl ? (
              <img
                src={selfieUrl}
                alt="Selfie"
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setZoomImage(selfieUrl)}
              />
            ) : (
              <div className="text-center p-4 text-brand-muted text-xs">
                <User className="h-8 w-8 mx-auto mb-1 opacity-40" />
                Nenhuma selfie disponível
              </div>
            )}
          </div>
        </div>

        {/* Document Card */}
        <div className="rounded-xl border border-brand-border bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
              <FileText className="h-3.5 w-3.5 text-brand-blue" />
              <span>{documentLabel}</span>
            </div>
            {documentUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setZoomImage(documentUrl)}
              >
                <ZoomIn className="h-3 w-3 mr-1" /> Zoom
              </Button>
            )}
          </div>
          <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-brand-bg/60 border border-brand-border flex items-center justify-center">
            {documentUrl ? (
              <img
                src={documentUrl}
                alt="Documento"
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setZoomImage(documentUrl)}
              />
            ) : (
              <div className="text-center p-4 text-brand-muted text-xs">
                <FileText className="h-8 w-8 mx-auto mb-1 opacity-40" />
                Nenhum documento disponível
              </div>
            )}
          </div>

          {backDocumentUrl && (
            <div className="pt-2 border-t border-brand-border/40">
              <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
                <span>Verso do Documento</span>
                <button
                  type="button"
                  className="text-brand-blue hover:underline flex items-center gap-1 cursor-pointer text-xs"
                  onClick={() => setZoomImage(backDocumentUrl)}
                >
                  <Eye className="h-3 w-3" /> Ver Verso
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-brand-ink/80 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden">
            <img
              src={zoomImage}
              alt="Ampliação"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-brand-muted pt-2">
              Clique em qualquer lugar para fechar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
