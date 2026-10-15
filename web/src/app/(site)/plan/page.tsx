"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, MapPin, Pause, Play, Repeat, Sparkles, Star, Wallet, XCircle } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { type PlanOptions, SUBSCRIPTION_META, type SubscriptionSummary, type SubscriptionVisit, WEEKDAYS } from "@/lib/domain";
import { CheckoutDismissed, openCheckout, type Checkout } from "@/lib/razorpay-client";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/data-state";
import { toast } from "@/components/popups";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, StatusBadge } from "@/components/ui";

type RenewResult = { checkout: Checkout | null; paymentSkipped: boolean };
type Action = "cancel" | "visit" | null;

function ProgressRing({ used, total }: { used: number; total: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  return (
    <div className="relative size-[132px] shrink-0">
      <svg role="img" aria-label={`${used} of ${total} washes used this month`} width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="12" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out-expo)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none">
          {used}
          <span className="text-base font-medium text-slate-400">/{total}</span>
        </span>
        <span className="mt-1 text-[11px] text-slate-400">washes used</span>
      </div>
    </div>
  );
}

function VisitRow({ visit }: { visit: SubscriptionVisit }) {
  const done = visit.status === "completed";
  const [, m, d] = visit.slot.date.split("-");
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
      <span className={cn("flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold leading-tight", done ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700")}>
        <span>{new Date(`${visit.slot.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span>
        <span className="text-sm">{Number(d)}</span>
        <span className="sr-only">{m}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{visit.service}</p>
        <p className="text-xs text-slate-500">
          {visit.slot.start}–{visit.slot.end}
          {visit.worker ? ` · ${visit.worker.name}` : " · Partner to be assigned"}
        </p>
      </div>
      <StatusBadge status={visit.status} />
    </div>
  );
}

export default function MyPlanPage() {
  const [data, setData] = useState<SubscriptionSummary | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [options, setOptions] = useState<PlanOptions | null>(null);
  const [weekday, setWeekday] = useState(6);
  const [startTime, setStartTime] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<SubscriptionSummary | null>("/api/subscriptions"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your plan.");
      setData(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sub = data?.subscription;

  async function run(path: string, body?: unknown) {
    if (!sub) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/subscriptions/${sub.id}/${path}`, { method: path === "visit" ? "PATCH" : "POST", body });
      toast.success("Plan updated");
      setAction(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The plan could not be updated.");
      toast.error("Could not update plan", caught instanceof Error ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function renew() {
    if (!sub) return;
    setSaving(true);
    setError("");
    try {
      const result = await api<RenewResult>(`/api/subscriptions/${sub.id}/renew`, { method: "POST" });
      if (result.checkout) {
        const response = await openCheckout(result.checkout);
        await api("/api/payments/verify", {
          method: "POST",
          body: { orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature },
        });
      }
      toast.success("Plan renewed", "Your next month is paid.");
      await load();
    } catch (caught) {
      setError(caught instanceof CheckoutDismissed ? "Payment was not completed." : caught instanceof Error ? caught.message : "Could not renew the plan.");
      if (caught instanceof CheckoutDismissed) toast.warning("Payment not completed");
      else toast.error("Renewal failed", caught instanceof Error ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function openVisitEditor() {
    if (!sub) return;
    setWeekday(sub.weekday);
    setStartTime(sub.startTime);
    setAction("visit");
    if (!options) {
      try {
        setOptions(await api<PlanOptions>(`/api/plans/options?pincode=${sub.address.pincode}`));
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Could not load slot times.");
      }
    }
  }

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading your plan…" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader title="My plan" description="Monthly washes, booked for you automatically." />
        {error ? (
          <ErrorState message={error} retry={load} />
        ) : (
          <Card className="page-enter relative overflow-hidden p-10 text-center">
            <div aria-hidden className="absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
            <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
              <Repeat className="size-7" />
            </span>
            <h2 className="relative mt-5 text-xl font-bold">You don&apos;t have a plan yet</h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm text-slate-600">
              Pick a monthly plan and we&apos;ll book your washes every week in a slot you choose. Pause or cancel anytime.
            </p>
            <div className="relative mt-6 flex justify-center">
              <Button href="/pricing#monthly-plans" className="group">
                See monthly plans <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  const meta = SUBSCRIPTION_META[sub.status];
  const remaining = sub.washes.remaining;
  const next = data?.nextVisit ?? null;
  const visits = data?.visits ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <PageHeader
        title="My plan"
        description="Your monthly washes, next visit and billing in one place."
        action={<Button href="/book" variant="secondary">Book an extra wash</Button>}
      />
      {error && (
        <div role="alert" className="step-enter mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {(sub.status === "expired" || (sub.status !== "cancelled" && sub.canRenew)) && (
        <div className="step-enter mb-5 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{sub.status === "expired" ? "Your plan month has ended" : "Your plan renews soon"}</p>
            <p className="mt-0.5 text-amber-800">
              {sub.status === "expired"
                ? "Renew to keep your weekly slot and start booking visits again."
                : `Current month ends on ${sub.period.end ? formatDate(sub.period.end) : "—"}. Pay now to continue without a gap.`}
            </p>
          </div>
          <Button onClick={renew} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Wallet className="size-4" /> Renew for {formatMoney(sub.price.total)}
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="page-enter relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-2xl shadow-slate-950/30 lg:col-span-2">
          <div aria-hidden className="dot-grid absolute inset-0 opacity-50" />
          <div aria-hidden className="drift absolute -top-32 -right-20 size-80 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">{sub.code}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {sub.plan.name} · {sub.vehicle.type.charAt(0).toUpperCase() + sub.vehicle.type.slice(1)}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {sub.vehicle.makeModel} · {sub.vehicle.plate} · {sub.area}, {sub.city}
              </p>
            </div>
            <Badge tone={meta.tone} className="shrink-0">
              <span className="size-1.5 rounded-full bg-current" />
              {meta.label}
            </Badge>
          </div>

          <div className="relative mt-7 flex flex-wrap items-center gap-7">
            <ProgressRing used={sub.washes.used} total={sub.washes.total} />
            <div className="grid min-w-[260px] flex-1 grid-cols-2 gap-3">
              {[
                ["Remaining", `${remaining} ${remaining === 1 ? "wash" : "washes"}`],
                ["Month ends", sub.period.end ? formatDate(sub.period.end) : "—"],
                ["Weekly slot", `${WEEKDAYS[sub.weekday]} · ${sub.startTime}`],
                ["Saved this month", data?.savings ? formatMoney(data.savings) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={cn("mt-1 text-base font-semibold", label === "Saved this month" && "text-emerald-300")}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap gap-2">
            {["active", "paused"].includes(sub.status) && (
              <Button variant="secondary" onClick={openVisitEditor} disabled={saving} className="bg-white/10 text-white ring-white/15 hover:bg-white/20 hover:text-white">
                <Repeat className="size-4" /> Change weekly slot
              </Button>
            )}
            {sub.status === "active" && (
              <Button variant="secondary" onClick={() => run("pause")} disabled={saving} className="bg-white/10 text-white ring-white/15 hover:bg-white/20 hover:text-white">
                <Pause className="size-4" /> Pause plan
              </Button>
            )}
            {sub.status === "paused" && (
              <Button onClick={() => run("resume")} disabled={saving}>
                <Play className="size-4" /> Resume plan
              </Button>
            )}
            {["active", "paused"].includes(sub.status) && (
              <Button variant="ghost" onClick={() => setAction("cancel")} disabled={saving} className="text-slate-400 hover:bg-white/10 hover:text-white">
                <XCircle className="size-4" /> Cancel plan
              </Button>
            )}
          </div>
        </section>

        <section className="page-enter flex flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-sm" style={{ animationDelay: "80ms" }}>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand-600 uppercase">Next visit</p>
          {next ? (
            <>
              <div>
                <p className="text-2xl font-bold tracking-tight">{formatDate(next.slot.date)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {next.slot.start}–{next.slot.end} · {next.service}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {next.worker ? next.worker.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "?"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{next.worker ? next.worker.name : "Partner not assigned yet"}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    {next.worker ? (
                      <>
                        <Star className="size-3 fill-amber-400 text-amber-400" /> {next.worker.rating || "New"}
                        {next.worker.phone ? ` · ${next.worker.phone}` : ""}
                      </>
                    ) : (
                      "We assign a verified partner before the visit"
                    )}
                  </p>
                </div>
              </div>
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0" /> {sub.address.line}
              </p>
              <Button href="/bookings" variant="secondary" className="mt-auto w-full">
                Reschedule or cancel this visit
              </Button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <CalendarDays className="size-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold">No visit scheduled</p>
              <p className="mt-1 text-xs text-slate-500">
                {sub.status === "active"
                  ? "Visits are booked up to two weeks ahead as slots open."
                  : sub.status === "paused"
                    ? "Resume the plan to continue booking visits."
                    : "Renew the plan to book visits again."}
              </p>
            </div>
          )}
        </section>
      </div>

      <Card className="page-enter mt-5 overflow-hidden" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold">This month&apos;s visits</h2>
          <span className="text-xs text-slate-500">
            {sub.period.start && sub.period.end ? `${formatDate(sub.period.start)} – ${formatDate(sub.period.end)}` : "No active month"}
          </span>
        </div>
        {visits.length ? (
          visits.map((visit) => <VisitRow key={visit.id} visit={visit} />)
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">Visits will appear here as they are booked.</p>
        )}
      </Card>

      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-brand-600" /> {sub.plan.name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {sub.plan.washesPerMonth} × {sub.plan.service}
              {sub.plan.bonusService && sub.plan.bonusCount > 0 ? ` + ${sub.plan.bonusCount} × ${sub.plan.bonusService}` : ""} every month
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-bold">{formatMoney(sub.price.total)} <span className="text-xs font-normal text-slate-500">/ month</span></p>
            {data?.lastPayment && <p className="text-xs text-slate-500">Last paid {formatDate(data.lastPayment.paidAt.slice(0, 10))}</p>}
          </div>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {sub.plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-brand-600" /> {feature}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Visits already booked stay yours even if you pause or cancel. Need something else?{" "}
          <Link href="/faq" className="font-medium text-brand-700 underline">Read the plan FAQ</Link>.
        </p>
      </Card>

      <Modal
        open={action === "cancel"}
        onClose={() => setAction(null)}
        title="Cancel plan"
        description="No more visits will be booked. Visits already scheduled this month remain available."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>Keep plan</Button>
            <Button variant="danger" disabled={saving} onClick={() => run("cancel", { reason: reason || undefined })}>
              {saving && <Loader2 className="size-4 animate-spin" />} Cancel plan
            </Button>
          </>
        }
      >
        <Label htmlFor="cancel-reason">Reason (optional)</Label>
        <Input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      </Modal>

      <Modal
        open={action === "visit"}
        onClose={() => setAction(null)}
        title="Change weekly slot"
        description="Future visits that haven't started are moved to the new day. Visits in progress are not affected."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>Close</Button>
            <Button disabled={saving || !startTime} onClick={() => run("visit", { weekday, startTime })}>
              {saving && <Loader2 className="size-4 animate-spin" />} Save slot
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Label>Visit day</Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map((label, index) => (
                <button
                  type="button"
                  key={label}
                  aria-pressed={weekday === index}
                  onClick={() => setWeekday(index)}
                  className={cn("rounded-lg px-2 py-2 text-sm font-semibold ring-1 transition-all active:scale-95", weekday === index ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200 hover:bg-slate-50")}
                >
                  {label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Start time</Label>
            {!options ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading times…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {options.startTimes.map((time) => (
                  <button
                    type="button"
                    key={time}
                    aria-pressed={startTime === time}
                    onClick={() => setStartTime(time)}
                    className={cn("rounded-lg px-2 py-2 text-sm font-semibold ring-1 transition-all active:scale-95", startTime === time ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 hover:bg-slate-50")}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
