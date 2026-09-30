import "server-only";
import { z } from "zod";

export const onlineSchema = z.object({ online: z.boolean() });
export const respondSchema = z.object({ accept: z.boolean() });
export const progressSchema = z.object({ status: z.enum(["on_the_way", "in_progress", "completed"]) });
export const photoKindSchema = z.enum(["before", "after"]);
