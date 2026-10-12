"use client";

import { useEffect, useState } from "react";
import { Bike, Car, Check, Clock, Loader2, MapPin, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { CatalogService, Coverage, StartingPrices, VehicleType } from "@/lib/domain";
import { VEHICLES } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { Button, Input, Skeleton } from "@/components/ui";

const STARTING_PRICE_CARDS = [
  { key: "bike", label: "Bike wash", icon: Bike },
  { key: "car", label: "Car wash", icon: Car },
] as const;

export function Pricing() {
  const [vehicle, setVehicle] = useState<VehicleType>("sedan");
  const [pincode, setPincode] = useState("");
  const [services, setServices] = useState<CatalogService[]>([]);
  const [area, setArea] = useState("");
  const [areaCharge, setAreaCharge] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startingPrices, setStartingPrices] = useState<StartingPrices>();

  useEffect(() => {
    let active = true;
    api<StartingPrices>("/api/pricing/starting")
      .then((prices) => {
        if (active) setStartingPrices(prices);
      })
      .catch(() => {
        if (active) setStartingPrices({ bike: null, car: null });
      });
    return () => {
      active = false;
    };
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const coverage = await api<Coverage>(`/api/coverage?pincode=${pincode}`);
      if (coverage.status !== "served" || !coverage.area) throw new Error("This pincode is not serviceable yet.");
      const catalog = await api<CatalogService[]>(`/api/catalog?areaId=${coverage.area.id}`);
      setServices(catalog);
      setArea(`${coverage.area.name}, ${coverage.city?.name}`);
      setAreaCharge(coverage.area.extraCharge);
    } catch (caught) {
      setServices([]);
      setAreaCharge(0);
      setError(caught instanceof Error ? caught.message : "Could not load pricing.");
    } finally {
      setLoading(false);
    }
  }

  const visibleServices = services.filter((item) => item.prices[vehicle]);

  return (
    <div>
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
      <Reveal variant="fade" delay={200}>
        <p className="mb-5 text-center text-xs text-slate-500">
          Starting prices are the lowest active base rates across all cities. Enter your pincode for the actual price.
        </p>
      </Reveal>

      <Reveal variant="up" delay={260} className="mx-auto max-w-md">
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

      {services.length > 0 && (
        <>
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
          <div key={vehicle} className="mt-10 grid gap-6 lg:grid-cols-3">
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
        </>
      )}
    </div>
  );
}
