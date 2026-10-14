"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck, Check, CheckCircle2, Loader2, MapPin, Repeat, Sparkles, Tag } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { type CatalogPlan, type PlanOptions, type PlanQuote, VEHICLES, type VehicleType, WEEKDAYS } from "@/lib/domain";
import { CheckoutDismissed, openCheckout, type Checkout } from "@/lib/razorpay-client";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { Button, Card, Input, Label, Select } from "@/components/ui";

type StartResult = {
  subscription: { id: string; code: string; total: number };
  period: { start: string; end: string };
  checkout: Checkout | null;
  paymentSkipped: boolean;
};

const STEPS = ["Plan & area", "Weekly visit", "Details & payment"];
const parkingValues = [
  ["basement", "Basement"],
  ["open", "Open parking"],
  ["covered", "Covered garage"],
  ["street", "Street"],
] as const;
const accessValues = [
  ["customer_present", "I'll be there"],
  ["key_with_security", "Key with security"],
  ["no_access", "No access needed"],
] as const;

/** First calendar date on or after tomorrow that falls on `weekday` (0 = Sunday). */
function nextVisitDate(weekday: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

export function PlanWizard({
  initialPlan,
  initialVehicle,
  initialPincode,
}: {
  initialPlan?: string;
  initialVehicle?: VehicleType;
  initialPincode?: string;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [pincode, setPincode] = useState(initialPincode ?? "");
  const [options, setOptions] = useState<PlanOptions | null>(null);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [planId, setPlanId] = useState(initialPlan ?? "");
  const [vehicle, setVehicle] = useState<VehicleType>(initialVehicle ?? "sedan");
  const [quote, setQuote] = useState<PlanQuote | null>(null);
  const [weekday, setWeekday] = useState(6);
  const [startTime, setStartTime] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [parkingType, setParkingType] = useState("basement");
  const [parkingSpot, setParkingSpot] = useState("");
  const [carAccess, setCarAccess] = useState("customer_present");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existingPlan, setExistingPlan] = useState(false);
  const [confirmed, setConfirmed] = useState<StartResult | null>(null);

  const plan = plans.find((p) => p.id === planId);

  // Area options and local plans for the pincode.
  useEffect(() => {
    if (pincode.length !== 6) {
      const timer = window.setTimeout(() => {
        setOptions(null);
        setPlans([]);
        setQuote(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let live = true;
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError("");
      api<PlanOptions>(`/api/plans/options?pincode=${pincode}`)
        .then(async (opts) => {
          const rows = await api<CatalogPlan[]>(`/api/plans?areaId=${opts.area.id}`);
          if (!live) return;
          setOptions(opts);
          setPlans(rows);
          setStartTime((current) => (opts.startTimes.includes(current) ? current : (opts.startTimes[0] ?? "")));
          setPlanId((current) => (rows.some((p) => p.id === current) ? current : (rows.find((p) => p.isPopular)?.id ?? rows[0]?.id ?? "")));
        })
        .catch((caught: ApiError) => live && setError(caught.message))
        .finally(() => live && setBusy(false));
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [pincode]);

  // Server-side price for the chosen plan and vehicle.
  useEffect(() => {
    if (!options || !planId || pincode.length !== 6) return;
    let live = true;
    const timer = window.setTimeout(() => {
      api<PlanQuote>("/api/subscriptions/quote", {
        method: "POST",
        body: { planId, pincode, vehicleType: vehicle, code: appliedCode || undefined, weekday, startTime: startTime || undefined },
      })
        .then((q) => {
          if (!live) return;
          setQuote(q);
          if (appliedCode) setError("");
        })
        .catch((caught: ApiError) => {
          if (!live) return;
          // A code that does not apply is dropped so the plain price still shows.
          if (appliedCode) {
            setAppliedCode("");
            setError(caught.message);
            return;
          }
          setQuote(null);
          setError(caught.message);
        });
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [options, planId, vehicle, pincode, appliedCode, weekday, startTime]);

  const canNext = [
    !!options && !!plan && !!quote,
    !!startTime,
    model.trim().length >= 2 && plate.trim().length >= 4 && address.trim().length >= 5 && name.trim().length >= 2 && /^\d{10}$/.test(phone),
  ][step];

  const goTo = (next: number) => {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  };
  const stepClass = direction === "forward" ? "step-enter" : "step-enter-back";

  async function pay() {
    if (!plan || !quote) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<StartResult>("/api/subscriptions", {
        method: "POST",
        body: {
          planId: plan.id,
          vehicleType: vehicle,
          vehicleMakeModel: model,
          vehiclePlate: plate,
          pincode,
          addressLine: address,
          landmark: landmark || undefined,
          parkingType,
          parkingSpot: parkingSpot || undefined,
          carAccess,
          contactName: name,
          contactPhone: phone,
          notes: notes || undefined,
          weekday,
          startTime,
          offerCode: appliedCode || undefined,
        },
      });
      if (!result.checkout) {
        setConfirmed(result);
        return;
      }
      let response;
      try {
        response = await openCheckout(result.checkout);
      } catch (caught) {
        setError(caught instanceof CheckoutDismissed ? "Payment was not completed. Your plan starts once the first month is paid." : caught instanceof Error ? caught.message : "Could not open the payment window.");
        return;
      }
      await api("/api/payments/verify", {
        method: "POST",
        body: { orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature },
      });
      setConfirmed(result);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "PLAN_EXISTS") setExistingPlan(true);
      setError(caught instanceof Error ? caught.message : "Could not start the plan.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <Card className="page-enter relative mx-auto max-w-xl overflow-hidden p-10 text-center">
        <div aria-hidden className="absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <span className="relative mx-auto flex size-20 items-center justify-center">
          <span aria-hidden className="check-ring absolute inset-0 rounded-full bg-emerald-400/40" />
          <span className="check-pop relative flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-9" />
          </span>
        </span>
        <h1 className="hero-enter relative mt-5 text-2xl font-bold">Your plan is active</h1>
        <p className="hero-enter-delayed relative mt-2 text-slate-600">
          Plan <strong className="text-slate-900">{confirmed.subscription.code}</strong> runs until {formatDate(confirmed.period.end)}. Your visits are being booked every{" "}
          <strong className="text-slate-900">{WEEKDAYS[weekday]} at {startTime}</strong>.
        </p>
        <div className="hero-enter-delayed relative mt-6 flex justify-center gap-3">
          <Button href="/plan">View my plan</Button>
          <Button href="/bookings" variant="secondary">See bookings</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Start a monthly plan</h1>
      <p className="mt-1 text-slate-500">Pick a plan, choose your weekly slot, and pay for the first month.</p>
      <ol className="my-8 grid grid-cols-3 gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label}>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className={cn("h-full rounded-full bg-brand-600 transition-transform duration-500 ease-out", done || current ? "origin-left scale-x-100" : "origin-left scale-x-0", current && "pulse-soft")} />
              </div>
              <p className={cn("mt-2 hidden text-xs sm:flex sm:items-center sm:gap-1.5", current ? "font-semibold text-brand-700" : done ? "text-slate-700" : "text-slate-400")}>
                {done ? (
                  <span className="check-pop flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="size-2.5" />
                  </span>
                ) : (
                  <span>{index + 1}.</span>
                )}
                {label}
              </p>
            </li>
          );
        })}
      </ol>

      {error && (
        <div role="alert" className="step-enter mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
          {existingPlan && (
            <>
              {" "}
              <Link href="/plan" className="font-semibold underline">Open My plan</Link>
            </>
          )}
        </div>
      )}

      <Card className="overflow-hidden p-6 sm:p-8">
        {step === 0 && (
          <div key="step-0" className={cn("space-y-7", stepClass)}>
            <div>
              <Label htmlFor="plan-pincode">Service pincode</Label>
              <div className="relative">
                <MapPin className="absolute top-3 left-3 size-4 text-slate-400" />
                <Input id="plan-pincode" className="pl-9" inputMode="numeric" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit pincode" />
              </div>
              {busy && pincode.length === 6 && !options && (
                <p className="step-enter mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" /> Checking coverage…
                </p>
              )}
              {options && (
                <p className="step-enter mt-2 flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="size-4" /> We serve {options.area.name}, {options.city.name}.
                </p>
              )}
            </div>

            <section>
              <h2 className="font-semibold">Vehicle type</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {VEHICLES.map((item) => {
                  const selected = vehicle === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={selected}
                      onClick={() => setVehicle(item.id)}
                      className={cn("rounded-xl p-4 text-left ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[.98]", selected ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 hover:ring-slate-300")}
                    >
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.hint}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-semibold">Plan</h2>
              {!options ? (
                <p className="mt-2 text-sm text-slate-500">Enter your pincode to see the plans available in your area.</p>
              ) : plans.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No monthly plans are priced for this area yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {plans.map((item, index) => {
                    const selected = planId === item.id;
                    const price = item.prices[vehicle];
                    return (
                      <button
                        type="button"
                        key={item.id}
                        aria-pressed={selected}
                        disabled={price === undefined}
                        onClick={() => setPlanId(item.id)}
                        style={{ animationDelay: `${index * 60}ms` }}
                        className={cn("step-enter flex w-full items-start gap-3 rounded-xl p-4 text-left ring-1 transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:opacity-50", selected ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 enabled:hover:ring-slate-300")}
                      >
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all", selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white")}>
                          {selected && <Check className="check-pop size-3" />}
                        </span>
                        <span className="flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-semibold">
                            {item.name}
                            {item.isPopular && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">POPULAR</span>}
                          </span>
                          <span className="block text-sm text-slate-500">
                            {item.washesPerMonth} × {item.service.name}
                            {item.bonusService && item.bonusCount > 0 ? ` + ${item.bonusCount} × ${item.bonusService.name}` : ""} · {item.tagline}
                          </span>
                        </span>
                        <strong className="tabular-nums">{price === undefined ? "N/A" : `${formatMoney(price)}/mo`}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {quote && plan && (
              <div className="step-enter rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                <div className="flex justify-between">
                  <span>{plan.name} · {quote.visits} visits</span>
                  <strong className="tabular-nums">{formatMoney(quote.total)} / month</strong>
                </div>
                {quote.areaCharge > 0 && <p className="mt-1 text-xs text-slate-500">Includes {formatMoney(quote.areaCharge)} area charge for {quote.visits} visits.</p>}
                {quote.listPrice && quote.listPrice > quote.planPrice && (
                  <p className="mt-1 text-xs font-medium text-emerald-700">You save {formatMoney(quote.listPrice - quote.planPrice)} compared to booking each wash.</p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && options && (
          <div key="step-1" className={cn("space-y-7", stepClass)}>
            <section>
              <h2 className="font-semibold">Visit day</h2>
              <p className="mt-1 text-sm text-slate-500">Your wash is booked on this day every week.</p>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {WEEKDAYS.map((label, index) => (
                  <button
                    type="button"
                    key={label}
                    aria-pressed={weekday === index}
                    onClick={() => setWeekday(index)}
                    className={cn("rounded-lg px-2 py-2.5 text-sm font-semibold ring-1 transition-all duration-300 active:scale-95", weekday === index ? "bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-brand-600" : "ring-slate-200 hover:bg-slate-50 hover:ring-slate-300")}
                  >
                    {label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Start time</h2>
              <p className="mt-1 text-sm text-slate-500">Each visit lasts about {options.slotMinutes} minutes.</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {options.startTimes.map((time) => (
                  <button
                    type="button"
                    key={time}
                    aria-pressed={startTime === time}
                    onClick={() => setStartTime(time)}
                    className={cn("rounded-lg px-2 py-2.5 text-sm font-semibold ring-1 transition-all duration-300 active:scale-95", startTime === time ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 hover:bg-slate-50 hover:ring-slate-300")}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </section>
            <div className="step-enter flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <p>
                First visit on <strong>{formatDate(nextVisitDate(weekday))}</strong> at <strong>{startTime || "—"}</strong>, then every {WEEKDAYS[weekday]}. If a slot is ever full, we book the nearest one and tell you.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className={cn("grid gap-5 sm:grid-cols-2", stepClass)}>
            <div><Label htmlFor="model">Make and model</Label><Input id="model" value={model} onChange={(event) => setModel(event.target.value)} /></div>
            <div><Label htmlFor="plate">Registration number</Label><Input id="plate" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} /></div>
            <div className="sm:col-span-2"><Label htmlFor="address">Full address</Label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>
            <div><Label htmlFor="landmark">Landmark (optional)</Label><Input id="landmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} /></div>
            <div><Label htmlFor="spot">Parking spot (optional)</Label><Input id="spot" value={parkingSpot} onChange={(event) => setParkingSpot(event.target.value)} /></div>
            <div><Label htmlFor="parking">Parking type</Label><Select id="parking" value={parkingType} onChange={(event) => setParkingType(event.target.value)}>{parkingValues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div><Label htmlFor="access">Car access</Label><Select id="access" value={carAccess} onChange={(event) => setCarAccess(event.target.value)}>{accessValues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div><Label htmlFor="name">Contact name</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
            <div className="sm:col-span-2"><Label htmlFor="notes">Notes (optional)</Label><Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
            <div className="sm:col-span-2">
              <Label htmlFor="plan-coupon">Coupon code (optional)</Label>
              <div className="flex gap-2">
                <Input id="plan-coupon" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} placeholder="Enter a code" />
                {appliedCode && appliedCode === coupon ? (
                  <Button type="button" variant="secondary" onClick={() => { setAppliedCode(""); setCoupon(""); }}>Remove</Button>
                ) : (
                  <Button type="button" variant="secondary" disabled={coupon.length < 3} onClick={() => { setError(""); setAppliedCode(coupon); }}>
                    <Tag className="size-4" /> Apply
                  </Button>
                )}
              </div>
            </div>
            {plan && quote && (
              <div className="sm:col-span-2 rounded-xl bg-slate-950 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-300 uppercase"><Sparkles className="size-3.5" /> First month</p>
                    <p className="mt-1 text-lg font-bold">{plan.name} · {VEHICLES.find((v) => v.id === vehicle)?.label}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-300"><Repeat className="size-4" /> Every {WEEKDAYS[weekday]} at {startTime}</p>
                  </div>
                  <div className="text-right">
                    {quote.discount ? <p className="text-sm text-slate-400 tabular-nums line-through">{formatMoney(quote.total + quote.discount)}</p> : null}
                    <p className="text-2xl font-bold tabular-nums">{formatMoney(quote.total)}</p>
                    <p className="text-xs text-slate-400">{quote.visits} visits · renews monthly</p>
                  </div>
                </div>
                {quote.offer && quote.discount ? (
                  <p className="step-enter mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-200">
                    <Tag className="size-4 shrink-0" />
                    {quote.offer.title}: {formatMoney(quote.discount)} off
                    {quote.offer.months > 1 ? ` for your first ${quote.offer.months} months` : " on your first month"}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-slate-200 pt-5">
          <Button type="button" variant="secondary" disabled={step === 0 || busy} onClick={() => goTo(step - 1)}>Back</Button>
          {step < 2 ? (
            <Button type="button" className="group" disabled={!canNext || busy} onClick={() => goTo(step + 1)}>
              Continue <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button type="button" disabled={!canNext || busy} onClick={pay}>
              {busy && <Loader2 className="size-4 animate-spin" />}Pay {quote ? formatMoney(quote.total) : ""} securely
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
