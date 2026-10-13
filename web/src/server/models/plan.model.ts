import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { CityPlanRow, PlanRow, VehicleType } from "../types/db";

export const planModel = {
  async listAll(db: Db): Promise<PlanRow[]> {
    return check(await db.from("plans").select("*").order("sort_order")) as PlanRow[];
  },

  async findById(db: Db, id: string): Promise<PlanRow | null> {
    return check(await db.from("plans").select("*").eq("id", id).maybeSingle()) as PlanRow | null;
  },

  async pricesForCity(db: Db, cityId: string): Promise<CityPlanRow[]> {
    return check(await db.from("city_plans").select("*").eq("city_id", cityId)) as CityPlanRow[];
  },

  async activePrices(db: Db): Promise<CityPlanRow[]> {
    return check(await db.from("city_plans").select("*").eq("is_active", true)) as CityPlanRow[];
  },

  async findPrice(db: Db, cityId: string, planId: string, vehicleType: VehicleType): Promise<CityPlanRow | null> {
    return check(
      await db
        .from("city_plans")
        .select("*")
        .eq("city_id", cityId)
        .eq("plan_id", planId)
        .eq("vehicle_type", vehicleType)
        .maybeSingle(),
    ) as CityPlanRow | null;
  },

  async update(db: Db, id: string, patch: Partial<PlanRow>): Promise<PlanRow> {
    return check(await db.from("plans").update(patch).eq("id", id).select("*").single()) as PlanRow;
  },

  async upsertPrices(db: Db, rows: CityPlanRow[]) {
    check(await db.from("city_plans").upsert(rows, { onConflict: "city_id,plan_id,vehicle_type" }));
  },

  async deletePrice(db: Db, cityId: string, planId: string, vehicleType: VehicleType) {
    check(await db.from("city_plans").delete().match({ city_id: cityId, plan_id: planId, vehicle_type: vehicleType }));
  },

  async insert(db: Db, data: Partial<PlanRow>): Promise<PlanRow> {
    return check(await db.from("plans").insert(data).select("*").single()) as PlanRow;
  },

  async delete(db: Db, id: string) {
    check(await db.from("plans").delete().eq("id", id));
  },

  /** Subscriptions referencing a plan (deleting is blocked while any exist). */
  async subscriptionCount(db: Db, id: string) {
    const { count, error } = await db.from("subscriptions").select("id", { count: "exact", head: true }).eq("plan_id", id);
    if (error) throw error;
    return count ?? 0;
  },
};
