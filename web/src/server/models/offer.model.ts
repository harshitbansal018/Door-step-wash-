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

  /** Every offer, for the auto-apply engine. Admin screens use the paged list. */
  async listAll(db: Db): Promise<OfferRow[]> {
    return check(await db.from("offers").select("*").order("created_at", { ascending: false })) as OfferRow[];
  },

  /** The highest-priority live offer flagged for the homepage popup. */
  async findPopup(db: Db): Promise<OfferRow | null> {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("offers")
      .select("*")
      .eq("show_popup", true)
      .eq("is_active", true)
      .lte("valid_from", now)
      .gt("valid_to", now)
      .order("priority", { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data?.[0] as OfferRow | undefined) ?? null;
  },

  async list(db: Db, from: number, to: number, f: { search?: string; state?: "active" | "scheduled" | "expired" | "inactive" } = {}) {
    const now = new Date().toISOString();
    let q = db.from("offers").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (f.search) q = q.or(`code.ilike.%${f.search}%,title.ilike.%${f.search}%`);
    if (f.state === "active") q = q.eq("is_active", true).lte("valid_from", now).gt("valid_to", now);
    if (f.state === "scheduled") q = q.eq("is_active", true).gt("valid_from", now);
    if (f.state === "expired") q = q.lte("valid_to", now);
    if (f.state === "inactive") q = q.eq("is_active", false);
    const { data, count, error } = await q.range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as OfferRow[], total: count ?? 0 };
  },

  async insert(db: Db, data: Partial<OfferRow>) {
    return check(await db.from("offers").insert(data).select("*").single()) as OfferRow;
  },

  async update(db: Db, id: string, patch: Partial<OfferRow>) {
    return check(await db.from("offers").update(patch).eq("id", id).select("*").single()) as OfferRow;
  },

  async referenceCounts(db: Db, id: string) {
    const [bookings, usages] = await Promise.all([
      db.from("bookings").select("id", { count: "exact", head: true }).eq("offer_id", id),
      db.from("offer_usages").select("id", { count: "exact", head: true }).eq("offer_id", id),
    ]);
    if (bookings.error) throw bookings.error;
    if (usages.error) throw usages.error;
    return { bookings: bookings.count ?? 0, usages: usages.count ?? 0 };
  },

  async delete(db: Db, id: string) {
    check(await db.from("offers").delete().eq("id", id));
  },

  /** Records one use atomically; returns false if it was already recorded. */
  async recordUsage(db: Db, u: { offerId: string; userId: string; bookingId?: string; subscriptionPaymentId?: string; discount: number }) {
    return check(
      await db.rpc("record_offer_usage", {
        p_offer_id: u.offerId,
        p_user_id: u.userId,
        p_booking_id: u.bookingId ?? null,
        p_subscription_payment_id: u.subscriptionPaymentId ?? null,
        p_discount: u.discount,
      }),
    ) as boolean;
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
