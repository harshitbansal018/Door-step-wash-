import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { EarningRow, PayoutRow } from "../types/db";

export const earningModel = {
  async listForWorker(db: Db, workerId: string, limit = 50) {
    return check(
      await db
        .from("worker_earnings")
        .select("*, booking:bookings!inner(code, slot_date, service:services!inner(name))")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ) as (EarningRow & { booking: { code: string; slot_date: string; service: { name: string } } })[];
  },

  async unpaidTotal(db: Db, workerId: string) {
    const rows = check(
      await db.from("worker_earnings").select("amount").eq("worker_id", workerId).in("status", ["pending", "in_payout"]),
    ) as { amount: number }[];
    return rows.reduce((s, r) => s + r.amount, 0);
  },

  async payoutsForWorker(db: Db, workerId: string): Promise<PayoutRow[]> {
    return check(
      await db.from("payouts").select("*").eq("worker_id", workerId).order("period_start", { ascending: false }),
    ) as PayoutRow[];
  },

  async listPayouts(db: Db, status?: PayoutRow["status"]) {
    let q = db
      .from("payouts")
      .select("*, worker:workers!inner(id, bank_last4, profile:profiles!inner(full_name, email))")
      .order("period_start", { ascending: false });
    if (status) q = q.eq("status", status);
    return check(await q) as (PayoutRow & {
      worker: { id: string; bank_last4: string | null; profile: { full_name: string; email: string } };
    })[];
  },

  async markPayoutPaid(db: Db, id: string, reference: string, paidBy: string) {
    const payout = check(
      await db
        .from("payouts")
        .update({ status: "paid", reference, paid_at: new Date().toISOString(), paid_by: paidBy })
        .eq("id", id)
        .eq("status", "pending")
        .select("*")
        .maybeSingle(),
    ) as PayoutRow | null;
    if (payout) {
      check(await db.from("worker_earnings").update({ status: "paid" }).eq("payout_id", id));
    }
    return payout;
  },

  async buildWeeklyPayouts(db: Db): Promise<number> {
    return check(await db.rpc("build_weekly_payouts")) as number;
  },
};
