"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageHeader, Select, Toggle } from "@/components/ui";
import { CITIES, SERVICES, VEHICLE_TYPES, type Service, type VehicleType } from "@/lib/data";

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [city, setCity] = useState(CITIES[0].id);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  function setPrice(id: string, v: VehicleType, value: number) {
    setServices((ss) => ss.map((s) => (s.id === id ? { ...s, prices: { ...s.prices, [v]: value } } : s)));
    setDirty(true);
    setSaved(false);
  }

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description="Set which packages each city offers and what each vehicle type pays."
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <Check className="size-4" /> Saved
              </span>
            )}
            <Button
              disabled={!dirty}
              onClick={() => {
                setSaved(true);
                setDirty(false);
              }}
            >
              Save changes
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader
          title="Price list"
          description="Prices include taxes. Area travel charges are added on top."
          action={
            <Select value={city} onChange={(e) => setCity(e.target.value)} className="w-44">
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.isActive && " (inactive)"}
                </option>
              ))}
            </Select>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Package</th>
                {VEHICLE_TYPES.map((v) => (
                  <th key={v.id} className="px-5 py-3">
                    {v.label}
                  </th>
                ))}
                <th className="px-5 py-3">Offered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => (
                <tr key={s.id} className={s.isActive ? "" : "bg-slate-50/60"}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      {s.popular && <Badge tone="blue">Popular</Badge>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="size-3" /> {s.durationMin} min · {s.features.length} steps
                    </p>
                  </td>
                  {VEHICLE_TYPES.map((v) => (
                    <td key={v.id} className="px-5 py-4">
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={s.prices[v.id]}
                          onChange={(e) => setPrice(s.id, v.id, Number(e.target.value))}
                          className="h-9 w-full rounded-lg pr-2 pl-7 text-sm tabular-nums ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none"
                          aria-label={`${s.name} price for ${v.label}`}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-5 py-4">
                    <Toggle
                      checked={s.isActive}
                      onChange={(val) => {
                        setServices((ss) => ss.map((x) => (x.id === s.id ? { ...x, isActive: val } : x)));
                        setDirty(true);
                        setSaved(false);
                      }}
                      label={`Offer ${s.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.id} className="p-5">
            <h3 className="font-semibold text-slate-900">{s.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{s.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {s.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="size-4 shrink-0 text-brand-600" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
