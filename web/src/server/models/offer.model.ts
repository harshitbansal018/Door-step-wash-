import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { OfferRow } from "../types/db";

export const offerModel = {
  async findByCode(db: Db, code: string): Promise<OfferRow | null> {
    return check(await db.from("offers").select("*").eq("code", code).maybeSingle()) as OfferRow | null;
  },

  async findById(db: Db, id: string): Promise<OfferRow | null> {
    return check(await db.from("offers").select("*").eq("id", id).maybeSingle()) as OfferRow | null;
  },

  async list(db: Db): Promise<OfferRow[]> {
    return check(await db.from("offers").select("*").order("created_at", { ascending: false })) as OfferRow[];
  },

  async insert(db: Db, data: Partial<OfferRow>) {
    return check(await db.from("offers").insert(data).select("*").single()) as OfferRow;
  },

  async update(db: Db, id: string, patch: Partial<OfferRow>) {
    return check(await db.from("offers").update(patch).eq("id", id).select("*").single()) as OfferRow;
  },

  async usageCountForUser(db: Db, offerId: string, userId: string) {
    const { count, error } = await db
      .from("offer_usages")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offerId)
      .eq("user_id", userId);
    if (error) throw error;
    return count ?? 0;
  },
};
