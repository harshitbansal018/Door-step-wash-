import "server-only";
import { conflict, forbidden, notFound, unprocessable } from "../lib/errors";
import { createAdminClient, type Db } from "../lib/supabase";
import { formatSlot } from "../lib/time";
import type { AuthContext } from "../middlewares/auth.middleware";
import { bookingModel, type BookingDetail } from "../models/booking.model";
import { cityModel } from "../models/city.model";
import { paymentModel } from "../models/payment.model";
import { slotModel } from "../models/slot.model";
import { userModel } from "../models/user.model";
import type { BookingStatus } from "../types/db";
import type { CreateBookingInput } from "../validators/booking.validator";
import { isSlotBookable, slotStartsAt } from "./catalog.service";
import { coverageService } from "./coverage.service";
import { notificationService } from "./notification.service";
import { paymentService } from "./payment.service";
import { pricingService } from "./pricing.service";
import { storageService } from "./storage.service";

/** How long a slot is held while the customer pays. */
export const PAYMENT_HOLD_MINUTES = 10;

const UPCOMING: BookingStatus[] = ["pending_payment", "confirmed", "assigned", "accepted", "on_the_way", "in_progress"];
const PAST: BookingStatus[] = ["completed", "cancelled", "expired"];
const CUSTOMER_CANCELLABLE: BookingStatus[] = ["pending_payment", "confirmed", "assigned", "accepted"];
const RESCHEDULABLE: BookingStatus[] = ["confirmed", "assigned", "accepted"];

/** Public shape of a booking returned to customers. */
export function presentBooking(b: BookingDetail, opts: { showWorkerPhone?: boolean } = {}) {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    service: { id: b.service.id, name: b.service.name },
    city: b.city.name,
    area: b.area.name,
    slot: { date: b.slot_date, start: b.slot_start.slice(0, 5), end: b.slot_end.slice(0, 5) },
    vehicle: { type: b.vehicle_type, makeModel: b.vehicle_make_model, plate: b.vehicle_plate },
    address: {
      line: b.address_line,
      landmark: b.landmark,
      pincode: b.pincode,
      parkingType: b.parking_type,
      parkingSpot: b.parking_spot,
      carAccess: b.car_access,
    },
    contact: { name: b.contact_name, phone: b.contact_phone },
    price: { base: b.base_price, areaCharge: b.area_charge, discount: b.discount, total: b.total },
    worker: b.worker
      ? {
          name: b.worker.profile.full_name,
          rating: b.worker.rating,
          phone: opts.showWorkerPhone ? b.worker.profile.phone : null,
        }
      : null,
    cancelledReason: b.cancelled_reason,
    createdAt: b.created_at,
  };
}

async function loadOwned(db: Db, customerId: string, bookingId: string) {
  const booking = await bookingModel.findDetail(db, bookingId);
  if (!booking) throw notFound("Booking");
  if (booking.customer_id !== customerId) throw forbidden();
  return booking;
}

