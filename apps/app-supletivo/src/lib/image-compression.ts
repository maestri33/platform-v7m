import imageCompression from "browser-image-compression";

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

/**
 * Comprime uma imagem no navegador antes do upload.
 * Reduz peso para conexões móveis sem degradar a legibilidade dos documentos e OCR.
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

  const defaultOptions = {
    maxSizeMB: options.maxSizeMB ?? 0.8,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1600,
    useWebWorker: options.useWebWorker ?? true,
    fileType: file.type === "image/png" ? "image/jpeg" : file.type,
    initialQuality: 0.85,
  };

  try {
    const compressedBlob = await imageCompression(file, defaultOptions);
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
      type: compressedBlob.type || "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Falha ao comprimir imagem, usando arquivo original:", error);
    return file;
  }
}
