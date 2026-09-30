import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { ProfileRow, UserRole } from "../types/db";

export const userModel = {
  async findById(db: Db, id: string): Promise<ProfileRow | null> {
    return check(await db.from("profiles").select("*").eq("id", id).maybeSingle());
  },

  async findByEmail(db: Db, email: string): Promise<ProfileRow | null> {
    return check(await db.from("profiles").select("*").eq("email", email).maybeSingle());
  },

  async update(db: Db, id: string, patch: Partial<Pick<ProfileRow, "full_name" | "phone" | "role" | "is_blocked">>) {
    return check(await db.from("profiles").update(patch).eq("id", id).select("*").single()) as ProfileRow;
  },

  async setRole(db: Db, id: string, role: UserRole) {
    return this.update(db, id, { role });
  },

  async list(db: Db, opts: { role?: UserRole; search?: string; from: number; to: number }) {
    let q = db.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (opts.role) q = q.eq("role", opts.role);
    if (opts.search) q = q.or(`email.ilike.%${opts.search}%,full_name.ilike.%${opts.search}%`);
    const { data, count, error } = await q.range(opts.from, opts.to);
    if (error) throw error;
    return { rows: (data ?? []) as ProfileRow[], total: count ?? 0 };
  },
};
