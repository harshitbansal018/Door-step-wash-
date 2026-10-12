import "server-only";
import type { z } from "zod";
import { conflict, notFound, unprocessable } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { serviceModel } from "../models/service.model";
import { slotModel } from "../models/slot.model";
import type { ServiceRow, SlotRow } from "../types/db";
import type { createSlotSchema, setPricesSchema, updateServiceSchema, updateSlotSchema } from "../validators/admin.validator";

export const adminCatalogService = {
  async slots(areaId: string, date: string) {
    return slotModel.listForAreaAndDate(createAdminClient(), areaId, date);
  },

  async servicesWithPrices(cityId: string) {
    const db = createAdminClient();
    const [services, prices] = await Promise.all([serviceModel.listAll(db), serviceModel.pricesForCity(db, cityId)]);
    return services.map((s) => ({
      ...s,
      prices: prices
        .filter((p) => p.service_id === s.id)
        .map((p) => ({ vehicleType: p.vehicle_type, price: p.price, isActive: p.is_active })),
    }));
  },

  async updateService(id: string, input: z.infer<typeof updateServiceSchema>) {
    const db = createAdminClient();
    if (!(await serviceModel.findById(db, id))) throw notFound("Service");
    const patch: Partial<ServiceRow> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.durationMin !== undefined) patch.duration_min = input.durationMin;
    if (input.features !== undefined) patch.features = input.features;
    if (input.isPopular !== undefined) patch.is_popular = input.isPopular;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    return serviceModel.update(db, id, patch);
  },

  async setPrices(input: z.infer<typeof setPricesSchema>) {
    await serviceModel.upsertPrices(
      createAdminClient(),
      input.prices.map((p) => ({
        city_id: input.cityId,
        service_id: p.serviceId,
        vehicle_type: p.vehicleType,
        price: p.price,
        is_active: p.isActive,
      })),
    );
    return this.servicesWithPrices(input.cityId);
  },

  async generateSlots(days: number) {
    return { created: await slotModel.generate(createAdminClient(), days) };
  },

  async createSlot(input: z.infer<typeof createSlotSchema>) {
    return slotModel.insert(createAdminClient(), {
      area_id: input.areaId,
      slot_date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      capacity: input.capacity,
      is_blocked: input.isBlocked,
    });
  },

  async updateSlot(id: string, input: z.infer<typeof updateSlotSchema>) {
    const db = createAdminClient();
    const existing = await slotModel.findById(db, id);
    if (!existing) throw notFound("Slot");
    const scheduleChanged =
      (input.areaId !== undefined && input.areaId !== existing.area_id) ||
      (input.date !== undefined && input.date !== existing.slot_date) ||
      (input.startTime !== undefined && input.startTime !== existing.start_time.slice(0, 5)) ||
      (input.endTime !== undefined && input.endTime !== existing.end_time.slice(0, 5));
    if (scheduleChanged && await slotModel.bookingCount(db, id)) {
      throw conflict("A slot with booking history cannot be moved or retimed. Block it and create a new slot instead.", "SLOT_IN_USE");
    }
    const merged = { ...existing, area_id: input.areaId ?? existing.area_id, slot_date: input.date ?? existing.slot_date, start_time: input.startTime ?? existing.start_time, end_time: input.endTime ?? existing.end_time, capacity: input.capacity ?? existing.capacity };
    if (merged.end_time <= merged.start_time) throw unprocessable("End time must be after start time.", "INVALID_SLOT_TIME");
    if (merged.capacity < existing.booked) throw unprocessable(`Capacity cannot be lower than ${existing.booked} existing booking(s).`, "INVALID_CAPACITY");
    const patch: Partial<SlotRow> = {};
    if (input.areaId !== undefined) patch.area_id = input.areaId;
    if (input.date !== undefined) patch.slot_date = input.date;
    if (input.startTime !== undefined) patch.start_time = input.startTime;
    if (input.endTime !== undefined) patch.end_time = input.endTime;
    if (input.capacity !== undefined) patch.capacity = input.capacity;
    if (input.isBlocked !== undefined) patch.is_blocked = input.isBlocked;
    return slotModel.update(db, id, patch);
  },

  async deleteSlot(id: string) {
    const db = createAdminClient();
    if (!(await slotModel.findById(db, id))) throw notFound("Slot");
    if (await slotModel.bookingCount(db, id)) {
      throw conflict("A slot with booking history cannot be deleted. Block it instead.", "SLOT_IN_USE");
    }
    await slotModel.delete(db, id);
  },
};
