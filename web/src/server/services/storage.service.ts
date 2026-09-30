import "server-only";
import { randomUUID } from "node:crypto";
import { unprocessable } from "../lib/errors";
import type { Db } from "../lib/supabase";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const DOC_TYPES: Record<string, string> = { ...IMAGE_TYPES, "application/pdf": "pdf" };

const BUCKETS = {
  photos: { name: "booking-photos", maxBytes: 2 * 1024 * 1024, types: IMAGE_TYPES },
  kyc: { name: "kyc-documents", maxBytes: 5 * 1024 * 1024, types: DOC_TYPES },
} as const;

type BucketKey = keyof typeof BUCKETS;

/** Checks the real file signature, not just the declared type. */
async function sniff(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = Array.from(head, (b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e47")) return "image/png";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  if (hex.startsWith("25504446")) return "application/pdf";
  return null;
}

export const storageService = {
  async upload(db: Db, bucketKey: BucketKey, folder: string, file: File) {
    const bucket = BUCKETS[bucketKey];
    if (file.size === 0) throw unprocessable("The file is empty.", "EMPTY_FILE");
    if (file.size > bucket.maxBytes) {
      throw unprocessable(`File is too large (max ${bucket.maxBytes / 1024 / 1024} MB).`, "FILE_TOO_LARGE");
    }
    const type = await sniff(file);
    const ext = type ? (bucket.types as Record<string, string>)[type] : undefined;
    if (!type || !ext) throw unprocessable("Unsupported file type.", "UNSUPPORTED_FILE");

    const path = `${folder}/${randomUUID()}.${ext}`;
    const { error } = await db.storage.from(bucket.name).upload(path, file, { contentType: type, upsert: false });
    if (error) throw error;
    return path;
  },

  /** Short-lived link for viewing a private file. */
  async signedUrl(db: Db, bucketKey: BucketKey, path: string, expiresInSeconds = 600) {
    const { data, error } = await db.storage.from(BUCKETS[bucketKey].name).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async signedUrls(db: Db, bucketKey: BucketKey, paths: string[], expiresInSeconds = 600) {
    if (!paths.length) return new Map<string, string>();
    const { data, error } = await db.storage.from(BUCKETS[bucketKey].name).createSignedUrls(paths, expiresInSeconds);
    if (error) throw error;
    return new Map(data.filter((d) => d.signedUrl).map((d) => [d.path ?? "", d.signedUrl]));
  },

  async remove(db: Db, bucketKey: BucketKey, paths: string[]) {
    if (!paths.length) return;
    const { error } = await db.storage.from(BUCKETS[bucketKey].name).remove(paths);
    if (error) throw error;
  },
};
