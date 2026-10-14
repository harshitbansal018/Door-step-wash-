import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { EarningRow, PayoutRow } from "../types/db";

export const earningModel = {
  async listForWorker(db: Db, workerId: string, from: number, to: number, range: { since?: string; until?: string } = {}) {
    let q = db
      .from("worker_earnings")
      .select("*, booking:bookings!inner(code, slot_date, service:services!inner(name))", { count: "exact" })
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });
    if (range.since) q = q.gte("created_at", range.since);
    if (range.until) q = q.lt("created_at", range.until);
    const { data, count, error } = await q.range(from, to);
    if (error) throw error;
    return {
      rows: (data ?? []) as (EarningRow & { booking: { code: string; slot_date: string; service: { name: string } } })[],
      total: count ?? 0,
    };
  },

  /** Sum of payouts by status, optionally for one worker. Used for headline totals that must not depend on paging. */
  async payoutTotals(db: Db, workerId?: string) {
    let q = db.from("payouts").select("total, status");
    if (workerId) q = q.eq("worker_id", workerId);
    const rows = check(await q) as { total: number; status: PayoutRow["status"] }[];
    return rows.reduce(
      (acc, r) => {
        acc[r.status] += r.total;
        return acc;
      },
      { pending: 0, paid: 0 } as Record<PayoutRow["status"], number>,
    );
  },

  /** Sum of a worker's earnings in [since, until). */
  async earnedBetween(db: Db, workerId: string, since?: string, until?: string) {
    let q = db.from("worker_earnings").select("amount").eq("worker_id", workerId);
    if (since) q = q.gte("created_at", since);
    if (until) q = q.lt("created_at", until);
    const rows = check(await q) as { amount: number }[];
    return rows.reduce((s, r) => s + r.amount, 0);
  },

  /** What a worker earned from jobs completed since the given instant (start of their day). */
  async earnedSince(db: Db, workerId: string, sinceIso: string) {
    const rows = check(
      await db.from("worker_earnings").select("amount").eq("worker_id", workerId).gte("created_at", sinceIso),
    ) as { amount: number }[];
    return rows.reduce((s, r) => s + r.amount, 0);
  },

  async unpaidTotal(db: Db, workerId: string) {
    const rows = check(
      await db.from("worker_earnings").select("amount").eq("worker_id", workerId).in("status", ["pending", "in_payout"]),
    ) as { amount: number }[];
    return rows.reduce((s, r) => s + r.amount, 0);
  },

  async payoutsForWorker(db: Db, workerId: string, from: number, to: number) {
    const { data, count, error } = await db
      .from("payouts")
      .select("*", { count: "exact" })
      .eq("worker_id", workerId)
      .order("period_start", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as PayoutRow[], total: count ?? 0 };
  },

  async listPayouts(db: Db, opts: { status?: PayoutRow["status"]; search?: string; from: number; to: number }) {
    let q = db
      .from("payouts")
      .select("*, worker:workers!inner(id, bank_last4, profile:profiles!inner(full_name, email))", { count: "exact" })
      .order("period_start", { ascending: false });
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.search) q = q.ilike("worker.profile.full_name", `%${opts.search}%`);
    const { data, count, error } = await q.range(opts.from, opts.to);
    if (error) throw error;
    return {
      rows: (data ?? []) as unknown as (PayoutRow & {
        worker: { id: string; bank_last4: string | null; profile: { full_name: string; email: string } };
      })[],
      total: count ?? 0,
    };
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
