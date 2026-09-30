import "server-only";
import { unprocessable } from "../lib/errors";
import type { Db } from "../lib/supabase";
import { serviceModel } from "../models/service.model";
import type { OfferRow, VehicleType } from "../types/db";
import { offerService } from "./offer.service";

export interface Quote {
  basePrice: number;
  areaCharge: number;
  subtotal: number;
  discount: number;
  total: number;
  offer: Pick<OfferRow, "id" | "code" | "title"> | null;
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
      areaCharge: number;
      serviceId: string;
      vehicleType: VehicleType;
      customerId: string;
      offerCode?: string;
    },
  ): Promise<Quote> {
    const [service, price] = await Promise.all([
      serviceModel.findById(db, input.serviceId),
      serviceModel.findPrice(db, input.cityId, input.serviceId, input.vehicleType),
    ]);
    if (!service?.is_active || !price?.is_active) {
      throw unprocessable("This package isn't available for your vehicle in this city.", "SERVICE_UNAVAILABLE");
    }

    const subtotal = price.price + input.areaCharge;
    const ctx = { subtotal, cityId: input.cityId, serviceId: input.serviceId, customerId: input.customerId };
    const applied = input.offerCode
      ? await offerService.byCode(db, input.offerCode, ctx)
      : await offerService.bestAutomatic(db, ctx);

    const discount = applied?.discount ?? 0;
    return {
      basePrice: price.price,
      areaCharge: input.areaCharge,
      subtotal,
      discount,
      total: subtotal - discount,
      offer: applied ? { id: applied.offer.id, code: applied.offer.code, title: applied.offer.title } : null,
    };
  },
};
