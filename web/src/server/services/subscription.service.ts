import "server-only";
import { BRAND } from "@/lib/config";
import { conflict, forbidden, notFound, unprocessable } from "../lib/errors";
import { env } from "../lib/env";
import { razorpay } from "../lib/razorpay";
import { createAdminClient, type Db } from "../lib/supabase";
import { addDays, hhmm, todayIn } from "../lib/time";
import type { AuthContext } from "../middlewares/auth.middleware";
import { bookingModel } from "../models/booking.model";
import { cityModel } from "../models/city.model";
import { serviceModel } from "../models/service.model";
import { slotModel } from "../models/slot.model";
import { subscriptionModel, type SubscriptionBooking, type SubscriptionDetail } from "../models/subscription.model";
import type { BookingStatus, SubscriptionRow, SubscriptionStatus, VehicleType } from "../types/db";
import type { StartSubscriptionInput } from "../validators/plan.validator";
import { coverageService } from "./coverage.service";
import { notificationService } from "./notification.service";
import { describeOffer, offerService } from "./offer.service";
import { offerModel } from "../models/offer.model";
import { planService, slotStarts } from "./plan.service";

const UPCOMING: BookingStatus[] = ["confirmed", "assigned", "accepted", "on_the_way", "in_progress"];
const MOVABLE: BookingStatus[] = ["confirmed", "assigned", "accepted"];
/** Renewal opens this many days before the period ends. */
const RENEW_WINDOW_DAYS = 7;

/** Same day next month, clamped to the last day of that month (31 Jan → 28/29 Feb). */
export function addMonth(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // `m` is 1-based, so month index `m` is the next month; day 0 of the month after that is its last day.
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(y, m, Math.min(d, lastDay)));
  return target.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function presentVisit(b: SubscriptionBooking, opts: { showWorkerPhone?: boolean } = {}) {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    service: b.service.name,
    slot: { date: b.slot_date, start: hhmm(b.slot_start), end: hhmm(b.slot_end) },
    worker: b.worker
      ? { name: b.worker.profile.full_name, rating: b.worker.rating, phone: opts.showWorkerPhone ? b.worker.profile.phone : null }
      : null,
  };
}

export function presentSubscription(s: SubscriptionDetail) {
  const today = todayIn(s.city.timezone);
  const canRenew =
    s.status === "expired" ||
    (["active", "paused"].includes(s.status) && !!s.current_period_end && daysBetween(today, s.current_period_end) <= RENEW_WINDOW_DAYS);
  return {
    id: s.id,
    code: s.code,
    status: s.status,
    plan: {
      id: s.plan.id,
      slug: s.plan.slug,
      name: s.plan.name,
      tagline: s.plan.tagline,
      washesPerMonth: s.plan.washes_per_month,
      bonusCount: s.plan.bonus_count,
      service: s.plan.service.name,
      bonusService: s.plan.bonus_service?.name ?? null,
      features: s.plan.features,
    },
    city: s.city.name,
    area: s.area.name,
    weekday: s.weekday,
    startTime: hhmm(s.preferred_start),
    vehicle: { type: s.vehicle_type, makeModel: s.vehicle_make_model, plate: s.vehicle_plate },
    address: { line: s.address_line, landmark: s.landmark, pincode: s.pincode },
    contact: { name: s.contact_name, phone: s.contact_phone },
    price: { plan: s.plan_price, areaCharge: s.area_charge, total: s.total },
    period: { start: s.current_period_start, end: s.current_period_end },
    washes: { total: s.washes_total, used: s.washes_used, remaining: Math.max(0, s.washes_total - s.washes_used) },
    canRenew,
    cancelledReason: s.cancelled_reason,
    createdAt: s.created_at,
  };
}

async function loadOwned(db: Db, customerId: string, id: string) {
  const sub = await subscriptionModel.findDetail(db, id);
  if (!sub) throw notFound("Plan");
  if (sub.customer_id !== customerId) throw forbidden();
  return sub;
}

