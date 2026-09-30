import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { ProfileRow, WorkerRow } from "../types/db";

export type WorkerWithProfile = WorkerRow & {
  profile: Pick<ProfileRow, "full_name" | "email" | "phone">;
  area: { name: string } | null;
  city: { name: string } | null;
};

const WITH_PROFILE = "*, profile:profiles!inner(full_name, email, phone), area:service_areas(name), city:cities(name)";

export const workerModel = {
  async findById(db: Db, id: string): Promise<WorkerRow | null> {
    return check(await db.from("workers").select("*").eq("id", id).maybeSingle()) as WorkerRow | null;
  },

  async findWithProfile(db: Db, id: string): Promise<WorkerWithProfile | null> {
    return check(await db.from("workers").select(WITH_PROFILE).eq("id", id).maybeSingle()) as WorkerWithProfile | null;
  },

  async list(db: Db, filter: { cityId?: string; status?: WorkerRow["status"] } = {}) {
    let q = db.from("workers").select(WITH_PROFILE).order("created_at", { ascending: false });
    if (filter.cityId) q = q.eq("city_id", filter.cityId);
    if (filter.status) q = q.eq("status", filter.status);
    return check(await q) as WorkerWithProfile[];
  },

  /** Active workers in an area, online first, then best rated. */
  async candidatesForArea(db: Db, areaId: string) {
    return check(
      await db
        .from("workers")
        .select(WITH_PROFILE)
        .eq("area_id", areaId)
        .eq("status", "active")
        .order("is_online", { ascending: false })
        .order("rating", { ascending: false }),
    ) as WorkerWithProfile[];
  },

  async insert(db: Db, data: Partial<WorkerRow>) {
    return check(await db.from("workers").insert(data).select("*").single()) as WorkerRow;
  },

  async update(db: Db, id: string, patch: Partial<WorkerRow>) {
    return check(await db.from("workers").update(patch).eq("id", id).select("*").single()) as WorkerRow;
  },
};
