import "server-only";
import { notFound, unprocessable } from "../lib/errors";
import { createUserClient } from "../lib/supabase";
import { addDays, hhmm, todayIn, zonedToUtc } from "../lib/time";
import { cityModel } from "../models/city.model";
import { serviceModel } from "../models/service.model";
import { slotModel } from "../models/slot.model";
import type { CityRow, SlotRow, VehicleType } from "../types/db";

/** Bookings must start at least this long from now. */
export const MIN_NOTICE_MINUTES = 60;
export const BOOKING_WINDOW_DAYS = 14;

export function slotStartsAt(slot: Pick<SlotRow, "slot_date" | "start_time">, city: Pick<CityRow, "timezone">) {
  return zonedToUtc(slot.slot_date, slot.start_time, city.timezone);
}

export function isSlotBookable(slot: SlotRow, city: Pick<CityRow, "timezone">, now = new Date()) {
  const earliest = now.getTime() + MIN_NOTICE_MINUTES * 60_000;
  return !slot.is_blocked && slot.booked < slot.capacity && slotStartsAt(slot, city).getTime() >= earliest;
}

export const catalogService = {
  /** Packages and prices for the city an area belongs to. */
  async forArea(areaId: string) {
    const db = await createUserClient();
    const area = await cityModel.findAreaById(db, areaId);
    if (!area || !area.is_active || !area.city.is_active) throw notFound("Service area");

    const [services, prices] = await Promise.all([
      serviceModel.listAll(db),
      serviceModel.pricesForCity(db, area.city_id),
    ]);

    return services
      .filter((s) => s.is_active)
      .map((s) => {
        const p = prices.filter((x) => x.service_id === s.id && x.is_active);
        return {
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          durationMin: s.duration_min,
          features: s.features,
          isPopular: s.is_popular,
          prices: Object.fromEntries(p.map((x) => [x.vehicle_type, x.price])) as Partial<Record<VehicleType, number>>,
        };
      })
      .filter((s) => Object.keys(s.prices).length > 0);
  },

  async slots(areaId: string, date: string) {
    const db = await createUserClient();
    const area = await cityModel.findAreaById(db, areaId);
    if (!area || !area.is_active || !area.city.is_active) throw notFound("Service area");

    const today = todayIn(area.city.timezone);
    if (date < today || date > addDays(today, BOOKING_WINDOW_DAYS - 1)) {
      throw unprocessable(`Pick a date within the next ${BOOKING_WINDOW_DAYS} days.`, "DATE_OUT_OF_RANGE");
    }

    const slots = await slotModel.listForAreaAndDate(db, areaId, date);
    return slots.map((s) => ({
      id: s.id,
      start: hhmm(s.start_time),
      end: hhmm(s.end_time),
      available: Math.max(0, s.capacity - s.booked),
      bookable: isSlotBookable(s, area.city),
    }));
  },
};
