"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

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
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Foto capturada"
          className="aspect-[3/4] w-full rounded-2xl object-cover"
        />
        <Button variant="secondary" onClick={() => onCapture(null)}>
          Tirar outra
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-brand-ink/90">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-[3/4] w-full -scale-x-100 object-cover"
        />
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/80">
            Abrindo a câmera…
          </div>
        ) : null}
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-brand-danger bg-brand-danger-bg p-3.5 text-[14px] font-semibold leading-relaxed text-brand-danger"
        >
          {error}
        </div>
      ) : null}
      <Button onClick={takePhoto} disabled={!ready}>
        Tirar foto
      </Button>
    </div>
  );
}
