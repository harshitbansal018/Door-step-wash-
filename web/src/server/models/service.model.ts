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

  async upsertPrices(db: Db, rows: CityServiceRow[]) {
    check(await db.from("city_services").upsert(rows, { onConflict: "city_id,service_id,vehicle_type" }));
  },
};
