import "server-only";
import { conflict, forbidden, notFound, unprocessable } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { formatSlot, todayIn } from "../lib/time";
import type { AuthContext } from "../middlewares/auth.middleware";
import { bookingModel, type BookingDetail } from "../models/booking.model";
import { earningModel } from "../models/earning.model";
import { userModel } from "../models/user.model";
import { workerModel } from "../models/worker.model";
import type { BookingStatus, PhotoKind } from "../types/db";
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

async function activeWorker(auth: AuthContext) {
  const worker = await workerModel.findById(createAdminClient(), auth.userId);
  if (!worker) throw forbidden("Your partner profile is not set up yet.");
  if (worker.status !== "active") {
    throw forbidden(worker.status === "pending_kyc" ? "Your documents are still being verified." : "Your account is suspended.");
  }
  return worker;
}

async function ownJob(auth: AuthContext, id: string) {
  const booking = await bookingModel.findDetail(createAdminClient(), id);
  if (!booking || booking.worker_id !== auth.userId) throw notFound("Job");
  return booking;
}

function presentJob(b: BookingDetail) {
  const base = presentBooking(b);
  const revealContact = !["assigned"].includes(b.status);
  return {
    ...base,
    // Customer phone and exact address are shown only after the worker accepts.
    contact: revealContact ? base.contact : { name: base.contact.name, phone: null },
    address: revealContact ? base.address : { ...base.address, line: "Shown after you accept", parkingSpot: null },
    checklist: b.service.features,
    earning: null as number | null,
  };
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
    };
  },

  async setOnline(auth: AuthContext, online: boolean) {
    await activeWorker(auth);
    const w = await workerModel.update(createAdminClient(), auth.userId, { is_online: online });
    return { isOnline: w.is_online };
  },

  async jobs(auth: AuthContext) {
    const worker = await activeWorker(auth);
    const db = createAdminClient();
    const today = todayIn("Asia/Kolkata");
    const [active, completed] = await Promise.all([
      bookingModel.list(db, { workerId: auth.userId, status: ACTIVE_JOB, from: 0, to: 49 }),
      bookingModel.list(db, { workerId: auth.userId, status: ["completed"], date: today, from: 0, to: 49 }),
    ]);
    const rate = Number(worker.commission_rate);
    const withEarning = (b: BookingDetail) => ({ ...presentJob(b), earning: Math.round((b.base_price + b.area_charge) * rate) });
    return {
      requests: active.rows.filter((b) => b.status === "assigned").map(withEarning),
      upcoming: active.rows
        .filter((b) => b.status !== "assigned")
        .sort((a, b) => `${a.slot_date}${a.slot_start}`.localeCompare(`${b.slot_date}${b.slot_start}`))
        .map(withEarning),
      completedToday: completed.rows.map(withEarning),
    };
  },

  async job(auth: AuthContext, id: string) {
    const worker = await activeWorker(auth);
    const booking = await ownJob(auth, id);
    const db = createAdminClient();
    const photos = await bookingModel.photos(db, id);
    const urls = await storageService.signedUrls(db, "photos", photos.map((p) => p.storage_path));
    return {
      ...presentJob(booking),
      earning: Math.round((booking.base_price + booking.area_charge) * Number(worker.commission_rate)),
      photos: photos.map((p) => ({ id: p.id, kind: p.kind, url: urls.get(p.storage_path) ?? null })),
    };
  },

  /** Accept or decline an assigned job. Declined jobs go back to the admin to reassign. */
  async respond(auth: AuthContext, id: string, accept: boolean) {
    await activeWorker(auth);
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
    await activeWorker(auth);
    const booking = await ownJob(auth, id);
    const step = NEXT[booking.status];
    if (!step || step.to !== to) {
      throw unprocessable(`A job that is "${booking.status.replace(/_/g, " ")}" can't move to "${to.replace(/_/g, " ")}".`, "INVALID_TRANSITION");
    }

    const db = createAdminClient();
    if (step.needsPhoto && (await bookingModel.countPhotos(db, id, step.needsPhoto)) === 0) {
      throw unprocessable(`Add at least one ${step.needsPhoto} photo first.`, "PHOTO_REQUIRED");
    }

    const updated = await bookingModel.transition(db, id, [booking.status], { status: to, status_changed_by: auth.userId });
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
    await activeWorker(auth);
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

  async earnings(auth: AuthContext) {
    await activeWorker(auth);
    const db = createAdminClient();
    const [unpaid, recent, payouts] = await Promise.all([
      earningModel.unpaidTotal(db, auth.userId),
      earningModel.listForWorker(db, auth.userId, 30),
      earningModel.payoutsForWorker(db, auth.userId),
    ]);
    return {
      unpaid,
      recent: recent.map((e) => ({
        id: e.id,
        amount: e.amount,
        status: e.status,
        bookingCode: e.booking.code,
        service: e.booking.service.name,
        date: e.booking.slot_date,
      })),
      payouts: payouts.map((p) => ({
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
