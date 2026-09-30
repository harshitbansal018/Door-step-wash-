import "server-only";
import { env } from "./env";

/**
 * Sends a transactional email through Resend. Failures are logged, never
 * thrown: a missing email must not break a booking or payment.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) {
    console.info(`[mailer] RESEND_API_KEY not set, skipping "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[mailer] send failed", res.status, await res.text());
  } catch (err) {
    console.error("[mailer] send failed", err);
  }
}
