import "server-only";
import type { z } from "zod";
import { notFound, unprocessable } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";
import { offerModel } from "../models/offer.model";
import type { OfferRow } from "../types/db";
import type { createOfferSchema, updateOfferSchema } from "../validators/admin.validator";

type OfferInput = Partial<z.infer<typeof createOfferSchema>>;

function toRow(input: OfferInput): Partial<OfferRow> {
  const row: Partial<OfferRow> = {};
  if (input.code !== undefined) row.code = input.code;
  if (input.title !== undefined) row.title = input.title;
  if (input.discountType !== undefined) row.discount_type = input.discountType;
  if (input.value !== undefined) row.value = input.value;
  if (input.maxDiscount !== undefined) row.max_discount = input.maxDiscount;
  if (input.minOrder !== undefined) row.min_order = input.minOrder;
  if (input.cityIds !== undefined) row.city_ids = input.cityIds;
  if (input.serviceIds !== undefined) row.service_ids = input.serviceIds;
  if (input.userType !== undefined) row.user_type = input.userType;
  if (input.validFrom !== undefined) row.valid_from = input.validFrom;
  if (input.validTo !== undefined) row.valid_to = input.validTo;
  if (input.usageLimit !== undefined) row.usage_limit = input.usageLimit;
  if (input.perUserLimit !== undefined) row.per_user_limit = input.perUserLimit;
  if (input.autoApply !== undefined) row.auto_apply = input.autoApply;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  return row;
}

export const adminOfferService = {
  list() {
    return offerModel.list(createAdminClient());
  },

  create(adminId: string, input: z.infer<typeof createOfferSchema>) {
    if (input.discountType === "flat" && input.maxDiscount) {
      throw unprocessable("A maximum discount only applies to percentage offers.", "INVALID_OFFER");
    }
    return offerModel.insert(createAdminClient(), { ...toRow(input), created_by: adminId });
  },

  async update(id: string, input: z.infer<typeof updateOfferSchema>) {
    const db = createAdminClient();
    const existing = await offerModel.findById(db, id);
    if (!existing) throw notFound("Offer");

    const merged = { ...existing, ...toRow(input) };
    if (merged.discount_type === "percent" && merged.value > 100) {
      throw unprocessable("A percentage can't be more than 100.", "INVALID_OFFER");
    }
    if (new Date(merged.valid_to) <= new Date(merged.valid_from)) {
      throw unprocessable("End date must be after the start date.", "INVALID_OFFER");
    }
    return offerModel.update(db, id, toRow(input));
  },
};
