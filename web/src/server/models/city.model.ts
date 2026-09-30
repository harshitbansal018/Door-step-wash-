import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { AreaRow, CityRow } from "../types/db";

export type AreaWithCity = AreaRow & { city: CityRow };
export type CityWithAreas = CityRow & { areas: (AreaRow & { pincodes: string[] })[] };

export const cityModel = {
  async findAreaByPincode(db: Db, pincode: string): Promise<AreaWithCity | null> {
    const row = check(
      await db
        .from("area_pincodes")
        .select("area:service_areas!inner(*, city:cities!inner(*))")
        .eq("pincode", pincode)
        .maybeSingle(),
    ) as { area: AreaWithCity } | null;
    return row?.area ?? null;
  },

  async findAreaById(db: Db, id: string): Promise<AreaWithCity | null> {
    return check(
      await db.from("service_areas").select("*, city:cities!inner(*)").eq("id", id).maybeSingle(),
    ) as AreaWithCity | null;
  },

  async findCityById(db: Db, id: string): Promise<CityRow | null> {
    return check(await db.from("cities").select("*").eq("id", id).maybeSingle()) as CityRow | null;
  },

  async listWithAreas(db: Db): Promise<CityWithAreas[]> {
    const rows = check(
      await db
        .from("cities")
        .select("*, areas:service_areas(*, pincodes:area_pincodes(pincode))")
        .order("name"),
    ) as (CityRow & { areas: (AreaRow & { pincodes: { pincode: string }[] })[] })[];
    return rows.map((c) => ({
      ...c,
      areas: c.areas
        .map((a) => ({ ...a, pincodes: a.pincodes.map((p) => p.pincode).sort() }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  async insertCity(db: Db, data: Partial<CityRow>) {
    return check(await db.from("cities").insert(data).select("*").single()) as CityRow;
  },

  async updateCity(db: Db, id: string, patch: Partial<CityRow>) {
    return check(await db.from("cities").update(patch).eq("id", id).select("*").single()) as CityRow;
  },

  async insertArea(db: Db, data: Partial<AreaRow>) {
    return check(await db.from("service_areas").insert(data).select("*").single()) as AreaRow;
  },

  async updateArea(db: Db, id: string, patch: Partial<AreaRow>) {
    return check(await db.from("service_areas").update(patch).eq("id", id).select("*").single()) as AreaRow;
  },

  async deleteArea(db: Db, id: string) {
    check(await db.from("service_areas").delete().eq("id", id));
  },

  async replacePincodes(db: Db, areaId: string, pincodes: string[]) {
    check(await db.from("area_pincodes").delete().eq("area_id", areaId));
    if (pincodes.length) {
      check(await db.from("area_pincodes").insert(pincodes.map((pincode) => ({ pincode, area_id: areaId }))));
    }
  },

  async findPincodeOwners(db: Db, pincodes: string[]) {
    return check(
      await db.from("area_pincodes").select("pincode, area_id").in("pincode", pincodes),
    ) as { pincode: string; area_id: string }[];
  },

  async addToWaitlist(db: Db, data: { email: string; pincode: string; city_id: string | null }) {
    check(await db.from("waitlist").upsert(data, { onConflict: "email,pincode", ignoreDuplicates: true }));
  },
};
