import "server-only";
import { unprocessable } from "../lib/errors";
import type { Db } from "../lib/supabase";
import { serviceModel } from "../models/service.model";
import type { BookingAddon, VehicleType } from "../types/db";
import { addonService } from "./addon.service";
import { describeOffer, offerService } from "./offer.service";

export interface QuoteOffer {
  id: string;
  code: string;
  title: string;
  label: string;
  discount: number;
}

export interface Quote {
  basePrice: number;
  areaCharge: number;
  /** Extras chosen at checkout, priced on their own. */
  addons: BookingAddon[];
  addonsTotal: number;
  subtotal: number;
  discount: number;
  total: number;
  /** The main offer (largest discount), kept for older screens. */
  offer: Pick<QuoteOffer, "id" | "code" | "title"> | null;
  /** Every offer applied to this order. */
  offers: QuoteOffer[];
}

export const pricingService = {
  /**
   * The only place a price is calculated. The browser never sends amounts;
   * it sends what it wants, and this decides what it costs.
   */
  async quote(
    db: Db,
    input: {
      cityId: string;
      areaId: string;
      areaCharge: number;
      serviceId: string;
      vehicleType: VehicleType;
      customerId: string;
      customerEmail?: string;
      /** Known once a slot is picked; time-window offers need it. */
      slot?: { date: string; start: string };
      offerCode?: string;
      addonIds?: string[];
    },
  ): Promise<Quote> {
    const [service, price, extras] = await Promise.all([
      serviceModel.findById(db, input.serviceId),
      serviceModel.findPrice(db, input.cityId, input.serviceId, input.vehicleType),
      addonService.resolve(db, input.addonIds ?? [], input.vehicleType),
    ]);
    if (!service?.is_active || !price?.is_active) {
      throw unprocessable("This package isn't available for your vehicle in this city.", "SERVICE_UNAVAILABLE");
    }

    // Offers apply to the whole order, add-ons included.
    const subtotal = price.price + input.areaCharge + extras.total;
    const { applied, discount } = await offerService.resolve(
      db,
      {
        kind: "booking",
        subtotal,
        basePrice: price.price,
        areaCharge: input.areaCharge,
        cityId: input.cityId,
        areaId: input.areaId,
        vehicleType: input.vehicleType,
        customerId: input.customerId,
        customerEmail: input.customerEmail,
        serviceId: input.serviceId,
        weekday: input.slot ? new Date(`${input.slot.date}T00:00:00Z`).getUTCDay() : undefined,
        startTime: input.slot?.start.slice(0, 5),
        priceOfService: async (serviceId) => {
          const other = await serviceModel.findPrice(db, input.cityId, serviceId, input.vehicleType);
          return other?.is_active ? other.price : null;
        },
      },
      input.offerCode,
    );

    const offers = applied.map((a) => ({
      id: a.offer.id,
      code: a.offer.code,
      title: a.offer.title,
      label: describeOffer(a.offer),
      discount: a.discount,
    }));
    const main = [...offers].sort((a, b) => b.discount - a.discount)[0] ?? null;
    return {
      basePrice: price.price,
      areaCharge: input.areaCharge,
      addons: extras.addons,
      addonsTotal: extras.total,
      subtotal,
      discount,
      total: subtotal - discount,
      offer: main ? { id: main.id, code: main.code, title: main.title } : null,
      offers,
    };
  },
};
