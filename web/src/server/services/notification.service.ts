import "server-only";
import { BRAND } from "@/lib/config";
import { env } from "../lib/env";
import { sendEmail } from "../lib/mailer";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <p style="font-size:18px;font-weight:700;color:#2563eb;margin:0 0 24px">${BRAND.name}</p>
    <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
      <h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>${body}
    </div>
    <p style="font-size:12px;color:#64748b;margin-top:24px">${BRAND.name} · ${BRAND.email}</p>
  </div></body></html>`;
}

const p = (text: string) => `<p style="font-size:14px;line-height:22px;margin:0 0 12px">${text}</p>`;
const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">${escape(label)}</a>`;

export interface BookingEmailInfo {
  to: string;
  name: string;
  code: string;
  service: string;
  when: string;
  address: string;
  total?: number;
}

export const notificationService = {
  bookingConfirmed(b: BookingEmailInfo) {
    return sendEmail(
      b.to,
      `Booking ${b.code} confirmed`,
      layout(
        "Your wash is booked",
        p(`Hi ${escape(b.name)}, your <b>${escape(b.service)}</b> is confirmed for <b>${escape(b.when)}</b>.`) +
          p(`Address: ${escape(b.address)}`) +
          (b.total !== undefined ? p(`Amount paid: ₹${b.total}`) : "") +
          p("We'll email you again when a washer is assigned.") +
          button(`${env().NEXT_PUBLIC_SITE_URL}/bookings`, "View booking"),
      ),
    );
  },

  planActivated(s: {
    to: string;
    name: string;
    code: string;
    plan: string;
    visit: string;
    periodEnd: string;
    total: number;
    renewed: boolean;
  }) {
    return sendEmail(
      s.to,
      s.renewed ? `Plan ${s.code} renewed` : `Plan ${s.code} is active`,
      layout(
        s.renewed ? "Your plan is renewed" : "Your monthly plan is active",
        p(`Hi ${escape(s.name)}, your <b>${escape(s.plan)}</b> plan is paid and active until <b>${escape(s.periodEnd)}</b>.`) +
          p(`Your washes are booked automatically every <b>${escape(s.visit)}</b>. You can reschedule any visit from your account.`) +
          p(`Amount paid: ₹${s.total}`) +
          button(`${env().NEXT_PUBLIC_SITE_URL}/plan`, "View my plan"),
      ),
    );
  },

  workerAssigned(b: BookingEmailInfo & { workerName: string }) {
    return sendEmail(
      b.to,
      `Washer assigned for ${b.code}`,
      layout(
        "Your washer is assigned",
        p(`${escape(b.workerName)} will wash your car on <b>${escape(b.when)}</b>.`) +
          button(`${env().NEXT_PUBLIC_SITE_URL}/bookings`, "Track booking"),
      ),
    );
  },

  bookingCompleted(b: BookingEmailInfo) {
    return sendEmail(
      b.to,
      `Your car is sparkling — ${b.code}`,
      layout(
        "Wash completed",
        p(`Your ${escape(b.service)} is done. Before and after photos are in your booking.`) +
          p("How did we do? Your rating helps us keep quality high.") +
          button(`${env().NEXT_PUBLIC_SITE_URL}/bookings`, "Rate your wash"),
      ),
    );
  },

  bookingCancelled(b: BookingEmailInfo & { refund: number }) {
    return sendEmail(
      b.to,
      `Booking ${b.code} cancelled`,
      layout(
        "Booking cancelled",
        p(`Your booking for ${escape(b.when)} has been cancelled.`) +
          (b.refund > 0
            ? p(`A refund of <b>₹${b.refund}</b> has been started. It usually reaches your account in 5–7 working days.`)
            : p("This cancellation was not eligible for a refund.")),
      ),
    );
  },

  newJobForWorker(to: string, b: { code: string; service: string; when: string; area: string }) {
    return sendEmail(
      to,
      `New job ${b.code}`,
      layout(
        "You have a new job",
        p(`<b>${escape(b.service)}</b> in ${escape(b.area)} on <b>${escape(b.when)}</b>.`) +
          button(`${env().NEXT_PUBLIC_SITE_URL}/worker`, "Open partner portal"),
      ),
    );
  },

  workerWelcome(to: string, name: string, initialPassword: string) {
    return sendEmail(
      to,
      `Welcome to ${BRAND.name} Partner`,
      layout(
        `Welcome, ${name}`,
        p("Your partner account has been created. Use these details to log in:") +
          p(`Email: <b>${escape(to)}</b><br>Initial password: <b>${escape(initialPassword)}</b>`) +
          p("For security, change your password from Account settings after your first login.") +
          button(`${env().NEXT_PUBLIC_SITE_URL}/login`, "Log in to partner account"),
      ),
    );
  },

  workerCredentialsUpdated(to: string, name: string, newPassword?: string) {
    return sendEmail(
      to,
      `${BRAND.name} Partner login updated`,
      layout(
        `Login updated for ${name}`,
        p("An administrator updated your partner login details.") +
          p(`Login email: <b>${escape(to)}</b>${newPassword ? `<br>New password: <b>${escape(newPassword)}</b>` : ""}`) +
          p("If you did not expect this change, contact support immediately.") +
          button(`${env().NEXT_PUBLIC_SITE_URL}/login`, "Log in to partner account"),
      ),
    );
  },
};
