import "server-only";
import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "../lib/errors";
import { createUserClient, type Db } from "../lib/supabase";
import { userModel } from "../models/user.model";
import type { ProfileRow, UserRole } from "../types/db";
import { toErrorResponse } from "./error.middleware";

type Params = Record<string, string>;
export type RouteContext<P extends Params> = { params: Promise<P> };
export type RouteHandler<P extends Params = Params> = (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>;

export interface AuthContext {
  userId: string;
  email: string;
  profile: ProfileRow;
  /** Acts as the signed-in user; Row Level Security applies. */
  db: Db;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Blocks cross-site state-changing requests (CSRF). Browsers always send
 * `Origin` on POST/PATCH/DELETE; it must match the host serving the API.
 */
function assertSameOrigin(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Invalid request origin.");
  }
  if (originHost !== host) throw forbidden("Cross-site requests are not allowed.");
}

export async function getAuthContext(roles: UserRole[] | "any"): Promise<AuthContext> {
  const db = await createUserClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw unauthorized();

  const profile = await userModel.findById(db, user.id);
  if (!profile) throw unauthorized();
  if (profile.is_blocked) throw forbidden("Your account has been blocked. Please contact support.");
  if (roles !== "any" && !roles.includes(profile.role)) throw forbidden();

  return { userId: user.id, email: user.email ?? profile.email, profile, db };
}

/** Public endpoint: CSRF check + error handling. */
export function withPublic<P extends Params = Params>(
  handler: (req: NextRequest, params: P) => Promise<Response>,
): RouteHandler<P> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      return await handler(req, await ctx.params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Signed-in endpoint restricted to the given roles. */
export function withAuth<P extends Params = Params>(
  roles: UserRole[] | "any",
  handler: (req: NextRequest, auth: AuthContext, params: P) => Promise<Response>,
): RouteHandler<P> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      const auth = await getAuthContext(roles);
      return await handler(req, auth, await ctx.params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
