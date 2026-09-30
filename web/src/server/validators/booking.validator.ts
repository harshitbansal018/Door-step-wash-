import "server-only";
import { z } from "zod";
import { isoDate, pagination, phone, pincode, trimmed, uuid, vehicleType } from "./common";

const offerCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,30}$/, "Enter a valid coupon code.");

export const coverageQuery = z.object({ pincode });
export const catalogQuery = z.object({ areaId: uuid });
export const slotsQuery = z.object({ areaId: uuid, date: isoDate });
export const waitlistSchema = z.object({ email: z.email().trim().toLowerCase(), pincode });

export const validateOfferSchema = z.object({
  code: offerCode,
  pincode,
  serviceId: uuid,
  vehicleType,
});

export const createBookingSchema = z.object({
  serviceId: uuid,
  vehicleType,
  vehicleMakeModel: z.string().trim().min(2, "Enter your car's make and model.").max(80),
  vehiclePlate: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Enter the registration number.")
    .max(15)
    .regex(/^[A-Z0-9 -]+$/, "Use letters, numbers and spaces only."),
  slotId: uuid,
  pincode,
  addressLine: z.string().trim().min(5, "Enter your full address.").max(200),
  landmark: trimmed(100).optional(),
  parkingType: z.enum(["basement", "open", "covered", "street"]),
  parkingSpot: trimmed(60).optional(),
  carAccess: z.enum(["customer_present", "key_with_security", "no_access"]),
  contactName: z.string().trim().min(2, "Enter your name.").max(80),
  contactPhone: phone,
  notes: trimmed(500).optional(),
  offerCode: offerCode.optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(5).max(64),
  paymentId: z.string().min(5).max(64),
  signature: z.string().regex(/^[a-f0-9]{64}$/, "Invalid signature."),
});

export const cancelBookingSchema = z.object({ reason: trimmed(300).optional() });
export const rescheduleSchema = z.object({ slotId: uuid });
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: trimmed(1000).optional(),
});

export const myBookingsQuery = pagination.extend({
  scope: z.enum(["upcoming", "past", "all"]).default("all"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
