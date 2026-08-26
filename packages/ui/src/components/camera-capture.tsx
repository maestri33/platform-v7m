"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "./button";
import { ErrorBox } from "./error-box";

interface CameraCaptureProps {
  /** Foto já capturada (preview + permite refazer). */
  file: File | null;
  /** Recebe a foto tirada (File jpeg) ou null ao refazer. */
  onCapture: (file: File | null) => void;
  /** Tipo de guia ("face" para selfie ou "document" para documento). */
  guideMode?: "face" | "document";
}

const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
};

/**
 * Captura por CÂMERA in-app (via react-webcam) com enquadramento inteligente e fallback para upload.
 */
export function CameraCapture({ file, onCapture, guideMode = "face" }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Preview da foto capturada.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const capturePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const capturedFile = new File([blob], `captura-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCapture(capturedFile);
      })
      .catch(() => {
        setError("Não foi possível processar a imagem capturada.");
      });
  }, [onCapture]);

  const handleUserMediaError = useCallback(() => {
    setError(
      "Não foi possível abrir a câmera. Você pode autorizar o acesso nas configurações do navegador ou selecionar uma foto da galeria.",
    );
  }, []);

  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onCapture(selected);
    }
  };

  const toggleFacingMode = () => {
    setReady(false);
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (file && preview) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-2xl border-2 border-brand-green/60 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto capturada" className="aspect-square w-full object-cover" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-brand-green-dark/90 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            Foto pronta
          </span>
        </div>
        <Button variant="secondary" onClick={() => onCapture(null)}>
          Tirar outra foto
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-brand-border bg-brand-ink">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.85}
          videoConstraints={{
            ...videoConstraints,
            facingMode,
          }}
          mirrored={facingMode === "user"}
          onUserMedia={() => setReady(true)}
          onUserMediaError={handleUserMediaError}
          className="h-full w-full object-cover"
        />

        {/* Guia visual de enquadramento */}
        {ready ? (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {guideMode === "face" ? (
                <div className="absolute left-1/2 top-[46%] h-[80%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] border-white/85 shadow-[0_0_0_2000px_rgba(11,27,59,0.40)]" />
              ) : (
                <div className="absolute left-1/2 top-1/2 h-[72%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[3px] border-dashed border-white/85 shadow-[0_0_0_2000px_rgba(11,27,59,0.40)]" />
              )}
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-[13px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {guideMode === "face" ? "Centralize o rosto no contorno" : "Enquadre o documento inteiro"}
            </p>

            {/* Botão de alternar câmera frontal / traseira */}
            <button
              type="button"
              onClick={toggleFacingMode}
              aria-label="Alternar câmera"
              className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 active:scale-95"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </>
        ) : null}

        {!ready && !error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/85">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
            <span className="text-sm font-semibold">Abrindo a câmera…</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex flex-col gap-2">
          <ErrorBox message={error} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFallbackFileChange}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Selecionar foto da galeria
          </Button>
        </div>
      ) : (
        <p className="text-center text-[13px] leading-relaxed text-brand-muted">
          {guideMode === "face"
            ? "Boa luz no rosto, sem boné nem óculos escuros 🙂"
            : "Evite reflexos de luz e mantenha os 4 cantos visíveis."}
        </p>
      )}

      <Button onClick={capturePhoto} disabled={!ready}>
        <span className="inline-flex items-center justify-center gap-2">
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.5 4l1.4 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.1l1.4-2z" />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
          Tirar foto
        </span>
      </Button>
    </div>
  );
}
