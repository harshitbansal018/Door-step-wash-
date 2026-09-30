import "server-only";
import { z } from "zod";
import { isoDate, pagination, pincode, search, trimmed, uuid, vehicleType } from "./common";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");
const money = z.number().int().min(0).max(100_000);
const bookingStatus = z.enum([
  "pending_payment",
  "confirmed",
  "assigned",
  "accepted",
  "on_the_way",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
]);

// ---------------------------------------------------------------- cities & areas
export const createCitySchema = z.object({
  name: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes.")
    .optional(),
  launchDate: isoDate.optional(),
  openTime: time.default("08:00"),
  closeTime: time.default("18:00"),
  slotMinutes: z.number().int().min(30).max(240).default(60),
  cancellationWindowMinutes: z.number().int().min(0).max(2880).default(120),
});

export const updateCitySchema = createCitySchema
  .omit({ slug: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

const pincodes = z.array(pincode).min(1, "Add at least one pincode.").max(200);

export const createAreaSchema = z.object({
  name: z.string().trim().min(2).max(80),
  extraCharge: money.default(0),
  pincodes,
});

export const updateAreaSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  extraCharge: money.optional(),
  isActive: z.boolean().optional(),
  pincodes: pincodes.optional(),
});

// ---------------------------------------------------------------- services, prices, slots
export const updateServiceSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: trimmed(300).optional(),
  durationMin: z.number().int().min(10).max(480).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(15).optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const setPricesSchema = z.object({
  cityId: uuid,
  prices: z
    .array(
      z.object({
        serviceId: uuid,
        vehicleType,
        price: z.number().int().min(1).max(100_000),
        isActive: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(200),
});

export const pricesQuery = z.object({ cityId: uuid });

export const generateSlotsSchema = z.object({ days: z.number().int().min(1).max(60).default(14) });

export const updateSlotSchema = z.object({
  capacity: z.number().int().min(0).max(50).optional(),
  isBlocked: z.boolean().optional(),
});

// ---------------------------------------------------------------- workers
export const createWorkerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  areaId: uuid,
  commissionRate: z.number().min(0).max(1).default(0.4),
});

export const updateWorkerSchema = z.object({
  status: z.enum(["pending_kyc", "active", "suspended"]).optional(),
  areaId: uuid.optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  bankLast4: z.string().regex(/^\d{4}$/).optional(),
});

export const listWorkersQuery = z.object({
  cityId: uuid.optional(),
  status: z.enum(["pending_kyc", "active", "suspended"]).optional(),
});

// ---------------------------------------------------------------- offers
const offerBase = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "3–30 letters, numbers, dashes or underscores."),
  title: z.string().trim().min(2).max(80),
  discountType: z.enum(["flat", "percent"]),
  value: z.number().int().min(1).max(100_000),
  maxDiscount: z.number().int().min(1).max(100_000).nullable().optional(),
  minOrder: money.default(0),
  cityIds: z.array(uuid).max(50).default([]),
  serviceIds: z.array(uuid).max(50).default([]),
  userType: z.enum(["all", "new"]).default("all"),
  validFrom: z.iso.datetime({ offset: true }),
  validTo: z.iso.datetime({ offset: true }),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perUserLimit: z.number().int().min(1).max(100).default(1),
  autoApply: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const offerRules = <T extends z.ZodType<{ discountType?: string; value?: number; validFrom?: string; validTo?: string }>>(s: T) =>
  s
    .refine((o) => o.discountType !== "percent" || (o.value ?? 0) <= 100, {
      message: "A percentage can't be more than 100.",
      path: ["value"],
    })
    .refine((o) => !o.validFrom || !o.validTo || new Date(o.validTo) > new Date(o.validFrom), {
      message: "End date must be after the start date.",
      path: ["validTo"],
    });

export const createOfferSchema = offerRules(offerBase);
export const updateOfferSchema = offerRules(offerBase.partial());

// ---------------------------------------------------------------- bookings, money
export const listBookingsQuery = pagination.extend({
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",") : undefined))
    .pipe(z.array(bookingStatus).optional()),
  cityId: uuid.optional(),
  date: isoDate.optional(),
  search,
});

export const assignSchema = z.object({ workerId: uuid });

export const adminCancelSchema = z.object({
  reason: z.string().trim().min(3).max(300),
  refund: z.boolean().default(true),
});

export const refundSchema = z.object({
  bookingId: uuid,
  amount: z.number().int().min(1),
  reason: z.string().trim().min(3).max(300),
});

export const payoutsQuery = z.object({ status: z.enum(["pending", "paid"]).optional() });

export const markPayoutPaidSchema = z.object({ reference: z.string().trim().min(4).max(60) });

export const updateUserSchema = z.object({ isBlocked: z.boolean() });

export const listUsersQuery = pagination.extend({
  role: z.enum(["customer", "worker", "admin"]).optional(),
  search,
});
