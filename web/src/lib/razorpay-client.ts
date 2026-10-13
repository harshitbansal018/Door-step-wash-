// Browser-side helper for opening Razorpay Checkout. The script is loaded by
// the page (next/script); this only wires the options and resolves on success.

export type Checkout = {
  provider: "razorpay";
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

type RazorpayOptions = Checkout & {
  key: string;
  order_id: string;
  handler: (result: RazorpayResult) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export class CheckoutDismissed extends Error {
  constructor() {
    super("Payment was not completed.");
    this.name = "CheckoutDismissed";
  }
}

/** Opens Checkout and resolves with Razorpay's result, or rejects when the customer closes it. */
export function openCheckout(checkout: Checkout): Promise<RazorpayResult> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Payment window did not load. Refresh and try again."));
      return;
    }
    const instance = new window.Razorpay({
      ...checkout,
      key: checkout.keyId,
      order_id: checkout.orderId,
      handler: resolve,
      modal: { ondismiss: () => reject(new CheckoutDismissed()) },
      theme: { color: "#2563eb" },
    });
    instance.open();
  });
}