function assertStartTime(city: { open_time: string; close_time: string; slot_minutes: number }, startTime: string) {
  if (!slotStarts(city).includes(startTime)) {
    throw unprocessable("Pick one of the available start times.", "INVALID_START_TIME");
  }
}

async function openPayment(sub: SubscriptionRow, period: { start: string; end: string }, customer: { name: string; email: string; phone: string }) {
  const db = createAdminClient();

  if (env().PAYMENTS_MODE === "mock") {
    // Explicit mock mode: record a fake capture so the flow can be exercised end to end.
    const orderId = `dev_${sub.id.slice(0, 8)}_${Date.now()}`;
    await subscriptionModel.insertPayment(db, {
      subscription_id: sub.id,
      provider_order_id: orderId,
      amount: sub.total,
      currency: "INR",
      period_start: period.start,
      period_end: period.end,
      ...(sub.offer_id ? { offer_id: sub.offer_id, discount: sub.discount ?? 0 } : {}),
    });
    // The database enforces unique provider payment IDs. Reusing the literal
    // "dev" lets only the first local subscription activate successfully.
    await subscriptionService.applyCapture(orderId, `devpay_${orderId}`, "dev", null);
    return { checkout: null, paymentSkipped: true };
  }

  const order = await razorpay.createOrder(sub.total, sub.code, { subscription_id: sub.id, period_start: period.start });
  await subscriptionModel.insertPayment(db, {
    subscription_id: sub.id,
    provider_order_id: order.id,
    amount: sub.total,
    currency: order.currency,
    period_start: period.start,
    period_end: period.end,
    ...(sub.offer_id ? { offer_id: sub.offer_id, discount: sub.discount ?? 0 } : {}),
  });
  return {
    checkout: {
      provider: "razorpay" as const,
      keyId: razorpay.keyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: BRAND.name,
      description: `Monthly plan ${sub.code}`,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
    },
    paymentSkipped: false,
  };
}

/** Best offer for one paid month of a plan. Plans take a single offer. */
async function planOffer(
  db: Db,
  input: {
    cityId: string;
    areaId: string;
    planId: string;
    vehicleType: VehicleType;
    customerId: string;
    customerEmail?: string;
    weekday?: number;
    startTime?: string;
    planPrice: number;
    areaCharge: number;
    planMonth: number;
  },
  code?: string,
) {
  const { applied } = await offerService.resolve(
    db,
    {
      kind: "plan",
      subtotal: input.planPrice + input.areaCharge,
      basePrice: input.planPrice,
      areaCharge: input.areaCharge,
      cityId: input.cityId,
      areaId: input.areaId,
      vehicleType: input.vehicleType,
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      planId: input.planId,
      planMonth: input.planMonth,
      weekday: input.weekday,
      startTime: input.startTime,
    },
    code,
  );
  return applied[0] ?? null;
}

