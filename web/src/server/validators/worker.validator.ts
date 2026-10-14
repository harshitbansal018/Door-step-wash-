import "server-only";
import { z } from "zod";

export const onlineSchema = z.object({ online: z.boolean() });
export const respondSchema = z.object({ accept: z.boolean() });
export const progressSchema = z.object({ status: z.enum(["on_the_way", "in_progress", "completed"]) });
export const issueSchema = z.object({
  reason: z.enum(["customer_unavailable", "no_water", "no_access", "vehicle_not_found", "unsafe_location", "other"]),
  note: z.string().trim().max(500).optional(),
});
export const jobHistoryQuery = z.object({
  scope: z.enum(["upcoming", "completed", "problem"]).default("upcoming"),
  date: z.iso.date().optional(),
  search: z.string().trim().max(40).transform((s) => s.replace(/[^\p{L}\p{N}\s-]/gu, "")).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export const photoKindSchema = z.enum(["before", "after"]);
