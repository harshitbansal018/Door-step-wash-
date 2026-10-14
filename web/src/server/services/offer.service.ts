import "server-only";
import { unprocessable } from "../lib/errors";
import type { Db } from "../lib/supabase";
import { todayIn, zonedToUtc } from "../lib/time";
import { bookingModel } from "../models/booking.model";
import { offerModel } from "../models/offer.model";
import type { OfferRow, VehicleType } from "../types/db";

/** Everything an offer rule can look at. Built by the pricing code for one order. */
export interface OfferContext {
  kind: "booking" | "plan";
  /** Price before discounts: base (package or plan) + area charge. */
  subtotal: number;
  basePrice: number;
  areaCharge: number;
  cityId: string;
  areaId: string;
  vehicleType: VehicleType;
  customerId: string;
  customerEmail?: string;
  /** Booking: the package. */
  serviceId?: string;
  /** Plan: the plan, and which paid month this is (1 = first month). */
  planId?: string;
  planMonth?: number;
  /** Wash day (0 = Sunday) and start time "HH:MM". For plans, the weekly visit. Unknown until a slot is picked. */
  weekday?: number;
  startTime?: string;
  /** Price of another package for the same city and vehicle, for "free upgrade" offers. */
  priceOfService?: (serviceId: string) => Promise<number | null>;
}

export interface AppliedOffer {
  offer: OfferRow;
  discount: number;
}

// Statuses that count as a real (paid) booking for "new customer" offers.
const PAID_STATUSES = ["confirmed", "assigned", "accepted", "on_the_way", "in_progress", "completed"] as const;
const DAY_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

const reject = (message: string) => unprocessable(message, "OFFER_NOT_APPLICABLE");

/** Per-request cache of the customer facts that segment and loyalty rules need. */
function customerFacts(db: Db, customerId: string) {
  let completed: Promise<{ count: number; last: string | null }> | null = null;
  let paid: Promise<number> | null = null;
  let subscriber: Promise<boolean> | null = null;
  return {
    completed: () =>
      (completed ??= (async () => {
        const { data, count, error } = await db
          .from("bookings")
          .select("slot_date", { count: "exact" })
          .eq("customer_id", customerId)
          .eq("status", "completed")
          .order("slot_date", { ascending: false })
          .limit(1);
        if (error) throw error;
        return { count: count ?? 0, last: (data?.[0] as { slot_date: string } | undefined)?.slot_date ?? null };
      })()),
    paid: () => (paid ??= bookingModel.countByCustomer(db, customerId, [...PAID_STATUSES])),
    subscriber: () =>
      (subscriber ??= (async () => {
        const { count, error } = await db
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId)
          .in("status", ["active", "paused"]);
        if (error) throw error;
        return (count ?? 0) > 0;
      })()),
  };
}
type Facts = ReturnType<typeof customerFacts>;

