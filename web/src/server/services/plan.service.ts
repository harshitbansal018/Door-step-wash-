import "server-only";
import { notFound, unprocessable } from "../lib/errors";
import { createUserClient, type Db } from "../lib/supabase";
import { hhmm } from "../lib/time";
import { cityModel } from "../models/city.model";
import { planModel } from "../models/plan.model";
import { serviceModel } from "../models/service.model";
import type { CityPlanRow, CityRow, CityServiceRow, PlanRow, ServiceRow, VehicleType } from "../types/db";
import { coverageService } from "./coverage.service";

const VEHICLE_TYPES: VehicleType[] = ["hatchback", "sedan", "suv", "bike"];

/** Slot start times a city offers, derived from its opening hours. */
export function slotStarts(city: Pick<CityRow, "open_time" | "close_time" | "slot_minutes">): string[] {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const starts: string[] = [];
  for (let t = toMin(city.open_time); t + city.slot_minutes <= toMin(city.close_time); t += city.slot_minutes) {
    starts.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return starts;
}

/** What the plan's visits would cost when booked one by one, per vehicle type. */
function listPrices(plan: PlanRow, servicePrices: CityServiceRow[]) {
  const out: Partial<Record<VehicleType, number>> = {};
  for (const vehicle of VEHICLE_TYPES) {
    const base = servicePrices.find((p) => p.service_id === plan.service_id && p.vehicle_type === vehicle && p.is_active);
    if (!base) continue;
    let total = base.price * plan.washes_per_month;
    if (plan.bonus_service_id && plan.bonus_count > 0) {
      const bonus = servicePrices.find((p) => p.service_id === plan.bonus_service_id && p.vehicle_type === vehicle && p.is_active);
      if (!bonus) continue;
      total += bonus.price * plan.bonus_count;
    }
    out[vehicle] = total;
  }
  return out;
}

function present(plan: PlanRow, services: ServiceRow[], planPrices: CityPlanRow[], servicePrices: CityServiceRow[]) {
  const service = services.find((s) => s.id === plan.service_id);
  const bonus = plan.bonus_service_id ? services.find((s) => s.id === plan.bonus_service_id) : null;
  const prices = planPrices.filter((p) => p.plan_id === plan.id && p.is_active);
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    description: plan.description,
    washesPerMonth: plan.washes_per_month,
    bonusCount: plan.bonus_count,
    visitsPerMonth: plan.washes_per_month + plan.bonus_count,
    service: { id: plan.service_id, name: service?.name ?? "Wash" },
    bonusService: bonus ? { id: bonus.id, name: bonus.name } : null,
    features: plan.features,
    isPopular: plan.is_popular,
    prices: Object.fromEntries(prices.map((p) => [p.vehicle_type, p.price])) as Partial<Record<VehicleType, number>>,
    listPrices: listPrices(plan, servicePrices),
  };
}

export const planService = {
  /** Active plans; with an area, priced for that area's city. */
  async list(areaId?: string) {
    const db = await createUserClient();
    const [plans, services] = await Promise.all([planModel.listAll(db), serviceModel.listAll(db)]);
    let planPrices: CityPlanRow[] = [];
    let servicePrices: CityServiceRow[] = [];
    if (areaId) {
      const area = await cityModel.findAreaById(db, areaId);
      if (!area || !area.is_active || !area.city.is_active) throw notFound("Service area");
      [planPrices, servicePrices] = await Promise.all([
        planModel.pricesForCity(db, area.city_id),
        serviceModel.pricesForCity(db, area.city_id),
      ]);
    }
    return plans
      .filter((p) => p.is_active)
      .map((p) => present(p, services, planPrices, servicePrices))
      .filter((p) => !areaId || Object.keys(p.prices).length > 0);
  },

  /** Where and when a plan can run for a pincode: the area and the weekly start times on offer. */
  async options(pincode: string) {
    const area = await coverageService.assertServed(pincode);
    return {
      city: { id: area.city.id, name: area.city.name },
      area: { id: area.id, name: area.name, extraCharge: area.extra_charge },
      startTimes: slotStarts(area.city),
      slotMinutes: area.city.slot_minutes,
    };
  },

  /** The only place a plan price is calculated. */
  async quote(db: Db, input: { cityId: string; areaCharge: number; planId: string; vehicleType: VehicleType }) {
    const [plan, price, servicePrices] = await Promise.all([
      planModel.findById(db, input.planId),
      planModel.findPrice(db, input.cityId, input.planId, input.vehicleType),
      serviceModel.pricesForCity(db, input.cityId),
    ]);
    if (!plan?.is_active || !price?.is_active) {
      throw unprocessable("This plan isn't available for your vehicle in this city.", "PLAN_UNAVAILABLE");
    }
    const visits = plan.washes_per_month + plan.bonus_count;
    const areaCharge = input.areaCharge * visits;
    return {
      plan,
      planPrice: price.price,
      areaCharge,
      total: price.price + areaCharge,
      visits,
      perVisit: Math.round((price.price + areaCharge) / visits),
      listPrice: listPrices(plan, servicePrices)[input.vehicleType] ?? null,
    };
  },

  /** Human label for a weekly visit, e.g. "Saturday at 10:30". */
  visitLabel(weekday: number, start: string) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `${days[weekday] ?? "Week"} at ${hhmm(start)}`;
  },
};
