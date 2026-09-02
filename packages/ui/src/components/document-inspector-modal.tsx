"use client";

import * as React from "react";
import {
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconMaximize,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconShieldCheck,
  IconCalendar,
  IconSparkles,
  IconAward,
  IconUsers,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { DocumentItem } from "./duty-status-card";
import { DutyMiniPill } from "./duty-mini-pill";

export interface DocumentInspectorModalProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Modal close callback */
  onClose: () => void;
  /** Target document item to inspect */
  item: DocumentItem | null;
  /** Optional custom title override */
  title?: string;
  /** Optional additional metadata */
  metadata?: Record<string, string | number | null | undefined>;
  /** Custom wrapper CSS classes */
  className?: string;
}

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

export function DocumentInspectorModal({
  isOpen,
  onClose,
  item,
  title,
  metadata,
  className = "",
}: DocumentInspectorModalProps) {
  const [zoomIndex, setZoomIndex] = React.useState(2); // 1.0x default
  const [rotation, setRotation] = React.useState(0); // 0, 90, 180, 270
  const [showMetadataPanel, setShowMetadataPanel] = React.useState(true);

  // Reset zoom & rotation when item changes
  React.useEffect(() => {
    if (isOpen) {
      setZoomIndex(2);
      setRotation(0);
    }
  }, [isOpen, item?.id]);

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoomIndex((prev) => Math.min(ZOOM_STEPS.length - 1, prev + 1));
      } else if (e.key === "-") {
        setZoomIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "0") {
        setZoomIndex(2);
        setRotation(0);
      } else if (e.key.toLowerCase() === "r" || e.key.toLowerCase() === "g") {
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const currentZoom = ZOOM_STEPS[zoomIndex];
  const isPdf = item.mimeType === "application/pdf" || item.fileUrl?.endsWith(".pdf");
  const modalTitle = title || item.title || "Inspeção de Documento";

  const handleZoomIn = () => setZoomIndex((prev) => Math.min(ZOOM_STEPS.length - 1, prev + 1));
  const handleZoomOut = () => setZoomIndex((prev) => Math.max(0, prev - 1));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetView = () => {
    setZoomIndex(2);
    setRotation(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-inspector-title"
    >
      <div
        className={`relative w-full max-w-5xl h-[92vh] rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col overflow-hidden ${className}`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-blue/20 text-brand-blue-bright border border-brand-blue/30">
              <IconFileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="document-inspector-title" className="text-sm font-black text-white">
                  {modalTitle}
                </h3>
                <DutyMiniPill status={item.status} size="sm" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                {item.fileName || "documento-digital"} • {item.mimeType || "application/octet-stream"}
              </p>
            </div>
          </div>

          {/* Quick controls & close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMetadataPanel((prev) => !prev)}
              title="Alternar Painel de Metadados"
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer hidden sm:flex items-center gap-1.5 ${
                showMetadataPanel
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-transparent border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <IconInfoCircle className="size-4" />
              <span>Dados</span>
            </button>

            {item.fileUrl && (
              <a
                href={item.fileUrl}
                download={item.fileName || "documento"}
                target="_blank"
                rel="noopener noreferrer"
                title="Baixar Arquivo"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition cursor-pointer"
              >
                <IconDownload className="size-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Fechar (Esc)"
              aria-label="Fechar Modal"
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 text-slate-400 transition cursor-pointer"
            >
              <IconX className="size-5" />
            </button>
          </div>
        </div>

        {/* Center Viewport & Inspector Layout */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
          {/* Main Document Viewer Canvas */}
          <div className="flex-1 relative bg-slate-950 flex flex-col overflow-hidden">
            {/* Interactive Floating Toolbar (Zoom, Rotate, Reset) */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-xl">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomIndex === 0}
                title="Diminuir Zoom (-)"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <IconZoomOut className="size-4" />
              </button>

              <span className="text-xs font-mono font-bold text-slate-200 px-2 min-w-12 text-center select-none">
                {Math.round(currentZoom * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                title="Aumentar Zoom (+)"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <IconZoomIn className="size-4" />
              </button>

              <div className="w-px h-4 bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={handleRotate}
                title="Girar 90° no sentido horário (G ou R)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <IconRotate className="size-3.5" />
                <span className="hidden sm:inline">90°</span>
              </button>

              <button
                type="button"
                onClick={handleResetView}
                title="Restaurar visualização original (0)"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <IconMaximize className="size-3.5" />
              </button>
            </div>

            {/* Document Render Container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              {isPdf ? (
                <div
                  className="w-full h-full min-h-[450px] transition-transform duration-200"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${currentZoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  <iframe
                    src={item.fileUrl || ""}
                    className="w-full h-full min-h-[450px] rounded-xl border-0 bg-white"
                    title={modalTitle}
                  />
                </div>
              ) : item.fileUrl ? (
                <div
                  className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${currentZoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.fileUrl}
                    alt={item.title}
                    className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl"
                  />
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-2 py-12">
                  <IconFileText className="size-12 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">Documento validado digitalmente.</p>
                  <p className="text-xs text-slate-500">
                    O registro comprobatório está autenticado no banco de dados.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Metadata / OCR Inspection Panel */}
          {showMetadataPanel && (
            <div className="w-full sm:w-80 border-t sm:border-t-0 sm:border-l border-slate-800 bg-slate-900/95 p-4 sm:p-5 overflow-y-auto space-y-4 shrink-0 text-xs">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Dossiê de Validação
                </h4>
                <p className="text-[11px] text-slate-500">
                  Informações extraídas e auditoria do arquivo
                </p>
              </div>

              {/* Status card */}
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Status Atual
                  </span>
                  <DutyMiniPill status={item.status} size="sm" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-xs">{item.title}</p>
                  <p className="text-[11px] text-slate-400 leading-snug">{item.description}</p>
                </div>
              </div>

              {/* Extracted OCR Information */}
              {item.extractedInfo && (
                <div className="rounded-2xl bg-brand-blue/10 border border-brand-blue/30 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-blue-bright font-bold text-[11px]">
                    <IconSparkles className="size-3.5" />
                    <span>Dados Extraídos (OCR)</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                    {item.extractedInfo}
                  </p>
                </div>
              )}

              {/* Kinship details */}
              {item.kinshipHolder && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <IconUsers className="size-3.5" />
                    <span>Titular do Comprovante</span>
                  </div>
                  <p className="text-xs text-slate-200 font-semibold">{item.kinshipHolder}</p>
                  {item.kinshipRelation && (
                    <p className="text-[11px] text-slate-400">Vínculo: {item.kinshipRelation}</p>
                  )}
                </div>
              )}

              {/* Digital signature details */}
              {item.signature && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <IconAward className="size-3.5" />
                    <span>Assinatura Digital</span>
                  </div>
                  <div className="space-y-0.5 text-[11px] font-mono text-slate-300">
                    <p className="truncate">Selo: {item.signature.signatureHash}</p>
                    <p>Data: {new Date(item.signature.signedAt).toLocaleString("pt-BR")}</p>
                    <p className="text-slate-400">Versão: {item.signature.contractVersion}</p>
                  </div>
                </div>
              )}

              {/* Biometrics score */}
              {typeof item.biometricScore === "number" && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <IconShieldCheck className="size-3.5" />
                    <span>Score Biométrico ArcFace</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-white">
                    {item.biometricScore.toFixed(3)} (
                    {Math.round(item.biometricScore * 100)}% correspondência)
                  </p>
                </div>
              )}

              {/* Additional custom metadata */}
              {metadata && Object.keys(metadata).length > 0 && (
                <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Metadados do Arquivo
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    {Object.entries(metadata).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-slate-400 capitalize">{key}:</span>
                        <span className="text-slate-200 font-semibold truncate">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom links */}
              <div className="pt-2 flex flex-col gap-2">
                {item.fileUrl && (
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 text-xs font-bold transition"
                  >
                    <span>Abrir em Nova Aba</span>
                    <IconExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
