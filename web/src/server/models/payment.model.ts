import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { PaymentRow, RefundRow } from "../types/db";

export interface ConfirmResult {
  booking_id: string;
  status: string;
  needs_refund: boolean;
  already: boolean;
}

export const paymentModel = {
  async insert(db: Db, data: { booking_id: string; provider_order_id: string; amount: number; currency: string }) {
    return check(await db.from("payments").insert(data).select("*").single()) as PaymentRow;
  },

  async findByOrderId(db: Db, orderId: string): Promise<PaymentRow | null> {
    return check(
      await db.from("payments").select("*").eq("provider_order_id", orderId).maybeSingle(),
    ) as PaymentRow | null;
  },

  async findCapturedForBooking(db: Db, bookingId: string): Promise<PaymentRow | null> {
    return check(
      await db
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .in("status", ["captured", "partially_refunded"])
        .maybeSingle(),
    ) as PaymentRow | null;
  },

  async latestForBooking(db: Db, bookingId: string): Promise<PaymentRow | null> {
    return check(
      await db
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ) as PaymentRow | null;
  },

  async confirm(db: Db, orderId: string, paymentId: string, method: string | null, raw: unknown) {
    return check(
      await db.rpc("confirm_payment", {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_method: method,
        p_raw: raw ?? null,
      }),
    ) as ConfirmResult;
  },

  async markFailed(db: Db, orderId: string, reason: string, raw: unknown) {
    check(await db.rpc("mark_payment_failed", { p_order_id: orderId, p_reason: reason, p_raw: raw ?? null }));
  },

  async setStatus(db: Db, id: string, status: PaymentRow["status"]) {
    check(await db.from("payments").update({ status }).eq("id", id));
  },

  async list(db: Db, from: number, to: number) {
    const { data, count, error } = await db
      .from("payments")
      .select("*, booking:bookings!inner(code, contact_name, slot_date)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  },

  async insertRefund(db: Db, data: Partial<RefundRow>) {
    return check(await db.from("refunds").insert(data).select("*").single()) as RefundRow;
  },

  async updateRefund(db: Db, id: string, patch: Partial<RefundRow>) {
    check(await db.from("refunds").update(patch).eq("id", id));
  },

  async refundedTotal(db: Db, paymentId: string) {
    const rows = check(
      await db.from("refunds").select("amount").eq("payment_id", paymentId).in("status", ["pending", "processed"]),
    ) as { amount: number }[];
    return rows.reduce((s, r) => s + r.amount, 0);
  },

  /** Records a webhook event id; returns false if it was already processed. */
  async claimWebhookEvent(db: Db, id: string, provider: string, eventType: string) {
    const { error } = await db.from("webhook_events").insert({ id, provider, event_type: eventType });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  },
};
