import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { SiteContentRow } from "../types/db";

export const siteContentModel = {
  async get(db: Db): Promise<SiteContentRow | null> {
    return check(await db.from("site_content").select("*").eq("id", "main").maybeSingle()) as SiteContentRow | null;
  },

  async save(db: Db, content: unknown, updatedBy: string): Promise<SiteContentRow> {
    return check(await db.from("site_content").upsert({ id: "main", content, updated_by: updatedBy }, { onConflict: "id" }).select("*").single()) as SiteContentRow;
  },
};
