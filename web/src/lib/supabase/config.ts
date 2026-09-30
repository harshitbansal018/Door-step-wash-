// Public Supabase settings. Safe for the browser; the literal `process.env.NEXT_PUBLIC_*`
// references are required so Next.js can inline them at build time.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = () => SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
