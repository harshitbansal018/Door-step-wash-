# ShineDoor — doorstep car wash platform

Next.js 16 (frontend + API) on Vercel, Supabase (Postgres, Auth, Storage, cron), Razorpay (payments), Resend (emails).

```
src/
├── app/
│   ├── (site)/  (auth)/  worker/  admin/     pages
│   └── api/**/route.ts                        ROUTES — one line per method, points at a controller
├── server/                                    BACKEND (server-only)
│   ├── controllers/   read request → validate → call service → respond
│   ├── services/      business rules (pricing, offers, slots, payments, status changes)
│   ├── models/        database queries only
│   ├── validators/    Zod schemas for every input
│   ├── middlewares/   withAuth / withPublic (login, role, CSRF), error → JSON
│   └── lib/           env, Supabase clients, Razorpay, mailer, errors, time
├── proxy.ts                                   refreshes the session, guards /admin /worker /bookings
supabase/
├── migrations/        schema, business functions, Row Level Security, storage + cron
├── seed.sql           cities, areas, pincodes, services, prices
└── templates/         email templates with the 6-digit code
```

## Security model

- Browsers can only **read**, and Row Level Security limits them to their own rows. Every **write** goes through
  `/api`, which checks the user, role and business rules, then writes with the service-role key.
- Prices, discounts and payment status are decided on the server. Payments are confirmed by Razorpay signature
  (checkout callback and webhook, both idempotent).
- Slot capacity is enforced inside Postgres with row locks, so the last slot can't be sold twice.
- State-changing API calls reject cross-site origins (CSRF). Auth cookies are `HttpOnly` and managed by Supabase.

## Setup

### 1. Supabase project (free)

1. Create a project at [supabase.com](https://supabase.com).
2. **Database → Extensions:** enable `pg_cron`.
3. Run the SQL files **in order** in **SQL Editor** (or `npx supabase link` + `npx supabase db push`):
   1. `supabase/migrations/20261001000100_schema.sql`
   2. `supabase/migrations/20261001000200_functions.sql`
   3. `supabase/migrations/20261001000300_security.sql`
   4. `supabase/migrations/20261001000400_storage_and_jobs.sql`
   5. `supabase/seed.sql`

### 2. Email + password login with OTP

In **Authentication**:

| Setting | Value |
|---|---|
| Sign In / Providers → Email | Enabled, **Confirm email: on** |
| Email OTP length | 6 |
| Email OTP expiration | 600 seconds |
| Password requirements | Minimum 8, letters and digits |
| Email Templates → Confirm signup | paste `supabase/templates/confirm-signup.html` |
| Email Templates → Reset password | paste `supabase/templates/reset-password.html` |
| URL Configuration → Site URL | your site URL (e.g. `https://yourapp.vercel.app`) |
| Hooks → Customize Access Token | Postgres function `public.custom_access_token_hook` |
| SMTP Settings | **Custom SMTP** — Resend: host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key |

> Supabase's built-in email sender only allows a few emails per hour and is meant for testing.
> Configure custom SMTP before real users sign up.

Flows:
- **Sign up:** name + email + password → 6-digit code by email → verified and signed in.
- **Log in:** email + password. Unverified accounts are sent a fresh code.
- **Forgot password:** email → 6-digit code → new password → signed in, other devices signed out.

### 3. Environment

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev
```

### 4. First admin

Sign up normally with your email, then in **SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Log out and back in. Workers are created from the admin panel (`POST /api/admin/workers`); they set their
password with **Forgot password**.

### 5. Razorpay (test mode)

- Put the test **Key ID** and **Key Secret** in `.env.local`.
- **Webhooks:** URL `https://<your-domain>/api/webhooks/razorpay`, a secret (→ `RAZORPAY_WEBHOOK_SECRET`),
  events `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`.
- Locally the checkout callback (`/api/payments/verify`) confirms payments; webhooks need a public URL.

### 6. Deploy (Vercel)

Import the repo, set **Root Directory** to `web`, add the same environment variables, deploy.
Update Supabase **Site URL** and the Razorpay webhook URL to the production domain.

## API

| Method | Route | Who |
|---|---|---|
| POST | `/api/auth/signup` · `verify-email` · `resend-otp` · `login` · `logout` · `forgot-password` · `reset-password` | public |
| POST | `/api/auth/change-password` · GET `/api/auth/me` | signed in |
| GET | `/api/coverage?pincode=` · `/api/catalog?areaId=` · `/api/slots?areaId=&date=` | public |
| POST | `/api/waitlist` | public |
| POST | `/api/offers/validate` | customer |
| GET, POST | `/api/bookings` | customer |
| GET | `/api/bookings/:id` | customer |
| POST | `/api/bookings/:id/cancel` · `reschedule` · `review` | customer |
| POST | `/api/payments/verify` | customer |
| POST | `/api/webhooks/razorpay` | Razorpay (signature) |
| GET | `/api/worker/me` · `jobs` · `jobs/:id` · `earnings` | worker |
| POST | `/api/worker/status` · `jobs/:id/respond` · `jobs/:id/progress` · `jobs/:id/photos` | worker |
| GET | `/api/admin/dashboard` | admin |
| GET, POST | `/api/admin/cities` · PATCH `/api/admin/cities/:id` · POST `/api/admin/cities/:id/areas` | admin |
| PATCH, DELETE | `/api/admin/areas/:id` | admin |
| GET | `/api/admin/services?cityId=` · PATCH `/api/admin/services/:id` · PUT `/api/admin/prices` | admin |
| POST | `/api/admin/slots/generate` · PATCH `/api/admin/slots/:id` | admin |
| GET, POST | `/api/admin/workers` · PATCH `/api/admin/workers/:id` · GET, POST `/api/admin/workers/:id/kyc` | admin |
| GET, POST | `/api/admin/offers` · PATCH `/api/admin/offers/:id` | admin |
| GET | `/api/admin/bookings` · `/api/admin/bookings/:id` · `/api/admin/bookings/:id/candidates` | admin |
| POST | `/api/admin/bookings/:id/assign` · `/api/admin/bookings/:id/cancel` · `/api/admin/refunds` | admin |
| GET | `/api/admin/transactions` · GET, POST `/api/admin/payouts` · POST `/api/admin/payouts/:id/pay` | admin |
| GET | `/api/admin/users` · PATCH `/api/admin/users/:id` | admin |

Responses are `{ "data": ... }` on success and `{ "error": { "code", "message", "details"? } }` on failure.

## Scheduled jobs (pg_cron)

| Job | When | What |
|---|---|---|
| `expire-pending-bookings` | every minute | unpaid bookings older than 10 min → expired, slot freed |
| `generate-time-slots` | daily 05:45 IST | keeps 14 days of slots open |
| `build-weekly-payouts` | Monday 01:00 IST | groups last week's worker earnings into payouts |
