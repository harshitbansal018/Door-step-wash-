import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { CityServiceRow, ServiceRow, VehicleType } from "../types/db";

export const serviceModel = {
  async listAll(db: Db): Promise<ServiceRow[]> {
    return check(await db.from("services").select("*").order("sort_order")) as ServiceRow[];
  },

  async findById(db: Db, id: string): Promise<ServiceRow | null> {
    return check(await db.from("services").select("*").eq("id", id).maybeSingle()) as ServiceRow | null;
  },

  async pricesForCity(db: Db, cityId: string): Promise<CityServiceRow[]> {
    return check(await db.from("city_services").select("*").eq("city_id", cityId)) as CityServiceRow[];
  },

  async activePrices(db: Db): Promise<CityServiceRow[]> {
    return check(await db.from("city_services").select("*").eq("is_active", true)) as CityServiceRow[];
  },

  async findPrice(db: Db, cityId: string, serviceId: string, vehicleType: VehicleType) {
    return check(
      await db
        .from("city_services")
        .select("*")
        .eq("city_id", cityId)
        .eq("service_id", serviceId)
        .eq("vehicle_type", vehicleType)
        .maybeSingle(),
    ) as CityServiceRow | null;
  },

  async update(db: Db, id: string, patch: Partial<ServiceRow>) {
    return check(await db.from("services").update(patch).eq("id", id).select("*").single()) as ServiceRow;
  },

  async insert(db: Db, data: Partial<ServiceRow>) {
    return check(await db.from("services").insert(data).select("*").single()) as ServiceRow;
  },

  async delete(db: Db, id: string) {
    check(await db.from("services").delete().eq("id", id));
  },

  /** How many bookings and plans reference a service (deleting is blocked while any exist). */
  async usage(db: Db, id: string) {
    const [bookings, plans, bonusPlans] = await Promise.all([
      db.from("bookings").select("id", { count: "exact", head: true }).eq("service_id", id),
      db.from("plans").select("id", { count: "exact", head: true }).eq("service_id", id),
      db.from("plans").select("id", { count: "exact", head: true }).eq("bonus_service_id", id),
    ]);
    for (const r of [bookings, plans, bonusPlans]) if (r.error) throw r.error;
    return { bookings: bookings.count ?? 0, plans: (plans.count ?? 0) + (bonusPlans.count ?? 0) };
  },

  async deletePrice(db: Db, cityId: string, serviceId: string, vehicleType: VehicleType) {
    check(await db.from("city_services").delete().match({ city_id: cityId, service_id: serviceId, vehicle_type: vehicleType }));
  },

  async upsertPrices(db: Db, rows: CityServiceRow[]) {
    check(await db.from("city_services").upsert(rows, { onConflict: "city_id,service_id,vehicle_type" }));
  },
};