async function usesToday(db: Db, offerId: string) {
  const since = zonedToUtc(todayIn("Asia/Kolkata"), "00:00", "Asia/Kolkata").toISOString();
  const { count, error } = await db
    .from("offer_usages")
    .select("id", { count: "exact", head: true })
    .eq("offer_id", offerId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/** Discount before caps, by discount type. */
async function rawDiscount(offer: OfferRow, ctx: OfferContext) {
  switch (offer.discount_type) {
    case "flat":
      return offer.value;
    case "percent":
      return Math.round((ctx.subtotal * offer.value) / 100);
    case "fixed_price":
      // `value` is what the customer pays in total.
      return ctx.subtotal - offer.value;
    case "free_area_charge":
      return ctx.areaCharge;
    case "price_match": {
      if (ctx.kind !== "booking" || !offer.price_service_id || !ctx.priceOfService) return 0;
      const matched = await ctx.priceOfService(offer.price_service_id);
      return matched === null ? 0 : ctx.basePrice - matched;
    }
    default:
      return 0;
  }
}

/** Applies the per-offer caps and keeps at least ₹1 to pay online. */
export function capDiscount(offer: OfferRow, raw: number, subtotal: number) {
  let discount = raw;
  if (offer.max_discount) discount = Math.min(discount, offer.max_discount);
  if (offer.budget) discount = Math.min(discount, offer.budget - offer.discount_given);
  return Math.max(0, Math.min(Math.round(discount), subtotal - 1));
}

/** Short human description of what an offer gives, for admin lists and customer messages. */
export function describeOffer(offer: Pick<OfferRow, "discount_type" | "value" | "max_discount">) {
  switch (offer.discount_type) {
    case "flat":
      return `₹${offer.value} off`;
    case "percent":
      return `${offer.value}% off${offer.max_discount ? ` (up to ₹${offer.max_discount})` : ""}`;
    case "fixed_price":
      return `Pay just ₹${offer.value}`;
    case "free_area_charge":
      return "No area charge";
    case "price_match":
      return "Free upgrade";
    default:
      return "Discount";
  }
}

export const offerService = {
  /** Validates every rule of an offer for this order. Throws with a customer-friendly reason. */
  async evaluate(db: Db, offer: OfferRow | null, ctx: OfferContext, facts: Facts = customerFacts(db, ctx.customerId), now = new Date()): Promise<AppliedOffer> {
    if (!offer || !offer.is_active) throw reject("This code is not valid.");
    if (now < new Date(offer.valid_from)) throw reject("This offer hasn't started yet.");
    if (now > new Date(offer.valid_to)) throw reject("This offer has expired.");

    // What it applies to.
    const appliesTo = offer.applies_to ?? "booking";
    if (ctx.kind === "booking" && appliesTo === "plan") throw reject("This offer is only for monthly plans.");
    if (ctx.kind === "plan" && appliesTo === "booking") throw reject("This offer can't be used on monthly plans.");
    if (ctx.kind === "plan" && offer.discount_type === "price_match") throw reject("This offer can't be used on monthly plans.");
    if (ctx.kind === "booking" && offer.service_ids.length && (!ctx.serviceId || !offer.service_ids.includes(ctx.serviceId))) {
      throw reject("This offer doesn't apply to the selected package.");
    }
    if (ctx.kind === "plan" && offer.plan_ids?.length && (!ctx.planId || !offer.plan_ids.includes(ctx.planId))) {
      throw reject("This offer doesn't apply to the selected plan.");
    }
    if (ctx.kind === "plan" && (ctx.planMonth ?? 1) > (offer.plan_months ?? 1)) {
      throw reject("This offer has already been used for its full number of months.");
    }

    // Where and what.
    if (offer.city_ids.length && !offer.city_ids.includes(ctx.cityId)) throw reject("This offer isn't available in your city.");
    if (offer.area_ids?.length && !offer.area_ids.includes(ctx.areaId)) throw reject("This offer isn't available in your area.");
    if (offer.vehicle_types?.length && !offer.vehicle_types.includes(ctx.vehicleType)) {
      throw reject("This offer doesn't apply to your vehicle type.");
    }

    // When the wash happens.
    if (offer.weekdays?.length) {
      if (ctx.weekday === undefined) throw reject("Pick a time slot to check this offer.");
      if (!offer.weekdays.includes(ctx.weekday)) {
        throw reject(`This offer is valid only on ${offer.weekdays.map((d) => DAY_NAMES[d]).join(", ")}.`);
      }
    }
    if (offer.time_from && offer.time_to) {
      if (!ctx.startTime) throw reject("Pick a time slot to check this offer.");
      const from = offer.time_from.slice(0, 5);
      const to = offer.time_to.slice(0, 5);
      if (ctx.startTime < from || ctx.startTime >= to) throw reject(`This offer is valid only for slots between ${from} and ${to}.`);
    }

    if (ctx.subtotal < offer.min_order) throw reject(`This offer needs a minimum order of ₹${offer.min_order}.`);

    // Limits and budget.
    if (offer.usage_limit !== null && offer.used_count >= offer.usage_limit) throw reject("This offer has been fully used.");
    if (offer.budget && offer.discount_given >= offer.budget) throw reject("This offer has been fully used.");
    if (offer.daily_limit && (await usesToday(db, offer.id)) >= offer.daily_limit) {
      throw reject("Today's quota for this offer is used up. Try again tomorrow.");
    }
    const used = await offerModel.usageCountForUser(db, offer.id, ctx.customerId);
    // A plan offer is used once per paid month, so the per-customer limit counts months only after the first.
    if (ctx.kind === "booking" && used >= offer.per_user_limit) throw reject("You've already used this offer.");
    if (ctx.kind === "plan" && (ctx.planMonth ?? 1) === 1 && used >= offer.per_user_limit) throw reject("You've already used this offer.");

    // Who the customer is.
    switch (offer.user_type) {
      case "new":
        if ((await facts.paid()) > 0) throw reject("This offer is only for your first booking.");
        break;
      case "returning":
        if ((await facts.completed()).count === 0) throw reject("This offer is for customers who have had a wash with us.");
        break;
      case "inactive": {
        const { count, last } = await facts.completed();
        const cutoff = new Date(Date.now() - offer.inactive_days * 86_400_000).toISOString().slice(0, 10);
        if (!count || !last || last > cutoff) throw reject(`This offer is for customers who haven't booked in ${offer.inactive_days} days.`);
        break;
      }
      case "subscribers":
        if (!(await facts.subscriber())) throw reject("This offer is only for monthly plan members.");
        break;
      case "list": {
        const email = ctx.customerEmail?.toLowerCase();
        if (!email || !offer.customer_emails?.some((e) => e.toLowerCase() === email)) throw reject("This offer isn't available on your account.");
        break;
      }
    }

    // Loyalty.
    if (offer.min_completed > 0 || offer.every_nth) {
      const { count } = await facts.completed();
      if (count < offer.min_completed) {
        throw reject(`This offer unlocks after ${offer.min_completed} completed washes. You have ${count}.`);
      }
      if (offer.every_nth && (count + 1) % offer.every_nth !== 0) {
        const left = offer.every_nth - ((count + 1) % offer.every_nth);
        throw reject(`This offer applies to every ${offer.every_nth}th wash. ${left} more to go.`);
      }
    }

    const discount = capDiscount(offer, await rawDiscount(offer, ctx), ctx.subtotal);
    if (discount <= 0) throw reject("This offer doesn't reduce the price of this order.");
    return { offer, discount };
  },

  async byCode(db: Db, code: string, ctx: OfferContext) {
    return this.evaluate(db, await offerModel.findByCode(db, code), ctx);
  },

  /**
   * Picks the offers for an order. A code, when given, must apply. Automatic
   * offers are added when they help. Several offers combine only if every one
   * of them is marked stackable; otherwise the single best one wins.
   */
  async resolve(db: Db, ctx: OfferContext, code?: string): Promise<{ applied: AppliedOffer[]; discount: number }> {
    const facts = customerFacts(db, ctx.customerId);
    const coded = code ? await this.evaluate(db, await offerModel.findByCode(db, code), ctx, facts) : null;

    const autos: AppliedOffer[] = [];
    for (const offer of await offerModel.listAll(db)) {
      if (!offer.auto_apply || !offer.is_active || offer.id === coded?.offer.id) continue;
      try {
        autos.push(await this.evaluate(db, offer, ctx, facts));
      } catch {
        // Not applicable to this order.
      }
    }

    const total = (set: AppliedOffer[]) => Math.min(ctx.subtotal - 1, set.reduce((s, a) => s + a.discount, 0));
    const ordered = (set: AppliedOffer[]) =>
      [...set].sort((a, b) => b.offer.priority - a.offer.priority || b.discount - a.discount);

    // Plans take one offer, so each paid month has a clear discount line.
    if (ctx.kind === "plan") {
      const best = coded ?? ordered(autos).sort((a, b) => b.discount - a.discount)[0] ?? null;
      return best ? { applied: [best], discount: best.discount } : { applied: [], discount: 0 };
    }

    const options: AppliedOffer[][] = [];
    if (coded) {
      options.push([coded]);
      if (coded.offer.stackable) options.push([coded, ...autos.filter((a) => a.offer.stackable)]);
    } else {
      for (const a of autos) options.push([a]);
      const stackables = autos.filter((a) => a.offer.stackable);
      if (stackables.length > 1) options.push(stackables);
    }
    if (!options.length) return { applied: [], discount: 0 };

    let best = options[0];
    for (const option of options) {
      if (total(option) > total(best) || (total(option) === total(best) && option.length < best.length)) best = option;
    }

    // Spread the cap (₹1 must remain) across the chosen offers in priority order.
    let room = ctx.subtotal - 1;
    const applied = ordered(best)
      .map((a) => {
        const discount = Math.min(a.discount, room);
        room -= discount;
        return { offer: a.offer, discount };
      })
      .filter((a) => a.discount > 0);
    return { applied, discount: applied.reduce((s, a) => s + a.discount, 0) };
  },

  /** Kept for callers that only want the best single automatic offer. */
  async bestAutomatic(db: Db, ctx: OfferContext) {
    const { applied } = await this.resolve(db, ctx);
    return applied[0] ?? null;
  },
};
