import "server-only";
import { conflict } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { earningModel } from "../models/earning.model";
import { paymentModel } from "../models/payment.model";
import type { PaymentRow, PayoutRow } from "../types/db";

export const adminPayoutService = {
  /** Headline money totals for the Payments page, computed over all rows rather than one page. */
  async summary() {
    const db = createAdminClient();
    const [captured, payouts] = await Promise.all([paymentModel.capturedTotal(db), earningModel.payoutTotals(db)]);
    return { captured, payoutsPending: payouts.pending, payoutsPaid: payouts.paid };
  },

  async list(q: { status?: PayoutRow["status"]; search?: string; page: number; pageSize: number }) {
    const from = (q.page - 1) * q.pageSize;
    const { rows, total } = await earningModel.listPayouts(createAdminClient(), {
      status: q.status,
      search: q.search,
      from,
      to: from + q.pageSize - 1,
    });
    const items = rows.map((p) => ({
      id: p.id,
      workerId: p.worker.id,
      workerName: p.worker.profile.full_name,
      bankLast4: p.worker.bank_last4,
      periodStart: p.period_start,
      periodEnd: p.period_end,
      total: p.total,
      status: p.status,
      reference: p.reference,
      paidAt: p.paid_at,
    }));
    return { items, page: q.page, pageSize: q.pageSize, total };
  },

  async build() {
    return { created: await earningModel.buildWeeklyPayouts(createAdminClient()) };
  },

  /** Records that the bank transfer was made (the transfer itself happens outside the app for now). */
  async markPaid(adminId: string, id: string, reference: string) {
    const payout = await earningModel.markPayoutPaid(createAdminClient(), id, reference, adminId);
    if (!payout) throw conflict("This payout was already marked as paid or doesn't exist.", "PAYOUT_NOT_PENDING");
    return payout;
  },

  async transactions(
    page: number,
    pageSize: number,
    f: { search?: string; status?: PaymentRow["status"]; from?: string; to?: string } = {},
  ) {
    const from = (page - 1) * pageSize;
    const { rows, total } = await paymentModel.list(createAdminClient(), from, from + pageSize - 1, {
      search: f.search,
      status: f.status,
      dateFrom: f.from,
      dateTo: f.to,
    });
    return { items: rows, page, pageSize, total };
  },
};
