import "server-only";
import type { NextRequest } from "next/server";
import { withAuth } from "../middlewares/auth.middleware";
import { toErrorResponse } from "../middlewares/error.middleware";
import { ok } from "../lib/response";
import { paymentService } from "../services/payment.service";
import { verifyPaymentSchema } from "../validators/booking.validator";
import { readJson } from "../validators/common";

export const paymentController = {
  /** Browser callback after Razorpay checkout succeeds. */
  verify: withAuth(["customer"], async (req, auth) =>
    ok(await paymentService.verifyCheckout(auth.userId, await readJson(req, verifyPaymentSchema))),
  ),

  /** Razorpay → server. Authenticated by signature, not by session or origin. */
  async razorpayWebhook(req: NextRequest) {
    try {
      const raw = await req.text();
      const result = await paymentService.handleWebhook(
        raw,
        req.headers.get("x-razorpay-signature"),
        req.headers.get("x-razorpay-event-id"),
      );
      return ok(result);
    } catch (err) {
      return toErrorResponse(err);
    }
  },
};
