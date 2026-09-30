import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createUserClient } from "./lib/supabase";
import { userModel } from "./models/user.model";
import { authService, type SessionUser } from "./services/auth.service";

/** The signed-in user for rendering pages, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = await createUserClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return null;
    const profile = await userModel.findById(db, user.id);
    return profile && !profile.is_blocked ? authService.toSessionUser(profile) : null;
  } catch {
    return null;
  }
}
