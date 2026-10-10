"use client";

import { useEffect, useState } from "react";
import { Bike, Car, Check, Clock, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import type { CatalogService, Coverage, StartingPrices, VehicleType } from "@/lib/domain";
import { VEHICLES } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { Button, Input } from "@/components/ui";

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

  return (
    <div>
      <div className="mx-auto mb-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        {STARTING_PRICE_CARDS.map((item) => {
          const startingPrice = startingPrices?.[item.key];
          return (
            <div key={item.label} className="interactive-card group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                <item.icon className="size-6" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {startingPrices === undefined
                    ? "Loading…"
                    : startingPrice === null || startingPrice === undefined
                      ? "Check availability"
                      : `From ${formatMoney(startingPrice)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mb-5 text-center text-xs text-slate-500">
        Starting prices are the lowest active base rates across all cities. Enter your pincode for the actual price.
      </p>

      <div className="mx-auto flex max-w-md gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute top-3 left-3 size-4 text-slate-400" />
          <Input
            className="pl-9"
            inputMode="numeric"
            aria-label="Pricing pincode"
            value={pincode}
            onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter pincode for live prices"
          />
        </div>
        <Button onClick={load} disabled={pincode.length !== 6 || loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Show prices
        </Button>
      </div>

      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
      {area && <p className="mt-3 text-center text-sm text-slate-500">Live prices for {area}</p>}

      {services.length > 0 && (
        <>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Vehicle type">
              {VEHICLES.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={vehicle === item.id}
                  onClick={() => setVehicle(item.id)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200",
                    vehicle === item.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {services.filter((item) => item.prices[vehicle]).map((service) => (
              <div
                key={service.id}
                className={cn(
                  "interactive-card relative flex flex-col rounded-2xl bg-white p-8 ring-1",
                  service.isPopular ? "shadow-xl ring-2 ring-brand-600" : "shadow-sm ring-slate-200",
                )}
              >
                {service.isPopular && (
                  <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{service.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {formatMoney((service.prices[vehicle] ?? 0) + areaCharge)}
                  </span>
                  <span className="text-sm text-slate-500">/ wash</span>
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="size-4" />About {service.durationMin} min
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="size-5 text-brand-600" />
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
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
