"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "./button";
import { ErrorBox } from "./error-box";

interface CameraCaptureProps {
  /** Foto já capturada (preview + permite refazer). */
  file: File | null;
  /** Recebe a foto tirada (File jpeg) ou null ao refazer. */
  onCapture: (file: File | null) => void;
}

/**
 * Captura por CÂMERA (getUserMedia) — tira a foto na hora, não aceita upload.
 * Câmera frontal, com espelho natural. Exige contexto seguro (HTTPS) — em
 * produção o app roda em https, então funciona; só o acesso precisa ser
 * autorizado pelo usuário.
 */
export function CameraCapture({ file, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Geração da tentativa atual: uma chamada cancelada (cleanup/StrictMode) não
  // deve sobrescrever o estado de uma tentativa mais nova já em curso.
  const genRef = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    genRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    const gen = (genRef.current += 1);
    setError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (gen !== genRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch {
      if (gen !== genRef.current) return;
      setError(
        "Não foi possível abrir a câmera. Autorize o acesso à câmera no navegador e tente de novo.",
      );
    }
  }, []);

  // Liga a câmera quando não há foto; desliga ao capturar/desmontar.
  useEffect(() => {
    if (file) {
      stop();
      return;
    }
    start();
    return () => stop();
  }, [file, start, stop]);

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

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Espelha (câmera frontal) para a foto sair como a pessoa se vê.
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `captura-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  if (file && preview) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-2xl border-2 border-brand-green/60">
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
          Tirar outra
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-brand-border bg-brand-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />

        {/* Contorno de enquadramento do rosto — só aparece com a câmera ligada. */}
        {ready ? (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-[46%] h-[80%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] border-white/85 shadow-[0_0_0_2000px_rgba(11,27,59,0.40)]" />
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-[13px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
              Centralize o rosto no contorno
            </p>
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
        <ErrorBox message={error} />
      ) : (
        <p className="text-center text-[13px] leading-relaxed text-brand-muted">
          Boa luz no rosto, sem boné nem óculos escuros 🙂
        </p>
      )}

      <Button onClick={takePhoto} disabled={!ready}>
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
