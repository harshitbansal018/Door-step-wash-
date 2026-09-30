import "server-only";
import { conflict, notFound, unprocessable } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { formatSlot } from "../lib/time";
import { bookingModel } from "../models/booking.model";
import { paymentModel } from "../models/payment.model";
import { workerModel } from "../models/worker.model";
import type { BookingStatus } from "../types/db";
import { bookingService, presentBooking } from "./booking.service";
import { notificationService } from "./notification.service";
import { paymentService } from "./payment.service";
import { storageService } from "./storage.service";

const ASSIGNABLE: BookingStatus[] = ["confirmed", "assigned", "accepted"];
const ADMIN_CANCELLABLE: BookingStatus[] = ["pending_payment", "confirmed", "assigned", "accepted", "on_the_way", "in_progress"];

export const adminBookingService = {
  async list(q: { status?: BookingStatus[]; cityId?: string; date?: string; search?: string; page: number; pageSize: number }) {
    const from = (q.page - 1) * q.pageSize;
    const { rows, total } = await bookingModel.list(createAdminClient(), { ...q, from, to: from + q.pageSize - 1 });
    return {
      items: rows.map((b) => ({ ...presentBooking(b, { showWorkerPhone: true }), workerId: b.worker_id })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  },

  async detail(id: string) {
    const db = createAdminClient();
    const booking = await bookingModel.findDetail(db, id);
    if (!booking) throw notFound("Booking");
    const [timeline, photos, payment] = await Promise.all([
      bookingModel.statusLog(db, id),
      bookingModel.photos(db, id),
      paymentModel.latestForBooking(db, id),
    ]);
    const urls = await storageService.signedUrls(db, "photos", photos.map((p) => p.storage_path));
    return {
      ...presentBooking(booking, { showWorkerPhone: true }),
      customerId: booking.customer_id,
      workerId: booking.worker_id,
      timeline: timeline.map((t) => ({ status: t.to_status, at: t.created_at })),
      photos: photos.map((p) => ({ kind: p.kind, url: urls.get(p.storage_path) ?? null })),
      payment,
    };
  },

  /** Workers who can take this booking: same area, active, online first. */
  async candidates(id: string) {
    const db = createAdminClient();
    const booking = await bookingModel.findById(db, id);
    if (!booking) throw notFound("Booking");
    const workers = await workerModel.candidatesForArea(db, booking.area_id);
    return workers.map((w) => ({
      id: w.id,
      name: w.profile.full_name,
      rating: Number(w.rating),
      isOnline: w.is_online,
      jobsDone: w.jobs_done,
    }));
  },

  async assign(adminId: string, id: string, workerId: string) {
    const db = createAdminClient();
    const booking = await bookingModel.findDetail(db, id);
    if (!booking) throw notFound("Booking");
    if (!ASSIGNABLE.includes(booking.status)) {
      throw unprocessable("Only paid bookings that haven't started can be assigned.", "NOT_ASSIGNABLE");
    }
    const worker = await workerModel.findWithProfile(db, workerId);
    if (!worker || worker.status !== "active") throw unprocessable("This worker isn't active.", "WORKER_INACTIVE");
    if (worker.city_id !== booking.city_id) throw unprocessable("This worker works in a different city.", "WRONG_CITY");

    const updated = await bookingModel.transition(db, id, ASSIGNABLE, {
      status: "assigned",
      worker_id: workerId,
      status_changed_by: adminId,
    });
    if (!updated) throw conflict("This booking was just updated. Please refresh.", "STALE_BOOKING");

    await notificationService.newJobForWorker(worker.profile.email, {
      code: booking.code,
      service: booking.service.name,
      when: formatSlot(booking.slot_date, booking.slot_start, booking.slot_end),
      area: booking.area.name,
    });
    return { id, status: updated.status, workerId };
  },

  async cancel(adminId: string, id: string, input: { reason: string; refund: boolean }) {
    const db = createAdminClient();
    const booking = await bookingModel.findDetail(db, id);
    if (!booking) throw notFound("Booking");
    if (!ADMIN_CANCELLABLE.includes(booking.status)) {
      throw unprocessable("This booking can't be cancelled.", "NOT_CANCELLABLE");
    }
    return bookingService.cancel(db, booking, {
      actorId: adminId,
      reason: input.reason,
      refund: input.refund ? "full" : "none",
      allowed: ADMIN_CANCELLABLE,
    });
  },

  async refund(adminId: string, input: { bookingId: string; amount: number; reason: string }) {
    const db = createAdminClient();
    const payment = await paymentModel.findCapturedForBooking(db, input.bookingId);
    if (!payment) throw unprocessable("This booking has no captured payment.", "NOT_REFUNDABLE");
    return paymentService.refund(payment, input.amount, input.reason, adminId);
  },
};
