import "server-only";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { fail } from "../lib/response";

// Messages raised by SQL functions (`raise exception 'SLOT_FULL'`) mapped to API errors.
const DB_ERRORS: Record<string, { status: number; message: string }> = {
  SLOT_FULL: { status: 409, message: "That time slot was just taken. Please pick another." },
  SLOT_NOT_FOUND: { status: 404, message: "Time slot not found." },
  SLOT_AREA_MISMATCH: { status: 422, message: "That slot is not in your area." },
  BOOKING_NOT_FOUND: { status: 404, message: "Booking not found." },
  PAYMENT_NOT_FOUND: { status: 404, message: "Payment not found." },
};

function isDbError(err: unknown): err is { message: string; code?: string; details?: string } {
  return typeof err === "object" && err !== null && "message" in err && "code" in err;
}

/** Converts any thrown value into a JSON error response. Never leaks internals. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return fail(err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    return fail(422, "VALIDATION_ERROR", "Please check the highlighted fields.", { fields });
  }

  if (err instanceof SyntaxError) {
    return fail(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (isDbError(err)) {
    const known = DB_ERRORS[err.message];
    if (known) return fail(known.status, err.message, known.message);
    if (err.code === "23505") return fail(409, "DUPLICATE", "This already exists.");
    if (err.code === "23503") return fail(409, "IN_USE", "This is linked to other records.");
  }

  console.error("[api] unhandled error", err);
  return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
