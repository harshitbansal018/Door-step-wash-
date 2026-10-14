import "server-only";
import { conflict, forbidden, notFound, unprocessable } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { addDays, formatSlot, todayIn, zonedToUtc } from "../lib/time";
import type { AuthContext } from "../middlewares/auth.middleware";
import { bookingModel, type BookingDetail } from "../models/booking.model";
import { earningModel } from "../models/earning.model";
import { jobIssueModel } from "../models/job-issue.model";
import { userModel } from "../models/user.model";
import { workerModel } from "../models/worker.model";
import type { BookingStatus, JobIssueReason, PhotoKind } from "../types/db";
import { presentBooking } from "./booking.service";
import { notificationService } from "./notification.service";
import { storageService } from "./storage.service";

const MAX_PHOTOS_PER_KIND = 4;
const ACTIVE_JOB: BookingStatus[] = ["assigned", "accepted", "on_the_way", "in_progress"];

/** Allowed worker transitions and what each one requires. */
const NEXT: Partial<Record<BookingStatus, { to: BookingStatus; needsPhoto?: PhotoKind }>> = {
  accepted: { to: "on_the_way" },
  on_the_way: { to: "in_progress", needsPhoto: "before" },
  in_progress: { to: "completed", needsPhoto: "after" },
};

async function accessibleWorker(auth: AuthContext) {
  const worker = await workerModel.findById(createAdminClient(), auth.userId);
  if (!worker) throw forbidden("Your partner profile is not set up yet.");
  if (worker.status === "suspended") throw forbidden("Your account is suspended.");
  return worker;
}

async function ownJob(auth: AuthContext, id: string) {
  const booking = await bookingModel.findDetail(createAdminClient(), id);
  if (!booking || booking.worker_id !== auth.userId) throw notFound("Job");
  return booking;
}

export const ISSUE_LABELS: Record<JobIssueReason, string> = {
  customer_unavailable: "Customer not available",
  no_water: "No water access",
  no_access: "Can't reach the vehicle",
  vehicle_not_found: "Vehicle not found",
  unsafe_location: "Unsafe location",
  other: "Other problem",
};

function presentJob(b: BookingDetail, opts: { hasOpenIssue?: boolean } = {}) {
  const base = presentBooking(b);
  const revealContact = !["assigned"].includes(b.status);
  return {
    ...base,
    // Customer phone and exact address are shown only after the worker accepts.
    contact: revealContact ? base.contact : { name: base.contact.name, phone: null },
    address: revealContact ? base.address : { ...base.address, line: "Shown after you accept", parkingSpot: null },
    notes: revealContact ? b.notes : null,
    checklist: b.service.features,
    durationMin: b.service.duration_min,
    arrivedAt: b.arrived_at ?? null,
    // Last change of a job still waiting for a reply is when it was assigned.
    assignedAt: b.status === "assigned" ? b.updated_at : null,
    hasOpenIssue: !!opts.hasOpenIssue,
    earning: null as number | null,
  };
}

/** Start of today in a time zone, as an ISO instant. */
function startOfToday(timeZone: string) {
  return zonedToUtc(todayIn(timeZone), "00:00", timeZone).toISOString();
}

