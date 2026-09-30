import "server-only";
import { BRAND } from "@/lib/config";
import { AppError, badRequest, forbidden, notFound, unprocessable } from "../lib/errors";
import { razorpay } from "../lib/razorpay";
import { createAdminClient } from "../lib/supabase";
import { formatSlot } from "../lib/time";
import { bookingModel } from "../models/booking.model";
import { paymentModel } from "../models/payment.model";
import { userModel } from "../models/user.model";
import type { BookingRow, PaymentRow } from "../types/db";
import { notificationService } from "./notification.service";

async function notifyConfirmed(bookingId: string) {
  const db = createAdminClient();
  const booking = await bookingModel.findDetail(db, bookingId);
  if (!booking) return;
  const customer = await userModel.findById(db, booking.customer_id);
  if (!customer) return;
  await notificationService.bookingConfirmed({
    to: customer.email,
    name: booking.contact_name,
    code: booking.code,
    service: booking.service.name,
    when: formatSlot(booking.slot_date, booking.slot_start, booking.slot_end),
    address: `${booking.address_line}, ${booking.area.name}, ${booking.city.name}`,
    total: booking.total,
  });
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  method?: string;
  error_description?: string;
}

interface RazorpayRefundEntity {
  id: string;
  status: string;
}

export const paymentService = {
  /** Creates the Razorpay order for a pending booking and returns checkout options. */
  async startCheckout(booking: BookingRow, customer: { name: string; email: string; phone: string }) {
    const db = createAdminClient();
    const order = await razorpay.createOrder(booking.total, booking.code, { booking_id: booking.id });
    await paymentModel.insert(db, {
      booking_id: booking.id,
      provider_order_id: order.id,
      amount: booking.total,
      currency: order.currency,
    });
    return {
      provider: "razorpay" as const,
      keyId: razorpay.keyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: BRAND.name,
      description: `Booking ${booking.code}`,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
    };
  },

  /** Called by the browser right after checkout. The webhook confirms it too; both are idempotent. */
  async verifyCheckout(customerId: string, input: { orderId: string; paymentId: string; signature: string }) {
    if (!razorpay.verifyCheckoutSignature(input.orderId, input.paymentId, input.signature)) {
      throw badRequest("Payment could not be verified.", "INVALID_SIGNATURE");
    }
    const db = createAdminClient();
    const payment = await paymentModel.findByOrderId(db, input.orderId);
    if (!payment) throw notFound("Payment");
    const booking = await bookingModel.findById(db, payment.booking_id);
    if (!booking || booking.customer_id !== customerId) throw forbidden();

    return this.applyCapture(input.orderId, input.paymentId, null, null);
  },

  async applyCapture(orderId: string, paymentId: string, method: string | null, raw: unknown) {
    const db = createAdminClient();
    const result = await paymentModel.confirm(db, orderId, paymentId, method, raw);

    if (result.needs_refund) {
      const payment = await paymentModel.findByOrderId(db, orderId);
      if (payment) await this.refund(payment, payment.amount, "Slot unavailable after payment", null);
    } else if (!result.already && result.status === "confirmed") {
      await notifyConfirmed(result.booking_id);
    }
    return { bookingId: result.booking_id, status: result.status, refunded: result.needs_refund };
  },

  /** Razorpay webhook: signature-checked, deduplicated by event id. */
  async handleWebhook(rawBody: string, signature: string | null, eventId: string | null) {
    if (!signature || !razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw badRequest("Invalid webhook signature.", "INVALID_SIGNATURE");
    }
    const event = JSON.parse(rawBody) as {
      event: string;
      payload: { payment?: { entity: RazorpayPaymentEntity }; refund?: { entity: RazorpayRefundEntity } };
    };

    const db = createAdminClient();
    if (eventId && !(await paymentModel.claimWebhookEvent(db, eventId, "razorpay", event.event))) {
      return { duplicate: true };
    }

    const pay = event.payload.payment?.entity;
    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        if (!pay) break;
        const record = await paymentModel.findByOrderId(db, pay.order_id);
        if (!record) break; // Not one of our orders.
        if (pay.amount !== record.amount * 100) {
          console.error("[payments] amount mismatch", pay.order_id, pay.amount, record.amount);
          break;
        }
        await this.applyCapture(pay.order_id, pay.id, pay.method ?? null, event.payload);
        break;
      }
      case "payment.failed": {
        if (pay) await paymentModel.markFailed(db, pay.order_id, pay.error_description ?? "Payment failed", event.payload);
        break;
      }
      case "refund.processed":
      case "refund.failed": {
        const refund = event.payload.refund?.entity;
        if (refund) {
          const { error } = await db
            .from("refunds")
            .update({ status: event.event === "refund.processed" ? "processed" : "failed" })
            .eq("provider_refund_id", refund.id);
          if (error) throw error;
        }
        break;
      }
    }
    return { duplicate: false };
  },

  /** Refunds part or all of a captured payment. */
  async refund(payment: PaymentRow, amount: number, reason: string, actorId: string | null) {
    const db = createAdminClient();
    if (!payment.provider_payment_id || !["captured", "partially_refunded"].includes(payment.status)) {
      throw unprocessable("This payment can't be refunded.", "NOT_REFUNDABLE");
    }
    const alreadyRefunded = await paymentModel.refundedTotal(db, payment.id);
    const refundable = payment.amount - alreadyRefunded;
    if (amount <= 0 || amount > refundable) {
      throw unprocessable(`You can refund at most ₹${refundable}.`, "REFUND_TOO_LARGE");
    }

    const row = await paymentModel.insertRefund(db, {
      payment_id: payment.id,
      booking_id: payment.booking_id,
      amount,
      reason,
      created_by: actorId,
    });

    try {
      const res = await razorpay.refund(payment.provider_payment_id, amount, { refund_id: row.id, reason });
      await paymentModel.updateRefund(db, row.id, {
        provider_refund_id: res.id,
        status: res.status === "processed" ? "processed" : "pending",
      });
    } catch (err) {
      await paymentModel.updateRefund(db, row.id, { status: "failed" });
      console.error("[payments] refund failed", err);
      throw new AppError(502, "REFUND_FAILED", "The refund could not be started. Please try again.");
    }

    await paymentModel.setStatus(db, payment.id, amount === refundable ? "refunded" : "partially_refunded");
    return { refundId: row.id, amount };
  },
};
