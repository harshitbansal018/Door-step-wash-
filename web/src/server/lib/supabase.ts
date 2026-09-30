import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export type Db = SupabaseClient;

/**
 * Client acting as the signed-in user (reads session cookies). Row Level
 * Security applies, so it can only see what that user is allowed to see.
 */
export async function createUserClient(): Promise<Db> {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes sessions.
        }
      },
    },
  });
}

let adminClient: Db | null = null;

/**
 * Service-role client. Bypasses Row Level Security — only use it in services
 * after the caller's permissions have been checked.
 */
export function createAdminClient(): Db {
  if (adminClient) return adminClient;
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env();
  adminClient = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}
