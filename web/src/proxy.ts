import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_PAGES, HOME_FOR_ROLE, PROTECTED_ROUTES, type Role } from "@/lib/roles";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Runs before every page: refreshes the Supabase session cookie and keeps
 * each area of the app to its role. API routes do their own checks.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rule = PROTECTED_ROUTES.find((r) => matches(pathname, r.prefix));
  const isAuthPage = AUTH_PAGES.some((p) => matches(pathname, p));

  if (!isSupabaseConfigured()) {
    if (!rule) return NextResponse.next();
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Validates the JWT (and refreshes it if needed). Do not trust getSession() here.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  let role: Role | null = null;
  if (claims) {
    role = (claims.user_role as Role | undefined) ?? null;
    if (!role) {
      // Custom access token hook not enabled yet: fall back to the profile row.
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
      role = (profile?.role as Role | undefined) ?? "customer";
    }
  }

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = new URL(path, request.url);
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (rule) {
    if (!role) return redirectTo("/login", { next: `${pathname}${search}` });
    if (!rule.roles.includes(role)) return redirectTo(HOME_FOR_ROLE[role]);
  }

  if (isAuthPage && role) return redirectTo(HOME_FOR_ROLE[role]);

  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
