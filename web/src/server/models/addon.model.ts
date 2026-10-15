import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { AddonRow } from "../types/db";

export const addonModel = {
  async listAll(db: Db): Promise<AddonRow[]> {
    return check(await db.from("addons").select("*").order("sort_order").order("name")) as AddonRow[];
  },

  async findByIds(db: Db, ids: string[]): Promise<AddonRow[]> {
    if (!ids.length) return [];
    return check(await db.from("addons").select("*").in("id", ids)) as AddonRow[];
  },

  async insert(db: Db, data: Partial<AddonRow>) {
    return check(await db.from("addons").insert(data).select("*").single()) as AddonRow;
  },

  async update(db: Db, id: string, patch: Partial<AddonRow>) {
    return check(await db.from("addons").update(patch).eq("id", id).select("*").maybeSingle()) as AddonRow | null;
  },

  async delete(db: Db, id: string) {
    check(await db.from("addons").delete().eq("id", id));
  },
};
