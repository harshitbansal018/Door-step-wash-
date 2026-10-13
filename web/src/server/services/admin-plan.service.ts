import "server-only";
import type { z } from "zod";
import { conflict, notFound, unprocessable } from "../lib/errors";
import { uniqueSlug } from "../lib/slug";
import { createAdminClient } from "../lib/supabase";
import { planModel } from "../models/plan.model";
import { serviceModel } from "../models/service.model";
import { subscriptionModel } from "../models/subscription.model";
import type { PlanRow } from "../types/db";
import type { createPlanSchema, listSubscriptionsQuery, setPlanPricesSchema, updatePlanSchema } from "../validators/plan.validator";
import { presentSubscription } from "./subscription.service";

export const adminPlanService = {
  async plansWithPrices(cityId: string) {
    const db = createAdminClient();
    const [plans, prices, services] = await Promise.all([
      planModel.listAll(db),
      planModel.pricesForCity(db, cityId),
      serviceModel.listAll(db),
    ]);
    return plans.map((p) => ({
      ...p,
      service: services.find((s) => s.id === p.service_id)?.name ?? null,
      bonusService: p.bonus_service_id ? (services.find((s) => s.id === p.bonus_service_id)?.name ?? null) : null,
      prices: prices
        .filter((x) => x.plan_id === p.id)
        .map((x) => ({ vehicleType: x.vehicle_type, price: x.price, isActive: x.is_active })),
    }));
  },

  async assertService(id: string | null | undefined, label: string) {
    if (!id) return;
    const service = await serviceModel.findById(createAdminClient(), id);
    if (!service) throw unprocessable(`The ${label} service does not exist.`, "SERVICE_NOT_FOUND");
  },

  async createPlan(input: z.infer<typeof createPlanSchema>) {
    const db = createAdminClient();
    await Promise.all([this.assertService(input.serviceId, "base"), this.assertService(input.bonusServiceId, "bonus")]);
    const existing = await planModel.listAll(db);
    return planModel.insert(db, {
      slug: uniqueSlug(input.name, existing.map((p) => p.slug)),
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      service_id: input.serviceId,
      washes_per_month: input.washesPerMonth,
      bonus_service_id: input.bonusServiceId,
      bonus_count: input.bonusServiceId ? input.bonusCount : 0,
      features: input.features,
      is_popular: input.isPopular,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    });
  },

  async updatePlan(id: string, input: z.infer<typeof updatePlanSchema>) {
    const db = createAdminClient();
    const existing = await planModel.findById(db, id);
    if (!existing) throw notFound("Plan");
    await Promise.all([this.assertService(input.serviceId, "base"), this.assertService(input.bonusServiceId, "bonus")]);

    const bonusService = input.bonusServiceId !== undefined ? input.bonusServiceId : existing.bonus_service_id;
    const bonusCount = input.bonusCount !== undefined ? input.bonusCount : existing.bonus_count;
    if (bonusCount > 0 && !bonusService) {
      throw unprocessable("Choose a bonus service or set bonus visits to 0.", "NO_BONUS_SERVICE");
    }

    const patch: Partial<PlanRow> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.tagline !== undefined) patch.tagline = input.tagline;
    if (input.description !== undefined) patch.description = input.description;
    if (input.serviceId !== undefined) patch.service_id = input.serviceId;
    if (input.washesPerMonth !== undefined) patch.washes_per_month = input.washesPerMonth;
    if (input.bonusServiceId !== undefined) patch.bonus_service_id = input.bonusServiceId;
    patch.bonus_count = bonusService ? bonusCount : 0;
    if (input.features !== undefined) patch.features = input.features;
    if (input.isPopular !== undefined) patch.is_popular = input.isPopular;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    return planModel.update(db, id, patch);
  },

  /** Deletes a plan and its prices. Refused while any subscription references it: hide it instead. */
  async deletePlan(id: string) {
    const db = createAdminClient();
    if (!(await planModel.findById(db, id))) throw notFound("Plan");
    const subscriptions = await planModel.subscriptionCount(db, id);
    if (subscriptions > 0) {
      throw conflict(`${subscriptions} subscription(s) use this plan. Set it to hidden instead of deleting.`, "PLAN_IN_USE");
    }
    await planModel.delete(db, id);
  },

  /** Upserts prices; a price of 0 removes that vehicle's price for the city. */
  async setPrices(input: z.infer<typeof setPlanPricesSchema>) {
    const db = createAdminClient();
    const keep = input.prices.filter((p) => p.price > 0);
    const drop = input.prices.filter((p) => p.price === 0);
    if (keep.length) {
      await planModel.upsertPrices(
        db,
        keep.map((p) => ({
          city_id: input.cityId,
          plan_id: p.planId,
          vehicle_type: p.vehicleType,
          price: p.price,
          is_active: p.isActive,
        })),
      );
    }
    for (const p of drop) await planModel.deletePrice(db, input.cityId, p.planId, p.vehicleType);
    return this.plansWithPrices(input.cityId);
  },

  async listSubscriptions(q: z.infer<typeof listSubscriptionsQuery>) {
    const from = (q.page - 1) * q.pageSize;
    const { rows, total } = await subscriptionModel.list(createAdminClient(), {
      status: q.status,
      cityId: q.cityId,
      search: q.search,
      from,
      to: from + q.pageSize - 1,
    });
    return {
      items: rows.map((s) => ({
        ...presentSubscription(s),
        customer: { name: s.customer.full_name, email: s.customer.email, phone: s.customer.phone },
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  },

  /** Books upcoming plan visits now instead of waiting for the nightly job. */
  async runScheduler() {
    return { created: await subscriptionModel.schedule(createAdminClient(), 14) };
  },
};
