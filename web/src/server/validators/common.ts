import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const uuid = z.uuid("Invalid id.");
export const pincode = z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode.");
export const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."));
export const isoDate = z.iso.date("Invalid date.");
export const vehicleType = z.enum(["hatchback", "sedan", "suv", "bike"]);
export const trimmed = (max: number) => z.string().trim().max(max);

/** Free-text search, stripped of characters that have meaning in PostgREST filters. */
export const search = z
  .string()
  .trim()
  .max(60)
  .transform((s) => s.replace(/[^\p{L}\p{N}@.\s-]/gu, ""))
  .optional();

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Parses and validates a JSON body. */
export async function readJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  const body = await req.json();
  return schema.parse(body);
}

/** Parses and validates query-string parameters. */
export function readQuery<T extends z.ZodType>(req: NextRequest, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
