export type Role = "customer" | "worker" | "admin";

/** Where each role lands after logging in. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  customer: "/dashboard",
  worker: "/worker",
  admin: "/admin",
};

/** Route prefixes and the roles allowed to open them. */
export const PROTECTED_ROUTES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/worker", roles: ["worker"] },
  { prefix: "/book", roles: ["customer"] },
  { prefix: "/dashboard", roles: ["customer"] },
  { prefix: "/bookings", roles: ["customer", "admin"] },
  { prefix: "/plan", roles: ["customer"] },
  { prefix: "/plans/start", roles: ["customer"] },
  { prefix: "/account", roles: ["customer", "worker", "admin"] },
];

/** Pages only for signed-out visitors. */
export const AUTH_PAGES = ["/login", "/signup", "/verify-email", "/forgot-password"];

/** Only allow relative, same-site redirect targets (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
