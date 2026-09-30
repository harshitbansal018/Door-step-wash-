"use client";

import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Toggle } from "@/components/ui";
import { CITIES, WORKERS, type City } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/utils";

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>(CITIES);
  const [adding, setAdding] = useState(false);
  const [areaFor, setAreaFor] = useState<City | null>(null);
  const [form, setForm] = useState({ name: "", state: "", launchDate: "" });
  const [areaForm, setAreaForm] = useState({ name: "", pincodes: "", extraCharge: "0" });

  const update = (id: string, fn: (c: City) => City) => setCities((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  return (
    <>
      <PageHeader
        title="Cities & areas"
        description="Bookings are only accepted in active cities, inside active service areas."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add city
          </Button>
        }
      />

      <div className="space-y-6">
        {cities.map((c) => {
          const workers = WORKERS.filter((w) => w.cityId === c.id && w.status === "active").length;
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{c.name}</h2>
                      {c.isActive ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">
                      {c.state} · {c.areas.length} areas · {workers} active workers · launch {formatDate(c.launchDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">{c.isActive ? "Accepting bookings" : "Bookings off"}</span>
                  <Toggle
                    checked={c.isActive}
                    onChange={(v) => update(c.id, (x) => ({ ...x, isActive: v }))}
                    label={`Toggle ${c.name}`}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5">Area</th>
                      <th className="px-5 py-2.5">Pincodes</th>
                      <th className="px-5 py-2.5">Travel charge</th>
                      <th className="px-5 py-2.5">Active</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {c.areas.map((a) => (
                      <tr key={a.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">{a.name}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {a.pincodes.map((p) => (
                              <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{a.extraCharge ? formatMoney(a.extraCharge) : "None"}</td>
                        <td className="px-5 py-3">
                          <Toggle
                            checked={a.isActive}
                            onChange={(v) =>
                              update(c.id, (x) => ({
                                ...x,
                                areas: x.areas.map((y) => (y.id === a.id ? { ...y, isActive: v } : y)),
                              }))
                            }
                            label={`Toggle ${a.name}`}
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${a.name}`}
                            onClick={() => update(c.id, (x) => ({ ...x, areas: x.areas.filter((y) => y.id !== a.id) }))}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-3">
                <button onClick={() => setAreaFor(c)} className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  <Plus className="size-4" /> Add service area
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a city"
        description="New cities start inactive. Add areas, prices and workers, then switch it on."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name || !form.state}
              onClick={() => {
                setCities((cs) => [
                  ...cs,
                  {
                    id: form.name.toLowerCase().replace(/\s+/g, "-"),
                    name: form.name,
                    state: form.state,
                    isActive: false,
                    launchDate: form.launchDate || new Date().toISOString().slice(0, 10),
                    areas: [],
                  },
                ]);
                setForm({ name: "", state: "", launchDate: "" });
                setAdding(false);
              }}
            >
              Add city
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="city-name">City name</Label>
            <Input id="city-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bengaluru" />
          </div>
          <div>
            <Label htmlFor="city-state">State</Label>
            <Input id="city-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Karnataka" />
          </div>
          <div>
            <Label htmlFor="city-launch">Planned launch date</Label>
            <Input id="city-launch" type="date" value={form.launchDate} onChange={(e) => setForm({ ...form, launchDate: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!areaFor}
        onClose={() => setAreaFor(null)}
        title={`Add area in ${areaFor?.name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAreaFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={!areaForm.name || !areaForm.pincodes}
              onClick={() => {
                if (!areaFor) return;
                update(areaFor.id, (x) => ({
                  ...x,
                  areas: [
                    ...x.areas,
                    {
                      id: `${x.id}-${Date.now()}`,
                      name: areaForm.name,
                      pincodes: areaForm.pincodes.split(/[\s,]+/).filter(Boolean),
                      isActive: true,
                      extraCharge: Number(areaForm.extraCharge) || 0,
                    },
                  ],
                }));
                setAreaForm({ name: "", pincodes: "", extraCharge: "0" });
                setAreaFor(null);
              }}
            >
              Add area
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="area-name">Area name</Label>
            <Input id="area-name" value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="e.g. Golf Course Road" />
          </div>
          <div>
            <Label htmlFor="area-pins">Pincodes</Label>
            <Input id="area-pins" value={areaForm.pincodes} onChange={(e) => setAreaForm({ ...areaForm, pincodes: e.target.value })} placeholder="122002, 122011" />
          </div>
          <div>
            <Label htmlFor="area-charge">Travel charge (₹)</Label>
            <Input id="area-charge" type="number" min={0} value={areaForm.extraCharge} onChange={(e) => setAreaForm({ ...areaForm, extraCharge: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  );
}
