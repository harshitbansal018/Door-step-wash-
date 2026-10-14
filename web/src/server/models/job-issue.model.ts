import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { JobIssueReason, JobIssueRow } from "../types/db";

/** True when the job_issues migration has not been applied yet. Reads then degrade to "no issues". */
function missingTable(error: { code?: string } | null) {
  return !!error && (error.code === "PGRST205" || error.code === "42P01");
}

export const jobIssueModel = {
  async insert(db: Db, data: { booking_id: string; worker_id: string; reason: JobIssueReason; note: string | null }) {
    return check(await db.from("job_issues").insert(data).select("*").single()) as JobIssueRow;
  },

  async forBooking(db: Db, bookingId: string): Promise<JobIssueRow[]> {
    const result = await db.from("job_issues").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false });
    if (missingTable(result.error)) return [];
    return check(result) as JobIssueRow[];
  },

  /** Booking ids that have an unresolved issue reported by this worker. */
  async openBookingIds(db: Db, workerId: string): Promise<string[]> {
    const result = await db.from("job_issues").select("booking_id").eq("worker_id", workerId).is("resolved_at", null);
    if (missingTable(result.error)) return [];
    const rows = check(result) as { booking_id: string }[];
    return [...new Set(rows.map((r) => r.booking_id))];
  },
};
