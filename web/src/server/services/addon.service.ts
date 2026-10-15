import "server-only";
import type { z } from "zod";
import { notFound, unprocessable } from "../lib/errors";
import { createAdminClient, type Db } from "../lib/supabase";
import { addonModel } from "../models/addon.model";
import type { AddonRow, BookingAddon, VehicleType } from "../types/db";
import type { createAddonSchema } from "../validators/admin.validator";

type AddonInput = z.infer<typeof createAddonSchema>;

const fitsVehicle = (addon: AddonRow, vehicleType: VehicleType) =>
  !addon.vehicle_types.length || addon.vehicle_types.includes(vehicleType);

function toRow(input: Partial<AddonInput>): Partial<AddonRow> {
  const row: Partial<AddonRow> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.price !== undefined) row.price = input.price;
  if (input.durationMin !== undefined) row.duration_min = input.durationMin;
  if (input.vehicleTypes !== undefined) row.vehicle_types = input.vehicleTypes;
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  return row;
}

export const addonService = {
  /** Active add-ons for the booking screen. Empty (not an error) before the add-ons migration runs. */
  async listPublic() {
    try {
      const rows = await addonModel.listAll(createAdminClient());
      return rows
        .filter((a) => a.is_active)
        .map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          price: a.price,
          durationMin: a.duration_min,
          vehicleTypes: a.vehicle_types,
        }));
    } catch {
      return [];
    }
  },

  /** Checks the chosen add-ons and returns the snapshot saved on the booking. */
  async resolve(db: Db, ids: string[], vehicleType: VehicleType): Promise<{ addons: BookingAddon[]; total: number }> {
    const unique = [...new Set(ids)];
    if (!unique.length) return { addons: [], total: 0 };
    const rows = await addonModel.findByIds(db, unique);
    const usable = rows.filter((a) => a.is_active && fitsVehicle(a, vehicleType));
    if (usable.length !== unique.length) {
      throw unprocessable("One of the selected add-ons is no longer available. Please review your extras.", "ADDON_UNAVAILABLE");
    }
    const addons = usable
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({ id: a.id, name: a.name, price: a.price }));
    return { addons, total: addons.reduce((sum, a) => sum + a.price, 0) };
  },

  // ------------------------------------------------------------ admin
  async listAll() {
    return addonModel.listAll(createAdminClient());
  },

  async create(input: AddonInput) {
    return addonModel.insert(createAdminClient(), toRow(input));
  },

  async update(id: string, input: Partial<AddonInput>) {
    const row = await addonModel.update(createAdminClient(), id, toRow(input));
    if (!row) throw notFound("Add-on");
    return row;
  },

  /** Old bookings keep their own copy, so deleting an add-on is always safe. */
  async delete(id: string) {
    await addonModel.delete(createAdminClient(), id);
  },
};
