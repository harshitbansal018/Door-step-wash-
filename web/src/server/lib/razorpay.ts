import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serviceUnavailable } from "./errors";
import { env } from "./env";

const API = "https://api.razorpay.com/v1";

function credentials() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = env();
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw serviceUnavailable("Online payments are not configured yet.");
  }
  return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET };
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const { keyId, keySecret } = credentials();
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[razorpay] request failed", path, res.status, json?.error?.description);
    throw new Error(`Razorpay ${path} failed with ${res.status}`);
  }
  return json as T;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const razorpay = {
  keyId: () => credentials().keyId,

  /** Amounts are in rupees; Razorpay works in paise. */
  createOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
    return call<{ id: string; amount: number; currency: string }>("/orders", {
      amount: amountRupees * 100,
      currency: "INR",
      receipt,
      notes,
    });
  },

  refund(paymentId: string, amountRupees: number, notes: Record<string, string>) {
    return call<{ id: string; status: string }>(`/payments/${paymentId}/refund`, {
      amount: amountRupees * 100,
      notes,
    });
  },

  /** Signature sent to the browser after checkout: HMAC(order_id|payment_id). */
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
    const expected = createHmac("sha256", credentials().keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    return safeEqual(expected, signature);
  },

  /** Signature on webhook requests: HMAC(raw body) with the webhook secret. */
  verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = env().RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw serviceUnavailable("Payment webhooks are not configured.");
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
  },
};
