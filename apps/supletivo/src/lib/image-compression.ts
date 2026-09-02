export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

/**
 * Comprime uma imagem no navegador antes do upload usando APIs nativas (canvas + createImageBitmap).
 * 0 dependências externas.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  // Se não for imagem ou não estiver no navegador, retorna original
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // Se já for pequena (< 400KB), não precisa recomprimir
  if (file.size < 400 * 1024) {
    return file;
  }

  const maxSide = options.maxWidthOrHeight ?? 1600;
  const quality = 0.85;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Falha ao comprimir imagem via canvas nativo, usando arquivo original:", error);
    return file;
  }
}
