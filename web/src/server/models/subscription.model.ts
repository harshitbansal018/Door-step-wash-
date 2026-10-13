import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { BookingRow, BookingStatus, SubscriptionPaymentRow, SubscriptionRow, SubscriptionStatus } from "../types/db";

export type SubscriptionDetail = SubscriptionRow & {
  plan: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    washes_per_month: number;
    bonus_count: number;
    features: string[];
    service: { id: string; name: string };
    bonus_service: { id: string; name: string } | null;
  };
  city: { name: string; timezone: string };
  area: { name: string };
  customer: { full_name: string; email: string; phone: string | null };
};

export type SubscriptionBooking = BookingRow & {
  service: { name: string };
  worker: { id: string; rating: number; profile: { full_name: string; phone: string | null } } | null;
};

const DETAIL =
  "*, plan:plans!inner(id, slug, name, tagline, washes_per_month, bonus_count, features, " +
  "service:services!plans_service_id_fkey(id, name), bonus_service:services!plans_bonus_service_id_fkey(id, name)), " +
  "city:cities!inner(name, timezone), area:service_areas!inner(name), customer:profiles!inner(full_name, email, phone)";

export interface ConfirmSubscriptionResult {
  subscription_id: string;
  status: SubscriptionStatus;
  already: boolean;
  renewed: boolean;
}

const LIVE: SubscriptionStatus[] = ["pending_payment", "active", "paused"];

export const subscriptionModel = {
  async insert(db: Db, data: Partial<SubscriptionRow>): Promise<SubscriptionRow> {
    return check(await db.from("subscriptions").insert(data).select("*").single()) as SubscriptionRow;
  },

  async findById(db: Db, id: string): Promise<SubscriptionRow | null> {
    return check(await db.from("subscriptions").select("*").eq("id", id).maybeSingle()) as SubscriptionRow | null;
  },

  async findDetail(db: Db, id: string): Promise<SubscriptionDetail | null> {
    return check(await db.from("subscriptions").select(DETAIL).eq("id", id).maybeSingle()) as SubscriptionDetail | null;
  },

  /** The customer's current plan: a live one first, else the most recent expired one. */
  async findCurrentForCustomer(db: Db, customerId: string): Promise<SubscriptionDetail | null> {
    const live = check(
      await db
        .from("subscriptions")
        .select(DETAIL)
        .eq("customer_id", customerId)
        .in("status", ["active", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ) as SubscriptionDetail | null;
    if (live) return live;
    return check(
      await db
        .from("subscriptions")
        .select(DETAIL)
        .eq("customer_id", customerId)
        .eq("status", "expired")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ) as SubscriptionDetail | null;
  },

  async hasLiveForCustomer(db: Db, customerId: string) {
    const { count, error } = await db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .in("status", LIVE.filter((s) => s !== "pending_payment"));
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async list(db: Db, f: { status?: SubscriptionStatus[]; cityId?: string; search?: string; from: number; to: number }) {
    let q = db.from("subscriptions").select(DETAIL, { count: "exact" }).order("created_at", { ascending: false });
    if (f.status?.length) q = q.in("status", f.status);
    if (f.cityId) q = q.eq("city_id", f.cityId);
    if (f.search) q = q.or(`code.ilike.%${f.search}%,contact_name.ilike.%${f.search}%,vehicle_plate.ilike.%${f.search}%,contact_phone.ilike.%${f.search}%`);
    const { data, count, error } = await q.range(f.from, f.to);
    if (error) throw error;
    return { rows: (data ?? []) as unknown as SubscriptionDetail[], total: count ?? 0 };
  },

  async update(db: Db, id: string, patch: Partial<SubscriptionRow>): Promise<SubscriptionRow> {
    return check(await db.from("subscriptions").update(patch).eq("id", id).select("*").single()) as SubscriptionRow;
  },

  /** Optimistic status change: only applies when the row is still in one of `expected`. */
  async transition(db: Db, id: string, expected: SubscriptionStatus[], patch: Partial<SubscriptionRow>) {
    return check(
      await db.from("subscriptions").update(patch).eq("id", id).in("status", expected).select("*").maybeSingle(),
    ) as SubscriptionRow | null;
  },

  async bookings(db: Db, subscriptionId: string, statuses?: BookingStatus[]): Promise<SubscriptionBooking[]> {
    let q = db
      .from("bookings")
      .select("*, service:services!inner(name), worker:workers(id, rating, profile:profiles!inner(full_name, phone))")
      .eq("subscription_id", subscriptionId)
      .order("slot_date")
      .order("slot_start");
    if (statuses?.length) q = q.in("status", statuses);
    return check(await q) as unknown as SubscriptionBooking[];
  },

  // ------------------------------------------------------------ payments
  async insertPayment(
    db: Db,
    data: Pick<SubscriptionPaymentRow, "subscription_id" | "provider_order_id" | "amount" | "currency" | "period_start" | "period_end">,
  ): Promise<SubscriptionPaymentRow> {
    return check(await db.from("subscription_payments").insert(data).select("*").single()) as SubscriptionPaymentRow;
  },

  async findPaymentByOrderId(db: Db, orderId: string): Promise<SubscriptionPaymentRow | null> {
    return check(
      await db.from("subscription_payments").select("*").eq("provider_order_id", orderId).maybeSingle(),
    ) as SubscriptionPaymentRow | null;
  },

  async payments(db: Db, subscriptionId: string): Promise<SubscriptionPaymentRow[]> {
    return check(
      await db
        .from("subscription_payments")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false }),
    ) as SubscriptionPaymentRow[];
  },

  async confirmPayment(db: Db, orderId: string, paymentId: string, method: string | null, raw: unknown) {
    return check(
      await db.rpc("confirm_subscription_payment", {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_method: method,
        p_raw: raw ?? null,
      }),
    ) as ConfirmSubscriptionResult;
  },

  async markPaymentFailed(db: Db, orderId: string, reason: string, raw: unknown) {
    check(await db.rpc("mark_subscription_payment_failed", { p_order_id: orderId, p_reason: reason, p_raw: raw ?? null }));
  },

  // ------------------------------------------------------------ scheduling
  /** Books the next visits for every active plan. Returns how many bookings were created. */
  async schedule(db: Db, days = 14): Promise<number> {
    return check(await db.rpc("schedule_subscription_bookings", { p_days: days })) as number;
  },
};
