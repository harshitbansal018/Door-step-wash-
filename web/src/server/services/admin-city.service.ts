import "server-only";
import type { z } from "zod";
import { conflict, notFound } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { cityModel } from "../models/city.model";
import { slotModel } from "../models/slot.model";
import type { AreaRow, CityRow } from "../types/db";
import type {
  createAreaSchema,
  createCitySchema,
  updateAreaSchema,
  updateCitySchema,
} from "../validators/admin.validator";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function assertPincodesFree(pincodes: string[], areaId?: string) {
  const owners = await cityModel.findPincodeOwners(createAdminClient(), pincodes);
  const taken = owners.filter((o) => o.area_id !== areaId).map((o) => o.pincode);
  if (taken.length) throw conflict(`Already used by another area: ${taken.join(", ")}`, "PINCODE_TAKEN");
}

export const adminCityService = {
  list() {
    return cityModel.listWithAreas(createAdminClient());
  },

  async create(input: z.infer<typeof createCitySchema>) {
    return cityModel.insertCity(createAdminClient(), {
      name: input.name,
      state: input.state,
      slug: input.slug ?? slugify(input.name),
      launch_date: input.launchDate ?? null,
      open_time: input.openTime,
      close_time: input.closeTime,
      slot_minutes: input.slotMinutes,
      cancellation_window_minutes: input.cancellationWindowMinutes,
      is_active: false,
    });
  },

  async update(id: string, input: z.infer<typeof updateCitySchema>) {
    const db = createAdminClient();
    if (!(await cityModel.findCityById(db, id))) throw notFound("City");
    const patch: Partial<CityRow> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.state !== undefined) patch.state = input.state;
    if (input.launchDate !== undefined) patch.launch_date = input.launchDate;
    if (input.openTime !== undefined) patch.open_time = input.openTime;
    if (input.closeTime !== undefined) patch.close_time = input.closeTime;
    if (input.slotMinutes !== undefined) patch.slot_minutes = input.slotMinutes;
    if (input.cancellationWindowMinutes !== undefined) patch.cancellation_window_minutes = input.cancellationWindowMinutes;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const city = await cityModel.updateCity(db, id, patch);
    // Turning a city on opens its booking calendar straight away.
    if (input.isActive) await slotModel.generate(db, 14);
    return city;
  },

  async addArea(cityId: string, input: z.infer<typeof createAreaSchema>) {
    const db = createAdminClient();
    if (!(await cityModel.findCityById(db, cityId))) throw notFound("City");
    const pincodes = [...new Set(input.pincodes)];
    await assertPincodesFree(pincodes);
    const area = await cityModel.insertArea(db, { city_id: cityId, name: input.name, extra_charge: input.extraCharge });
    await cityModel.replacePincodes(db, area.id, pincodes);
    await slotModel.generate(db, 14);
    return { ...area, pincodes };
  },

  async updateArea(areaId: string, input: z.infer<typeof updateAreaSchema>) {
    const db = createAdminClient();
    if (!(await cityModel.findAreaById(db, areaId))) throw notFound("Area");
    const patch: Partial<AreaRow> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.extraCharge !== undefined) patch.extra_charge = input.extraCharge;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    if (input.pincodes) {
      const pincodes = [...new Set(input.pincodes)];
      await assertPincodesFree(pincodes, areaId);
      await cityModel.replacePincodes(db, areaId, pincodes);
    }
    const area = Object.keys(patch).length ? await cityModel.updateArea(db, areaId, patch) : undefined;
    if (input.isActive) await slotModel.generate(db, 14);
    return area ?? (await cityModel.findAreaById(db, areaId));
  },

  /** Areas with bookings can't be deleted (the database refuses); switch them off instead. */
  async deleteArea(areaId: string) {
    const db = createAdminClient();
    if (!(await cityModel.findAreaById(db, areaId))) throw notFound("Area");
    await cityModel.deleteArea(db, areaId);
  },
};