export const workerService = {
  async me(auth: AuthContext) {
    const db = createAdminClient();
    const worker = await workerModel.findWithProfile(db, auth.userId);
    if (!worker) throw forbidden("Your partner profile is not set up yet.");
    return {
      id: worker.id,
      name: worker.profile.full_name,
      email: worker.profile.email,
      status: worker.status,
      isOnline: worker.is_online,
      rating: Number(worker.rating),
      jobsDone: worker.jobs_done,
      area: worker.area?.name ?? null,
      city: worker.city?.name ?? null,
      bankLast4: worker.bank_last4,
      hasKycDocument: !!worker.kyc_document_path,
    };
  },

  async uploadKyc(auth: AuthContext, file: File) {
    const db = createAdminClient();
    const worker = await workerModel.findById(db, auth.userId);
    if (!worker) throw forbidden("Your partner profile is not set up yet.");
    const path = await storageService.upload(db, "kyc", auth.userId, file);
    try {
      await workerModel.update(db, auth.userId, { kyc_document_path: path });
    } catch (error) {
      await storageService.remove(db, "kyc", [path]);
      throw error;
    }
    if (worker.kyc_document_path) await storageService.remove(db, "kyc", [worker.kyc_document_path]).catch(() => undefined);
    return { hasKycDocument: true, status: worker.status };
  },

  async setOnline(auth: AuthContext, online: boolean) {
    await accessibleWorker(auth);
    const w = await workerModel.update(createAdminClient(), auth.userId, { is_online: online });
    return { isOnline: w.is_online };
  },

  async jobs(auth: AuthContext) {
    const worker = await accessibleWorker(auth);
    const db = createAdminClient();
    const today = todayIn("Asia/Kolkata");
    const [active, completed] = await Promise.all([
      bookingModel.list(db, { workerId: auth.userId, status: ACTIVE_JOB, from: 0, to: 49 }),
      bookingModel.list(db, { workerId: auth.userId, status: ["completed"], date: today, from: 0, to: 49 }),
    ]);
    const [earnedToday, openIssues] = await Promise.all([
      earningModel.earnedSince(db, auth.userId, startOfToday("Asia/Kolkata")),
      jobIssueModel.openBookingIds(db, auth.userId),
    ]);
    const issues = new Set(openIssues);
    const rate = Number(worker.commission_rate);
    const withEarning = (b: BookingDetail) => ({
      ...presentJob(b, { hasOpenIssue: issues.has(b.id) }),
      earning: Math.round((b.base_price + b.area_charge) * rate),
    });
    return {
      stats: {
        earnedToday,
        completedToday: completed.total,
        rating: Number(worker.rating),
        jobsDone: worker.jobs_done,
        isOnline: worker.is_online,
        status: worker.status,
      },
      requests: active.rows.filter((b) => b.status === "assigned").map(withEarning),
      upcoming: active.rows
        .filter((b) => b.status !== "assigned")
        .sort((a, b) => `${a.slot_date}${a.slot_start}`.localeCompare(`${b.slot_date}${b.slot_start}`))
        .map(withEarning),
      completedToday: completed.rows.map(withEarning),
    };
  },

  /** Paged job lists for the Jobs tab: upcoming (soonest first), completed (latest first), or jobs with an open problem. */
  async history(auth: AuthContext, q: { scope: "upcoming" | "completed" | "problem"; date?: string; search?: string; page: number; pageSize: number }) {
    const worker = await accessibleWorker(auth);
    const db = createAdminClient();
    const from = (q.page - 1) * q.pageSize;
    const openIssues = await jobIssueModel.openBookingIds(db, auth.userId);
    const filter =
      q.scope === "upcoming"
        ? { status: ACTIVE_JOB.filter((s) => s !== "assigned"), ascending: true }
        : q.scope === "completed"
          ? { status: ["completed"] as BookingStatus[] }
          : { ids: openIssues };
    const { rows, total } = await bookingModel.list(db, {
      workerId: auth.userId,
      ...filter,
      date: q.date,
      search: q.search,
      from,
      to: from + q.pageSize - 1,
    });
    const issues = new Set(openIssues);
    const rate = Number(worker.commission_rate);
    return {
      items: rows.map((b) => ({ ...presentJob(b, { hasOpenIssue: issues.has(b.id) }), earning: Math.round((b.base_price + b.area_charge) * rate) })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  },

  /** Records arrival at the vehicle. Only while travelling; idempotent. */
  async arrive(auth: AuthContext, id: string) {
    await accessibleWorker(auth);
    const booking = await ownJob(auth, id);
    if (booking.status !== "on_the_way") throw unprocessable("Start travel before marking arrival.", "NOT_ON_THE_WAY");
    if (booking.arrived_at) return { id, arrivedAt: booking.arrived_at };
    const arrivedAt = new Date().toISOString();
    const updated = await bookingModel.transition(createAdminClient(), id, ["on_the_way"], {
      arrived_at: arrivedAt,
      status_changed_by: auth.userId,
    });
    if (!updated) throw conflict("This job was just updated. Please refresh.", "STALE_BOOKING");
    return { id, arrivedAt };
  },

  /** Flags a problem on site for an administrator. The booking status is not changed. */
  async reportIssue(auth: AuthContext, id: string, input: { reason: JobIssueReason; note?: string }) {
    await accessibleWorker(auth);
    const booking = await ownJob(auth, id);
    if (!["accepted", "on_the_way", "in_progress"].includes(booking.status)) {
      throw unprocessable("You can report a problem only on a job you have accepted.", "NOT_REPORTABLE");
    }
    const db = createAdminClient();
    const issue = await jobIssueModel.insert(db, {
      booking_id: id,
      worker_id: auth.userId,
      reason: input.reason,
      note: input.note || null,
    });
    const me = await userModel.findById(db, auth.userId);
    await notificationService
      .jobIssueReported({
        code: booking.code,
        worker: me?.full_name || "A partner",
        reason: ISSUE_LABELS[input.reason],
        note: input.note || null,
        when: formatSlot(booking.slot_date, booking.slot_start, booking.slot_end),
        address: `${booking.address_line}, ${booking.area.name}, ${booking.city.name}`,
      })
      .catch((err) => console.error("[worker] issue email failed", err));
    return { id: issue.id, reason: issue.reason, createdAt: issue.created_at };
  },

  async job(auth: AuthContext, id: string) {
    const worker = await accessibleWorker(auth);
    const booking = await ownJob(auth, id);
    const db = createAdminClient();
    const [photos, issues] = await Promise.all([bookingModel.photos(db, id), jobIssueModel.forBooking(db, id)]);
    const urls = await storageService.signedUrls(db, "photos", photos.map((p) => p.storage_path));
    return {
      ...presentJob(booking, { hasOpenIssue: issues.some((i) => !i.resolved_at) }),
      earning: Math.round((booking.base_price + booking.area_charge) * Number(worker.commission_rate)),
      photos: photos.map((p) => ({ id: p.id, kind: p.kind, url: urls.get(p.storage_path) ?? null })),
      issues: issues.map((i) => ({
        id: i.id,
        reason: i.reason,
        label: ISSUE_LABELS[i.reason],
        note: i.note,
        resolved: !!i.resolved_at,
        createdAt: i.created_at,
      })),
      maxPhotosPerKind: MAX_PHOTOS_PER_KIND,
    };
  },

  /** Accept or decline an assigned job. Declined jobs go back to the admin to reassign. */
  async respond(auth: AuthContext, id: string, accept: boolean) {
    await accessibleWorker(auth);
    const booking = await ownJob(auth, id);
    if (booking.status !== "assigned") throw unprocessable("This job is no longer waiting for a response.", "NOT_ASSIGNED");

    const db = createAdminClient();
    const updated = await bookingModel.transition(
      db,
      id,
      ["assigned"],
      accept
        ? { status: "accepted", status_changed_by: auth.userId }
        : { status: "confirmed", worker_id: null, status_changed_by: auth.userId },
    );
    if (!updated) throw conflict("This job was just updated. Please refresh.", "STALE_BOOKING");

    if (accept) {
      const customer = await userModel.findById(db, booking.customer_id);
      const me = await userModel.findById(db, auth.userId);
      if (customer && me) {
        await notificationService.workerAssigned({
          to: customer.email,
          name: booking.contact_name,
          code: booking.code,
          service: booking.service.name,
          when: formatSlot(booking.slot_date, booking.slot_start, booking.slot_end),
          address: booking.address_line,
          workerName: me.full_name,
        });
      }
    }
    return { id, status: updated.status };
  },

  async advance(auth: AuthContext, id: string, to: BookingStatus) {
    await accessibleWorker(auth);
    const booking = await ownJob(auth, id);
    const step = NEXT[booking.status];
    if (!step || step.to !== to) {
      throw unprocessable(`A job that is "${booking.status.replace(/_/g, " ")}" can't move to "${to.replace(/_/g, " ")}".`, "INVALID_TRANSITION");
    }

    const db = createAdminClient();
    if (step.needsPhoto && (await bookingModel.countPhotos(db, id, step.needsPhoto)) === 0) {
      throw unprocessable(`Add at least one ${step.needsPhoto} photo first.`, "PHOTO_REQUIRED");
    }

    const updated = await bookingModel.transition(db, id, [booking.status], {
      status: to,
      status_changed_by: auth.userId,
      // Starting the wash implies arrival, even if "Arrived" was not tapped.
      ...(to === "in_progress" && !booking.arrived_at ? { arrived_at: new Date().toISOString() } : {}),
    });
    if (!updated) throw conflict("This job was just updated. Please refresh.", "STALE_BOOKING");

    if (to === "completed") {
      const customer = await userModel.findById(db, booking.customer_id);
      if (customer) {
        await notificationService.bookingCompleted({
          to: customer.email,
          name: booking.contact_name,
          code: booking.code,
          service: booking.service.name,
          when: formatSlot(booking.slot_date, booking.slot_start, booking.slot_end),
          address: booking.address_line,
        });
      }
    }
    return { id, status: updated.status };
  },

  async uploadPhoto(auth: AuthContext, id: string, kind: PhotoKind, file: File) {
    await accessibleWorker(auth);
    const booking = await ownJob(auth, id);
    const allowed: BookingStatus[] = kind === "before" ? ["on_the_way", "in_progress"] : ["in_progress"];
    if (!allowed.includes(booking.status)) {
      throw unprocessable(`You can't add ${kind} photos at this stage.`, "PHOTO_NOT_ALLOWED");
    }

    const db = createAdminClient();
    if ((await bookingModel.countPhotos(db, id, kind)) >= MAX_PHOTOS_PER_KIND) {
      throw unprocessable(`You can add up to ${MAX_PHOTOS_PER_KIND} ${kind} photos.`, "TOO_MANY_PHOTOS");
    }

    const path = await storageService.upload(db, "photos", `${booking.id}/${kind}`, file);
    try {
      const photo = await bookingModel.addPhoto(db, { booking_id: id, kind, storage_path: path, uploaded_by: auth.userId });
      return { id: photo.id, kind, url: await storageService.signedUrl(db, "photos", path) };
    } catch (err) {
      await storageService.remove(db, "photos", [path]);
      throw err;
    }
  },

  async earnings(
    auth: AuthContext,
    q: { page: number; pageSize: number; payoutPage: number; range: "all" | "week" | "month" | "custom"; from?: string; to?: string },
  ) {
    await accessibleWorker(auth);
    const db = createAdminClient();
    const tz = "Asia/Kolkata";
    const today = todayIn(tz);
    // Range as [since, until) instants in IST. Week starts Monday.
    let sinceDate: string | undefined;
    let untilDate: string | undefined;
    if (q.range === "week") {
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
      sinceDate = addDays(today, -((dow + 6) % 7));
    } else if (q.range === "month") {
      sinceDate = `${today.slice(0, 8)}01`;
    } else if (q.range === "custom") {
      sinceDate = q.from;
      untilDate = q.to ? addDays(q.to, 1) : undefined;
    }
    const since = sinceDate ? zonedToUtc(sinceDate, "00:00", tz).toISOString() : undefined;
    const until = untilDate ? zonedToUtc(untilDate, "00:00", tz).toISOString() : undefined;

    const earnFrom = (q.page - 1) * q.pageSize;
    const payFrom = (q.payoutPage - 1) * q.pageSize;
    const [unpaid, totals, rangeTotal, recent, payouts] = await Promise.all([
      earningModel.unpaidTotal(db, auth.userId),
      earningModel.payoutTotals(db, auth.userId),
      earningModel.earnedBetween(db, auth.userId, since, until),
      earningModel.listForWorker(db, auth.userId, earnFrom, earnFrom + q.pageSize - 1, { since, until }),
      earningModel.payoutsForWorker(db, auth.userId, payFrom, payFrom + q.pageSize - 1),
    ]);
    return {
      unpaid,
      paidTotal: totals.paid,
      rangeTotal,
      rangeJobs: recent.total,
      recentPage: { page: q.page, pageSize: q.pageSize, total: recent.total },
      payoutPage: { page: q.payoutPage, pageSize: q.pageSize, total: payouts.total },
      recent: recent.rows.map((e) => ({
        id: e.id,
        amount: e.amount,
        status: e.status,
        bookingCode: e.booking.code,
        service: e.booking.service.name,
        date: e.booking.slot_date,
      })),
      payouts: payouts.rows.map((p) => ({
        id: p.id,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        total: p.total,
        status: p.status,
        reference: p.reference,
      })),
    };
  },
};
