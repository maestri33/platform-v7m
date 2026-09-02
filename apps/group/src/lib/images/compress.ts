/**
 * Compressão de foto no cliente antes do upload para a API.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export const FILE_TOO_LARGE_MSG =
  "O arquivo passou de 10MB mesmo depois de comprimir. Tente uma foto tirada direto pela câmera, sem editar.";

export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1024 * 1024) {
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^/.]+$/, "") || "foto";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
    });
  } catch {
    return file;
  } finally {
    if (bitmap) {
      bitmap.close();
    }
  }
}
