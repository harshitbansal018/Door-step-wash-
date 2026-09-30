import "server-only";
import { z } from "zod";
import { AppError } from "./errors";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("ShineDoor <no-reply@example.com>"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validated server environment. Throws a readable error when misconfigured. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    console.error(`[env] Server environment is not configured: ${missing}. See .env.example.`);
    throw new AppError(503, "NOT_CONFIGURED", "The server isn't fully configured yet. Please try again later.");
  }
  cached = parsed.data;
  return cached;
}
