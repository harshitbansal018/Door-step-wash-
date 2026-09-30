import "server-only";
import { conflict } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { earningModel } from "../models/earning.model";
import { paymentModel } from "../models/payment.model";
import type { PayoutRow } from "../types/db";

export const adminPayoutService = {
  async list(status?: PayoutRow["status"]) {
    const rows = await earningModel.listPayouts(createAdminClient(), status);
    return rows.map((p) => ({
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

  async transactions(page: number, pageSize: number) {
    const from = (page - 1) * pageSize;
    const { rows, total } = await paymentModel.list(createAdminClient(), from, from + pageSize - 1);
    return { items: rows, page, pageSize, total };
  },
};
