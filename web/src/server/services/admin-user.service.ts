import "server-only";
import { forbidden, notFound } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { userModel } from "../models/user.model";
import type { UserRole } from "../types/db";

export const adminUserService = {
  async list(q: { role?: UserRole; search?: string; page: number; pageSize: number }) {
    const from = (q.page - 1) * q.pageSize;
    const { rows, total } = await userModel.list(createAdminClient(), { ...q, from, to: from + q.pageSize - 1 });
    return {
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        isBlocked: u.is_blocked,
        createdAt: u.created_at,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  },

  /** Blocking also signs the user out everywhere. */
  async setBlocked(adminId: string, id: string, isBlocked: boolean) {
    if (id === adminId) throw forbidden("You can't block your own account.");
    const db = createAdminClient();
    if (!(await userModel.findById(db, id))) throw notFound("User");
    const user = await userModel.update(db, id, { is_blocked: isBlocked });
    if (isBlocked) {
      const { error } = await db.auth.admin.updateUserById(id, { ban_duration: "876000h" });
      if (error) throw error;
    } else {
      const { error } = await db.auth.admin.updateUserById(id, { ban_duration: "none" });
      if (error) throw error;
    }
    return { id: user.id, isBlocked: user.is_blocked };
  },
};
