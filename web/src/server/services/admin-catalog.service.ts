import "server-only";
import type { z } from "zod";
import { notFound } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { serviceModel } from "../models/service.model";
import { slotModel } from "../models/slot.model";
import type { ServiceRow } from "../types/db";
import type { setPricesSchema, updateServiceSchema, updateSlotSchema } from "../validators/admin.validator";

export const adminCatalogService = {
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

  async updateSlot(id: string, input: z.infer<typeof updateSlotSchema>) {
    const db = createAdminClient();
    if (!(await slotModel.findById(db, id))) throw notFound("Slot");
    return slotModel.update(db, id, {
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.isBlocked !== undefined && { is_blocked: input.isBlocked }),
    });
  },
};
