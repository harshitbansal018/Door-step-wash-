// Browser-only helper: shrinks phone camera photos before upload so they go
// through on slow mobile data and stay under the 2 MB storage limit.

const MAX_SIDE = 1600;
const QUALITY = 0.82;

/** Resizes to at most 1600 px on the long side and re-encodes as JPEG. Falls back to the original file on any error. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Google Maps directions link for an Indian street address. */
export function mapsLink(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/** WhatsApp chat link for a 10-digit Indian mobile number. */
export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`;
}