export const subscriptionService = {
  async quote(
    auth: AuthContext,
    input: { pincode: string; planId: string; vehicleType: VehicleType; code?: string; weekday?: number; startTime?: string },
  ) {
    const db = createAdminClient();
    const area = await coverageService.assertServed(input.pincode);
    const q = await planService.quote(db, {
      cityId: area.city_id,
      areaCharge: area.extra_charge,
      planId: input.planId,
      vehicleType: input.vehicleType,
    });
    const applied = await planOffer(
      db,
      {
        cityId: area.city_id,
        areaId: area.id,
        planId: input.planId,
        vehicleType: input.vehicleType,
        customerId: auth.userId,
        customerEmail: auth.email,
        weekday: input.weekday,
        startTime: input.startTime,
        planPrice: q.planPrice,
        areaCharge: q.areaCharge,
        planMonth: 1,
      },
      input.code,
    );
    const discount = applied?.discount ?? 0;
    const total = q.total - discount;
    return {
      planPrice: q.planPrice,
      areaCharge: q.areaCharge,
      discount,
      total,
      visits: q.visits,
      perVisit: Math.round(total / q.visits),
      listPrice: q.listPrice,
      offer: applied
        ? { id: applied.offer.id, code: applied.offer.code, title: applied.offer.title, label: describeOffer(applied.offer), months: applied.offer.plan_months }
        : null,
    };
  },

  /** Creates the subscription in `pending_payment` and opens the first month's payment. */
  async start(auth: AuthContext, input: StartSubscriptionInput) {
    const db = createAdminClient();
    if (await subscriptionModel.hasLiveForCustomer(db, auth.userId)) {
      throw conflict("You already have a plan. Manage it from My plan.", "PLAN_EXISTS");
    }
    const area = await coverageService.assertServed(input.pincode);
    assertStartTime(area.city, input.startTime);

    const quote = await planService.quote(db, {
      cityId: area.city_id,
      areaCharge: area.extra_charge,
      planId: input.planId,
      vehicleType: input.vehicleType,
    });

    const applied = await planOffer(
      db,
      {
        cityId: area.city_id,
        areaId: area.id,
        planId: input.planId,
        vehicleType: input.vehicleType,
        customerId: auth.userId,
        customerEmail: auth.email,
        weekday: input.weekday,
        startTime: input.startTime,
        planPrice: quote.planPrice,
        areaCharge: quote.areaCharge,
        planMonth: 1,
      },
      input.offerCode,
    );
    const discount = applied?.discount ?? 0;

    const periodStart = todayIn(area.city.timezone);
    const period = { start: periodStart, end: addMonth(periodStart) };

    const sub = await subscriptionModel.insert(db, {
      customer_id: auth.userId,
      plan_id: input.planId,
      city_id: area.city_id,
      area_id: area.id,
      weekday: input.weekday,
      preferred_start: input.startTime,
      vehicle_type: input.vehicleType,
      vehicle_make_model: input.vehicleMakeModel,
      vehicle_plate: input.vehiclePlate,
      address_line: input.addressLine,
      landmark: input.landmark || null,
      pincode: input.pincode,
      parking_type: input.parkingType,
      parking_spot: input.parkingSpot || null,
      car_access: input.carAccess,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      notes: input.notes || null,
      plan_price: quote.planPrice,
      area_charge: quote.areaCharge,
      // Offer columns are written only when an offer applies, so plans keep working before the offers migration runs.
      ...(applied ? { offer_id: applied.offer.id, discount } : {}),
      total: quote.total - discount,
    });

    try {
      const payment = await openPayment(sub, period, { name: input.contactName, email: auth.email, phone: input.contactPhone });
      return { subscription: { id: sub.id, code: sub.code, total: sub.total }, period, ...payment };
    } catch (err) {
      await subscriptionModel.transition(db, sub.id, ["pending_payment"], {
        status: "cancelled",
        cancelled_reason: "Payment could not be started",
        cancelled_at: new Date().toISOString(),
      });
      throw err;
    }
  },

  /** Idempotent: called from the checkout callback and the webhook. Activates or renews, then books visits. */
  async applyCapture(orderId: string, paymentId: string, method: string | null, raw: unknown) {
    const db = createAdminClient();
    const result = await subscriptionModel.confirmPayment(db, orderId, paymentId, method, raw);
    if (!result.already && result.status === "active") {
      const payment = await subscriptionModel.findPaymentByOrderId(db, orderId);
      const owner = await subscriptionModel.findById(db, result.subscription_id);
      if (payment?.offer_id && (payment.discount ?? 0) > 0 && owner) {
        await offerModel
          .recordUsage(db, { offerId: payment.offer_id, userId: owner.customer_id, subscriptionPaymentId: payment.id, discount: payment.discount ?? 0 })
          .catch((err) => console.error("[plans] offer usage failed", err));
      }
      await subscriptionModel.schedule(db, 14).catch((err) => console.error("[plans] scheduling failed", err));
      const detail = await subscriptionModel.findDetail(db, result.subscription_id);
      if (detail) {
        await notificationService
          .planActivated({
            to: detail.customer.email,
            name: detail.contact_name,
            code: detail.code,
            plan: detail.plan.name,
            visit: planService.visitLabel(detail.weekday, detail.preferred_start),
            periodEnd: detail.current_period_end ?? "",
            total: detail.total,
            renewed: result.renewed,
          })
          .catch((err) => console.error("[plans] email failed", err));
      }
    }
    return { subscriptionId: result.subscription_id, status: result.status, renewed: result.renewed };
  },

  /** The customer's current plan with its visits, or null. */
  async mine(auth: AuthContext) {
    const db = createAdminClient();
    const detail = await subscriptionModel.findCurrentForCustomer(db, auth.userId);
    if (!detail) return null;
    return this.summary(detail);
  },

  async summary(detail: SubscriptionDetail) {
    const db = createAdminClient();
    const [bookings, payments, servicePrices] = await Promise.all([
      subscriptionModel.bookings(db, detail.id),
      subscriptionModel.payments(db, detail.id),
      serviceModel.pricesForCity(db, detail.city_id),
    ]);
    const today = todayIn(detail.city.timezone);
    const visits = bookings.map((b) =>
      presentVisit(b, { showWorkerPhone: ["accepted", "on_the_way", "in_progress"].includes(b.status) }),
    );
    const nextVisit = visits.find((v) => UPCOMING.includes(v.status) && v.slot.date >= today) ?? null;

    // Savings: what this month's visits would cost one by one, minus the plan price.
    const priceOf = (serviceId: string | null) =>
      serviceId ? servicePrices.find((p) => p.service_id === serviceId && p.vehicle_type === detail.vehicle_type)?.price ?? 0 : 0;
    const listPrice =
      priceOf(detail.plan.service.id) * detail.plan.washes_per_month +
      priceOf(detail.plan.bonus_service?.id ?? null) * detail.plan.bonus_count +
      detail.area_charge;
    const captured = payments.find((p) => p.status === "captured");

    return {
      subscription: presentSubscription(detail),
      visits,
      nextVisit,
      savings: Math.max(0, listPrice - detail.total),
      lastPayment: captured
        ? { amount: captured.amount, status: captured.status, paidAt: captured.updated_at, periodStart: captured.period_start, periodEnd: captured.period_end }
        : null,
    };
  },

  async pause(auth: AuthContext, id: string) {
    const db = createAdminClient();
    const sub = await loadOwned(db, auth.userId, id);
    const updated = await subscriptionModel.transition(db, sub.id, ["active"], { status: "paused" });
    if (!updated) throw unprocessable("Only an active plan can be paused.", "NOT_PAUSABLE");
    return this.mine(auth);
  },

  async resume(auth: AuthContext, id: string) {
    const db = createAdminClient();
    const sub = await loadOwned(db, auth.userId, id);
    const today = todayIn(sub.city.timezone);
    if (!sub.current_period_end || sub.current_period_end <= today) {
      throw unprocessable("This plan's month has ended. Renew it to continue.", "PERIOD_ENDED");
    }
    const updated = await subscriptionModel.transition(db, sub.id, ["paused"], { status: "active" });
    if (!updated) throw unprocessable("Only a paused plan can be resumed.", "NOT_RESUMABLE");
    await subscriptionModel.schedule(db, 14).catch((err) => console.error("[plans] scheduling failed", err));
    return this.mine(auth);
  },

  /** Stops future visits. Visits already booked for the paid month stay and can still be used. */
  async cancel(auth: AuthContext, id: string, reason?: string) {
    const db = createAdminClient();
    const sub = await loadOwned(db, auth.userId, id);
    const updated = await subscriptionModel.transition(db, sub.id, ["active", "paused", "pending_payment"], {
      status: "cancelled",
      cancelled_reason: reason || "Cancelled by customer",
      cancelled_at: new Date().toISOString(),
    });
    if (!updated) throw unprocessable("This plan can no longer be cancelled.", "NOT_CANCELLABLE");
    return { id: sub.id, status: "cancelled" as SubscriptionStatus };
  },

  /** Pays for the next month. Allowed in the last week of a period or once it has expired. */
  async renew(auth: AuthContext, id: string) {
    const db = createAdminClient();
    const sub = await loadOwned(db, auth.userId, id);
    if (!presentSubscription(sub).canRenew) {
      throw unprocessable(`You can renew in the last ${RENEW_WINDOW_DAYS} days of your plan.`, "NOT_RENEWABLE");
    }
    const today = todayIn(sub.city.timezone);
    const start = sub.current_period_end && sub.current_period_end > today ? sub.current_period_end : today;
    const period = { start, end: addMonth(start) };

    // Keep the plan offer only while it is still valid and has months left.
    let offerId: string | null = null;
    let discount = 0;
    if (sub.offer_id) {
      const paidWithOffer = (await subscriptionModel.payments(db, sub.id)).filter(
        (p) => p.status === "captured" && p.offer_id === sub.offer_id,
      ).length;
      try {
        const result = await offerService.evaluate(db, await offerModel.findById(db, sub.offer_id), {
          kind: "plan",
          subtotal: sub.plan_price + sub.area_charge,
          basePrice: sub.plan_price,
          areaCharge: sub.area_charge,
          cityId: sub.city_id,
          areaId: sub.area_id,
          vehicleType: sub.vehicle_type,
          customerId: sub.customer_id,
          customerEmail: auth.email,
          planId: sub.plan_id,
          planMonth: paidWithOffer + 1,
          weekday: sub.weekday,
          startTime: sub.preferred_start.slice(0, 5),
        });
        offerId = result.offer.id;
        discount = result.discount;
      } catch {
        // Offer ended or its months are used up: this month is full price.
      }
    }
    // Only touch offer columns when this plan had an offer.
    const repriced = sub.offer_id
      ? await subscriptionModel.update(db, sub.id, { offer_id: offerId, discount, total: sub.plan_price + sub.area_charge - discount })
      : sub;
    const payment = await openPayment(repriced, period, { name: sub.contact_name, email: auth.email, phone: sub.contact_phone });
    return { subscription: { id: sub.id, code: sub.code, total: repriced.total }, period, ...payment };
  },

  /**
   * Changes the weekly day and time. Future visits that have not started are
   * cancelled (credits returned) and rebooked on the new day.
   */
  async changeVisit(auth: AuthContext, id: string, input: { weekday: number; startTime: string }) {
    const db = createAdminClient();
    const sub = await loadOwned(db, auth.userId, id);
    if (!["active", "paused"].includes(sub.status)) {
      throw unprocessable("Renew your plan before changing the visit day.", "NOT_ACTIVE");
    }
    const city = await cityModel.findCityById(db, sub.city_id);
    if (!city) throw notFound("City");
    assertStartTime(city, input.startTime);

    const today = todayIn(sub.city.timezone);
    const future = (await subscriptionModel.bookings(db, sub.id, MOVABLE)).filter((b) => b.slot_date > today);
    let returned = 0;
    for (const booking of future) {
      const cancelled = await bookingModel.transition(db, booking.id, MOVABLE, {
        status: "cancelled",
        cancelled_reason: "Plan visit day changed",
        status_changed_by: auth.userId,
      });
      if (cancelled) {
        await slotModel.release(db, booking.slot_id);
        returned += 1;
      }
    }
    await subscriptionModel.update(db, sub.id, {
      weekday: input.weekday,
      preferred_start: input.startTime,
      washes_used: Math.max(0, sub.washes_used - returned),
    });
    if (sub.status === "active") {
      await subscriptionModel.schedule(db, 14).catch((err) => console.error("[plans] scheduling failed", err));
    }
    return this.mine(auth);
  },

  /** First date on or after `from` that falls on `weekday`. */
  nextWeekday(from: string, weekday: number) {
    let d = from;
    for (let i = 0; i < 7; i += 1) {
      if (new Date(`${d}T00:00:00Z`).getUTCDay() === weekday) return d;
      d = addDays(d, 1);
    }
    return from;
  },
};