export const bookingService = {
  async quote(auth: AuthContext, input: { pincode: string; serviceId: string; vehicleType: CreateBookingInput["vehicleType"]; code: string }) {
    const area = await coverageService.assertServed(input.pincode);
    return pricingService.quote(createAdminClient(), {
      cityId: area.city_id,
      areaCharge: area.extra_charge,
      serviceId: input.serviceId,
      vehicleType: input.vehicleType,
      customerId: auth.userId,
      offerCode: input.code,
    });
  },

  /** Creates a booking in `pending_payment`, holds the slot and opens a payment order. */
  async create(auth: AuthContext, input: CreateBookingInput) {
    const db = createAdminClient();
    const area = await coverageService.assertServed(input.pincode);

    const slot = await slotModel.findById(db, input.slotId);
    if (!slot || slot.area_id !== area.id) throw unprocessable("That slot is not available in your area.", "INVALID_SLOT");
    if (!isSlotBookable(slot, area.city)) throw conflict("That time slot is no longer available.", "SLOT_UNAVAILABLE");

    const quote = await pricingService.quote(db, {
      cityId: area.city_id,
      areaCharge: area.extra_charge,
      serviceId: input.serviceId,
      vehicleType: input.vehicleType,
      customerId: auth.userId,
      offerCode: input.offerCode,
    });

    const booking = await bookingModel.create(
      db,
      {
        customer_id: auth.userId,
        city_id: area.city_id,
        area_id: area.id,
        service_id: input.serviceId,
        slot_id: slot.id,
        offer_id: quote.offer?.id ?? "",
        vehicle_type: input.vehicleType,
        vehicle_make_model: input.vehicleMakeModel,
        vehicle_plate: input.vehiclePlate,
        address_line: input.addressLine,
        landmark: input.landmark ?? "",
        pincode: input.pincode,
        parking_type: input.parkingType,
        parking_spot: input.parkingSpot ?? "",
        car_access: input.carAccess,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        notes: input.notes ?? "",
        base_price: quote.basePrice,
        area_charge: quote.areaCharge,
        discount: quote.discount,
        total: quote.total,
      },
      PAYMENT_HOLD_MINUTES,
    );

    try {
      const checkout = await paymentService.startCheckout(booking, {
        name: input.contactName,
        email: auth.email,
        phone: input.contactPhone,
      });
      return {
        booking: { id: booking.id, code: booking.code, total: booking.total, expiresAt: booking.expires_at },
        quote,
        checkout,
      };
    } catch (err) {
      // Could not open a payment: give the slot back straight away.
      await bookingModel.transition(db, booking.id, ["pending_payment"], {
        status: "cancelled",
        cancelled_reason: "Payment could not be started",
        status_changed_by: auth.userId,
      });
      await slotModel.release(db, booking.slot_id);
      throw err;
    }
  },

  async listMine(auth: AuthContext, q: { scope: "upcoming" | "past" | "all"; page: number; pageSize: number }) {
    const from = (q.page - 1) * q.pageSize;
    const { rows, total } = await bookingModel.list(auth.db, {
      customerId: auth.userId,
      status: q.scope === "upcoming" ? UPCOMING : q.scope === "past" ? PAST : undefined,
      from,
      to: from + q.pageSize - 1,
    });
    return {
      items: rows.map((b) => presentBooking(b, { showWorkerPhone: ["accepted", "on_the_way", "in_progress"].includes(b.status) })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  },

  async getMine(auth: AuthContext, id: string) {
    const booking = await loadOwned(auth.db, auth.userId, id);
    const [timeline, photos, payment] = await Promise.all([
      bookingModel.statusLog(auth.db, id),
      bookingModel.photos(auth.db, id),
      paymentModel.latestForBooking(auth.db, id),
    ]);
    const urls = await storageService.signedUrls(createAdminClient(), "photos", photos.map((p) => p.storage_path));
    return {
      ...presentBooking(booking, { showWorkerPhone: ["accepted", "on_the_way", "in_progress"].includes(booking.status) }),
      timeline: timeline.map((t) => ({ status: t.to_status, at: t.created_at })),
      photos: photos.map((p) => ({ kind: p.kind, url: urls.get(p.storage_path) ?? null })),
      payment: payment ? { status: payment.status, method: payment.method, amount: payment.amount } : null,
    };
  },

  /** Customer cancellation. Full refund when cancelled before the city's cancellation window. */
  async cancelByCustomer(auth: AuthContext, id: string, reason?: string) {
    const db = createAdminClient();
    const booking = await loadOwned(db, auth.userId, id);
    if (!CUSTOMER_CANCELLABLE.includes(booking.status)) {
      throw unprocessable("This booking can no longer be cancelled.", "NOT_CANCELLABLE");
    }
    const city = await cityModel.findCityById(db, booking.city_id);
    const windowMs = (city?.cancellation_window_minutes ?? 120) * 60_000;
    const startsAt = slotStartsAt({ slot_date: booking.slot_date, start_time: booking.slot_start }, city ?? { timezone: "Asia/Kolkata" });
    const refundEligible = startsAt.getTime() - Date.now() >= windowMs;

    return this.cancel(db, booking, {
      actorId: auth.userId,
      reason: reason || "Cancelled by customer",
      refund: refundEligible ? "full" : "none",
      allowed: CUSTOMER_CANCELLABLE,
    });
  },

  /** Shared cancellation: status change, slot release, refund, email. */
  async cancel(
    db: Db,
    booking: BookingDetail,
    opts: { actorId: string; reason: string; refund: "full" | "none"; allowed: BookingStatus[] },
  ) {
    const updated = await bookingModel.transition(db, booking.id, opts.allowed, {
      status: "cancelled",
      cancelled_reason: opts.reason,
      status_changed_by: opts.actorId,
    });
    if (!updated) throw conflict("This booking was just updated. Please refresh and try again.", "STALE_BOOKING");

    await slotModel.release(db, booking.slot_id);

    let refunded = 0;
    const payment = await paymentModel.findCapturedForBooking(db, booking.id);
    if (payment && opts.refund === "full") {
      const alreadyRefunded = await paymentModel.refundedTotal(db, payment.id);
      const amount = payment.amount - alreadyRefunded;
      if (amount > 0) {
        await paymentService.refund(payment, amount, opts.reason, opts.actorId);
        refunded = amount;
      }
    }

    const customer = await userModel.findById(db, booking.customer_id);
    if (customer && booking.status !== "pending_payment") {
      await notificationService.bookingCancelled({
        to: customer.email,
        name: booking.contact_name,
        code: booking.code,
        service: booking.service.name,
        when: formatSlot(booking.slot_date, booking.slot_start, booking.slot_end),
        address: booking.address_line,
        refund: refunded,
      });
    }
    return { id: booking.id, status: "cancelled" as const, refunded };
  },

  async reschedule(auth: AuthContext, id: string, slotId: string) {
    const db = createAdminClient();
    const booking = await loadOwned(db, auth.userId, id);
    if (!RESCHEDULABLE.includes(booking.status)) {
      throw unprocessable("This booking can no longer be rescheduled.", "NOT_RESCHEDULABLE");
    }
    const [city, slot] = await Promise.all([cityModel.findCityById(db, booking.city_id), slotModel.findById(db, slotId)]);
    if (!city || !slot) throw notFound("Time slot");

    const windowMs = city.cancellation_window_minutes * 60_000;
    const currentStart = slotStartsAt({ slot_date: booking.slot_date, start_time: booking.slot_start }, city);
    if (currentStart.getTime() - Date.now() < windowMs) {
      throw unprocessable("It's too close to your slot to reschedule.", "TOO_LATE_TO_RESCHEDULE");
    }
    if (!isSlotBookable(slot, city)) throw conflict("That time slot is no longer available.", "SLOT_UNAVAILABLE");

    await bookingModel.moveSlot(db, booking.id, slot.id, auth.userId);
    return this.getMine(auth, id);
  },

  async review(auth: AuthContext, id: string, input: { rating: number; comment?: string }) {
    const db = createAdminClient();
    const booking = await loadOwned(db, auth.userId, id);
    if (booking.status !== "completed") throw unprocessable("You can rate a wash once it's completed.", "NOT_COMPLETED");
    if (await bookingModel.hasReview(db, id)) throw conflict("You've already rated this wash.", "ALREADY_REVIEWED");
    await bookingModel.addReview(db, {
      booking_id: id,
      customer_id: auth.userId,
      worker_id: booking.worker_id,
      rating: input.rating,
      comment: input.comment,
    });
    return { id, rating: input.rating };
  },
};
