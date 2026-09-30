"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui";
import { SERVICES, VEHICLE_TYPES, type VehicleType } from "@/lib/data";
import { cn, formatMoney } from "@/lib/utils";

export function Pricing() {
  const [vehicle, setVehicle] = useState<VehicleType>("sedan");

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Vehicle type">
          {VEHICLE_TYPES.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={vehicle === v.id}
              onClick={() => setVehicle(v.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition sm:px-6",
                vehicle === v.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <div
            key={s.id}
            className={cn(
              "relative flex flex-col rounded-2xl bg-white p-8 ring-1",
              s.popular ? "shadow-xl ring-2 ring-brand-600" : "shadow-sm ring-slate-200",
            )}
          >
            {s.popular && (
              <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-slate-900">{s.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{s.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-slate-900">{formatMoney(s.prices[vehicle])}</span>
              <span className="text-sm text-slate-500">/ wash</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock className="size-3.5" /> About {s.durationMin} min
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
              {s.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="size-5 shrink-0 text-brand-600" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              href={`/book?service=${s.id}&vehicle=${vehicle}`}
              variant={s.popular ? "primary" : "secondary"}
              className="mt-8 w-full"
            >
              Book {s.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
