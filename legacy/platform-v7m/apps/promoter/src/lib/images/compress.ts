/**
 * Compressão de foto no CLIENTE, antes do upload.
 *
 * Fotos de câmera de celular vêm com 4–12MB; o backend rejeita as maiores só
 * DEPOIS da subida inteira (rede móvel paga o custo) e o proxy Next bufferiza
 * o multipart em memória. OCR/visão não precisam de mais que ~1600px no maior
 * lado — comprimir aqui derruba o upload pra ~300–500KB sem perder leitura.
 *
 * Best-effort de propósito: HEIC/PDF/formatos que o canvas não decodifica
 * voltam intocados — o backend continua sendo quem valida tipo e tamanho.
 */

/** Espelha o MAX_UPLOAD_MB do backend (10MB) — validado ANTES de subir. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const FILE_TOO_LARGE_MSG =
  "O arquivo passou de 10MB mesmo depois de comprimir. Tente uma foto tirada direto pela câmera, sem editar.";

export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.8,
): Promise<File> {
  // PDF, HEIC e afins: deixa passar — o backend decide.
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    // `createImageBitmap` respeita a orientação EXIF nos browsers atuais.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    // Já é pequena e leve → não recomprime (não perder qualidade à toa).
    if (scale === 1 && file.size < 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // Compressão que não ajudou (raro) → original.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file; // decodificação falhou — o backend valida do jeito dele
  }
}
