"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bike, CalendarCheck, Car, Check, Clock, CreditCard, Loader2, MapPin, Repeat, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { CatalogPlan, CatalogService, Coverage, StartingPrices, VehicleType } from "@/lib/domain";
import { VEHICLES } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { Button, Input, Skeleton } from "@/components/ui";

const STARTING_PRICE_CARDS = [
  { key: "bike", label: "Bike wash", icon: Bike },
  { key: "car", label: "Car wash", icon: Car },
] as const;

type Billing = "wash" | "month";

const PLAN_STEPS = [
  { icon: CalendarCheck, title: "Pick a plan and vehicle", body: "Prices use your pincode and area charge, exactly like a single booking." },
  { icon: Repeat, title: "Choose a weekly day and time", body: "Every visit is booked automatically in that slot. Reschedule any single visit online." },
  { icon: CreditCard, title: "Pay monthly with Razorpay", body: "Each month is paid upfront. Renew from your account in the last week, or let it lapse." },
];

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("wash");
  const [vehicle, setVehicle] = useState<VehicleType>("sedan");
  const [pincode, setPincode] = useState("");
  const [services, setServices] = useState<CatalogService[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[] | null>(null);
  const [area, setArea] = useState("");
  const [areaId, setAreaId] = useState("");
  const [areaCharge, setAreaCharge] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startingPrices, setStartingPrices] = useState<StartingPrices>();

  useEffect(() => {
    let active = true;
    api<StartingPrices>("/api/pricing/starting")
      .then((prices) => active && setStartingPrices(prices))
      .catch(() => active && setStartingPrices({ bike: null, car: null }));
    api<CatalogPlan[]>("/api/plans")
      .then((rows) => active && setPlans(rows))
      .catch(() => active && setPlans([]));
    // Deep link: /pricing#monthly-plans opens the monthly tab.
    const timer = window.setTimeout(() => {
      if (active && window.location.hash === "#monthly-plans") setBilling("month");
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const coverage = await api<Coverage>(`/api/coverage?pincode=${pincode}`);
      if (coverage.status !== "served" || !coverage.area) throw new Error("This pincode is not serviceable yet.");
      const [catalog, planRows] = await Promise.all([
        api<CatalogService[]>(`/api/catalog?areaId=${coverage.area.id}`),
        api<CatalogPlan[]>(`/api/plans?areaId=${coverage.area.id}`),
      ]);
      setServices(catalog);
      setPlans(planRows);
      setArea(`${coverage.area.name}, ${coverage.city?.name}`);
      setAreaId(coverage.area.id);
      setAreaCharge(coverage.area.extraCharge);
    } catch (caught) {
      setServices([]);
      setAreaId("");
      setAreaCharge(0);
      setError(caught instanceof Error ? caught.message : "Could not load pricing.");
    } finally {
      setLoading(false);
    }
  }

  const visibleServices = services.filter((item) => item.prices[vehicle]);
  const priced = !!areaId;

  return (
    <div id="monthly-plans" className="scroll-mt-24">
      {/* Billing toggle */}
      <Reveal variant="scale" className="mb-8 flex flex-col items-center gap-4">
        <div role="group" aria-label="Billing" className="inline-flex gap-1 rounded-2xl bg-slate-200/80 p-1.5">
          <button
            type="button"
            aria-pressed={billing === "wash"}
            onClick={() => setBilling("wash")}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-300",
              billing === "wash" ? "bg-white text-slate-950 shadow-md shadow-slate-900/10" : "text-slate-600 hover:text-slate-900",
            )}
          >
            Per wash
          </button>
          <button
            type="button"
            aria-pressed={billing === "month"}
            onClick={() => setBilling("month")}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-300",
              billing === "month" ? "bg-white text-slate-950 shadow-md shadow-slate-900/10" : "text-slate-600 hover:text-slate-900",
            )}
          >
            Monthly plans
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700">SAVE</span>
          </button>
        </div>
      </Reveal>

      {billing === "wash" && (
        <div key="wash" className="step-enter">
          <Stagger className="mx-auto mb-8 grid max-w-2xl gap-4 sm:grid-cols-2" step={120} variant="scale">
            {STARTING_PRICE_CARDS.map((item) => {
              const startingPrice = startingPrices?.[item.key];
              return (
                <SpotlightCard
                  key={item.label}
                  className="interactive-card group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                >
                  <span className="icon-tile flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-600/25">
                    <item.icon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    {startingPrices === undefined ? (
                      <Skeleton className="mt-1.5 h-7 w-28" />
                    ) : (
                      <p className="step-enter text-2xl font-bold text-slate-900">
                        {startingPrice === null || startingPrice === undefined ? "Check availability" : `From ${formatMoney(startingPrice)}`}
                      </p>
                    )}
                  </div>
                </SpotlightCard>
              );
            })}
          </Stagger>
          <p className="mb-5 text-center text-xs text-slate-500">
            Starting prices are the lowest active base rates across all cities. Enter your pincode for the actual price.
          </p>
        </div>
      )}

      {billing === "month" && (
        <div key="month" className="step-enter mx-auto mb-6 max-w-2xl text-center">
          <p className="text-sm leading-6 text-slate-600">
            A fixed weekly slot, washes booked for you automatically, and one monthly payment. Enter your pincode to see your local plan prices.
          </p>
        </div>
      )}

      {/* Pincode */}
      <Reveal variant="up" delay={120} className="mx-auto max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pincode.length === 6 && !loading) void load();
          }}
          className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:shadow-xl focus-within:shadow-brand-600/10 focus-within:ring-2 focus-within:ring-brand-500/60"
        >
          <div className="relative flex-1">
            <MapPin className="absolute top-3 left-3 size-4 text-slate-400" />
            <Input
              className="h-10 border-0 pl-9 shadow-none ring-0 hover:ring-0 focus:shadow-none focus:ring-0"
              inputMode="numeric"
              aria-label="Pricing pincode"
              value={pincode}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter pincode for live prices"
            />
          </div>
          <Button type="submit" className="rounded-xl" disabled={pincode.length !== 6 || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Show prices
          </Button>
        </form>
      </Reveal>

      {error && (
        <p role="alert" className="step-enter mt-3 text-center text-sm text-red-600">
          {error}
        </p>
      )}
      {area && (
        <p className="step-enter mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-slate-500">
          <Sparkles className="size-3.5 text-brand-500" /> Live prices for {area}
        </p>
      )}

      {/* Vehicle tabs: always for plans, after pincode for per-wash */}
      {(billing === "month" || services.length > 0) && (
        <div className="step-enter mt-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Vehicle type">
            {VEHICLES.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={vehicle === item.id}
                onClick={() => setVehicle(item.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300",
                  vehicle === item.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Per-wash packages */}
      {billing === "wash" && services.length > 0 && (
        <div key={`wash-${vehicle}`} className="mt-10 grid gap-6 lg:grid-cols-3">
          {visibleServices.map((service, index) => (
            <SpotlightCard
              key={service.id}
              className={cn(
                "interactive-card step-enter relative flex flex-col rounded-2xl bg-white p-8 ring-1",
                service.isPopular ? "shadow-xl ring-2 ring-brand-600" : "shadow-sm ring-slate-200",
              )}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {service.isPopular && (
                <span className="absolute -top-3 left-8 flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-brand-600/30">
                  <Sparkles className="size-3" /> Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{service.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{service.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{formatMoney((service.prices[vehicle] ?? 0) + areaCharge)}</span>
                <span className="text-sm text-slate-500">/ wash</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Clock className="size-4" />
                About {service.durationMin} min
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {service.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Check className="size-3.5" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href={`/book?service=${service.id}&vehicle=${vehicle}&pincode=${pincode}`}
                variant={service.isPopular ? "primary" : "secondary"}
                className="mt-8 w-full"
              >
                Book {service.name}
              </Button>
            </SpotlightCard>
          ))}
          {!visibleServices.length && (
            <p className="step-enter col-span-full rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
              No packages are priced for this vehicle type in {area}. Try another vehicle.
            </p>
          )}
        </div>
      )}

      {/* Monthly plans */}
      {billing === "month" && (
        <div key={`month-${vehicle}-${areaId}`} className="mt-10">
          {plans === null ? (
            <div className="grid gap-6 lg:grid-cols-3" aria-busy>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-white p-8 ring-1 ring-slate-200">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-3 h-3 w-48" />
                  <Skeleton className="mt-8 h-9 w-28" />
                  <Skeleton className="mt-6 h-24 w-full" />
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
              Monthly plans are not available {area ? `in ${area}` : "yet"}. Book a single wash instead.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const price = plan.prices[vehicle];
                const listPrice = plan.listPrices[vehicle];
                const visits = plan.visitsPerMonth;
                const total = price !== undefined ? price + areaCharge * visits : undefined;
                const save = price !== undefined && listPrice ? Math.max(0, Math.round((1 - price / listPrice) * 100)) : 0;
                return (
                  <SpotlightCard
                    key={plan.id}
                    className={cn(
                      "interactive-card step-enter relative flex flex-col rounded-2xl bg-white p-8 ring-1",
                      plan.isPopular ? "shadow-xl ring-2 ring-brand-600" : "shadow-sm ring-slate-200",
                    )}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {plan.isPopular && (
                      <span className="absolute -top-3 left-8 flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-brand-600/30">
                        <Sparkles className="size-3" /> Most popular
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                          plan.isPopular ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {plan.bonusCount ? `${plan.washesPerMonth} + ${plan.bonusCount}` : plan.washesPerMonth} / month
                      </span>
                    </div>

                    <div className="mt-6">
                      {priced && total !== undefined ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold tracking-tight">{formatMoney(total)}</span>
                            <span className="text-sm text-slate-500">/ month</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-600">About {formatMoney(Math.round(total / visits))} per visit</span>
                            {save > 0 && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Save {save}%</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold tracking-tight text-slate-400">Local price</p>
                          <p className="mt-1 text-xs text-slate-500">Enter your pincode above to see the monthly price.</p>
                        </>
                      )}
                    </div>

                    <div className="mt-5 space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 ring-1 ring-slate-200">
                      <p className="flex items-center gap-2">
                        <Repeat className="size-3.5 text-brand-600" /> Same day and slot every week
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarCheck className="size-3.5 text-brand-600" />
                        {plan.washesPerMonth} × {plan.service.name}
                        {plan.bonusService && plan.bonusCount > 0 ? ` + ${plan.bonusCount} × ${plan.bonusService.name}` : ""}
                      </p>
                    </div>

                    <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                            <Check className="size-3.5" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      href={`/plans/start?plan=${plan.id}&vehicle=${vehicle}${pincode.length === 6 ? `&pincode=${pincode}` : ""}`}
                      variant={plan.isPopular ? "primary" : "secondary"}
                      className="group mt-8 w-full"
                    >
                      Start {plan.name} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Button>
                    <p className="mt-3 text-center text-xs text-slate-500">Pause or cancel anytime. Paid month by month.</p>
                  </SpotlightCard>
                );
              })}
            </div>
          )}

          <Stagger className="mt-10 grid gap-4 md:grid-cols-3" step={100}>
            {PLAN_STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-md shadow-brand-600/25">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              </div>
            ))}
          </Stagger>
        </div>
      )}
    </div>
  );
}
