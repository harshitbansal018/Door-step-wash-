import "server-only";
import { z } from "zod";
import { pagination, phone, pincode, search, trimmed, uuid, vehicleType } from "./common";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");
const weekday = z.number().int().min(0, "Pick a day of the week.").max(6);

export const plansQuery = z.object({ areaId: uuid.optional() });
export const planOptionsQuery = z.object({ pincode });

export const planQuoteSchema = z.object({ planId: uuid, pincode, vehicleType });

export const startSubscriptionSchema = z.object({
  planId: uuid,
  vehicleType,
  vehicleMakeModel: z.string().trim().min(2, "Enter your vehicle's make and model.").max(80),
  vehiclePlate: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Enter the registration number.")
    .max(15)
    .regex(/^[A-Z0-9 -]+$/, "Use letters, numbers and spaces only."),
  pincode,
  addressLine: z.string().trim().min(5, "Enter your full address.").max(200),
  landmark: trimmed(100).optional(),
  parkingType: z.enum(["basement", "open", "covered", "street"]),
  parkingSpot: trimmed(60).optional(),
  carAccess: z.enum(["customer_present", "key_with_security", "no_access"]),
  contactName: z.string().trim().min(2, "Enter your name.").max(80),
  contactPhone: phone,
  notes: trimmed(500).optional(),
  weekday,
  startTime: time,
});

export const changeVisitSchema = z.object({ weekday, startTime: time });
export const cancelSubscriptionSchema = z.object({ reason: trimmed(300).optional() });

// ---------------------------------------------------------------- admin
export const createPlanSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    tagline: trimmed(120).default(""),
    description: trimmed(300).default(""),
    serviceId: uuid,
    washesPerMonth: z.number().int().min(1).max(31),
    bonusServiceId: uuid.nullable().default(null),
    bonusCount: z.number().int().min(0).max(4).default(0),
    features: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
    isPopular: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .refine((p) => p.bonusServiceId || p.bonusCount === 0, {
    message: "Choose a bonus service or set bonus visits to 0.",
    path: ["bonusCount"],
  });

export const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  tagline: trimmed(120).optional(),
  description: trimmed(300).optional(),
  serviceId: uuid.optional(),
  washesPerMonth: z.number().int().min(1).max(31).optional(),
  bonusServiceId: uuid.nullable().optional(),
  bonusCount: z.number().int().min(0).max(4).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(15).optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const setPlanPricesSchema = z.object({
  cityId: uuid,
  prices: z
    .array(
      z.object({
        planId: uuid,
        vehicleType,
        /** 0 removes the price for that vehicle type. */
        price: z.number().int().min(0).max(1_000_000),
        isActive: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(200),
});

export const planPricesQuery = z.object({ cityId: uuid });

export const listSubscriptionsQuery = pagination.extend({
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",") : undefined))
    .pipe(z.array(z.enum(["pending_payment", "active", "paused", "cancelled", "expired"])).optional()),
  cityId: uuid.optional(),
  search,
});

export type StartSubscriptionInput = z.infer<typeof startSubscriptionSchema>;
