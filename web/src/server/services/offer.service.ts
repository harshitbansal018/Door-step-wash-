import "server-only";
import { unprocessable } from "../lib/errors";
import type { Db } from "../lib/supabase";
import { bookingModel } from "../models/booking.model";
import { offerModel } from "../models/offer.model";
import type { OfferRow } from "../types/db";

export interface OfferContext {
  subtotal: number;
  cityId: string;
  serviceId: string;
  customerId: string;
}

// Statuses that count as a real (paid) booking for "new customer" offers.
const PAID_STATUSES = ["confirmed", "assigned", "accepted", "on_the_way", "in_progress", "completed"] as const;

const reject = (message: string) => unprocessable(message, "OFFER_NOT_APPLICABLE");

export function discountFor(offer: OfferRow, subtotal: number) {
  let discount = offer.discount_type === "flat" ? offer.value : Math.round((subtotal * offer.value) / 100);
  if (offer.max_discount) discount = Math.min(discount, offer.max_discount);
  // Online payments need at least ₹1.
  return Math.max(0, Math.min(discount, subtotal - 1));
}

export const offerService = {
  /** Validates every rule of an offer for this order. Throws with a customer-friendly reason. */
  async evaluate(db: Db, offer: OfferRow | null, ctx: OfferContext, now = new Date()) {
    if (!offer || !offer.is_active) throw reject("This code is not valid.");
    if (now < new Date(offer.valid_from)) throw reject("This offer hasn't started yet.");
    if (now > new Date(offer.valid_to)) throw reject("This offer has expired.");
    if (offer.usage_limit !== null && offer.used_count >= offer.usage_limit) {
      throw reject("This offer has been fully used.");
    }
    if (offer.city_ids.length && !offer.city_ids.includes(ctx.cityId)) {
      throw reject("This offer isn't available in your city.");
    }
    if (offer.service_ids.length && !offer.service_ids.includes(ctx.serviceId)) {
      throw reject("This offer doesn't apply to the selected package.");
    }
    if (ctx.subtotal < offer.min_order) throw reject(`This offer needs a minimum order of ₹${offer.min_order}.`);

    const [used, paidBookings] = await Promise.all([
      offerModel.usageCountForUser(db, offer.id, ctx.customerId),
      offer.user_type === "new" ? bookingModel.countByCustomer(db, ctx.customerId, [...PAID_STATUSES]) : 0,
    ]);
    if (used >= offer.per_user_limit) throw reject("You've already used this offer.");
    if (offer.user_type === "new" && paidBookings > 0) throw reject("This offer is only for your first booking.");

    const discount = discountFor(offer, ctx.subtotal);
    if (discount <= 0) throw reject("This offer doesn't reduce the price of this order.");
    return { offer, discount };
  },

  async byCode(db: Db, code: string, ctx: OfferContext) {
    return this.evaluate(db, await offerModel.findByCode(db, code), ctx);
  },

  /** Best automatically-applied offer for this order, if any. */
  async bestAutomatic(db: Db, ctx: OfferContext) {
    const offers = (await offerModel.list(db)).filter((o) => o.auto_apply && o.is_active);
    let best: { offer: OfferRow; discount: number } | null = null;
    for (const offer of offers) {
      try {
        const result = await this.evaluate(db, offer, ctx);
        if (!best || result.discount > best.discount) best = result;
      } catch {
        // Not applicable; try the next one.
      }
    }
    return best;
  },
};
