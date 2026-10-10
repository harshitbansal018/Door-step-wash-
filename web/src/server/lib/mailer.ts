import "server-only";
import { env } from "./env";

/**
 * Sends a transactional email through Brevo. Failures are logged, never
 * thrown: a missing email must not break a booking or payment.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = env();
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    console.info(`[mailer] Brevo is not configured, skipping "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        tags: ["transactional"],
      }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[mailer] send failed", res.status, await res.text());
  } catch (err) {
    console.error("[mailer] send failed", err);
  }
}
