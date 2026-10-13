"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { City, VehicleType } from "@/lib/domain";
import { VEHICLES } from "@/lib/domain";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select, Toggle } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-state";

interface AdminService {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration_min: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  prices: { vehicleType: VehicleType; price: number; isActive: boolean }[];
}

type Draft = { name: string; description: string; durationMin: string; features: string; sortOrder: string };

const emptyDraft: Draft = { name: "", description: "", durationMin: "30", features: "", sortOrder: "0" };
const toDraft = (s: AdminService): Draft => ({
  name: s.name,
  description: s.description,
  durationMin: String(s.duration_min),
  features: s.features.join("\n"),
  sortOrder: String(s.sort_order),
});
const fromDraft = (d: Draft) => ({
  name: d.name,
  description: d.description,
  durationMin: Number(d.durationMin),
  features: d.features.split("\n").map((line) => line.trim()).filter(Boolean),
  sortOrder: Number(d.sortOrder),
});

function ServiceFields({ id, draft, onChange }: { id: string; draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor={`${id}-name`}>Name</Label><Input id={`${id}-name`} value={draft.name} onChange={(e) => onChange({ name: e.target.value })} /></div>
      <div><Label htmlFor={`${id}-duration`}>Duration (minutes)</Label><Input id={`${id}-duration`} type="number" min="10" max="480" value={draft.durationMin} onChange={(e) => onChange({ durationMin: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label htmlFor={`${id}-description`}>Description</Label><Input id={`${id}-description`} value={draft.description} onChange={(e) => onChange({ description: e.target.value })} /></div>
      <div className="sm:col-span-2">
        <Label htmlFor={`${id}-features`}>What&apos;s included (one per line)</Label>
        <textarea
          id={`${id}-features`}
          rows={4}
          value={draft.features}
          onChange={(e) => onChange({ features: e.target.value })}
          className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none"
        />
      </div>
      <div><Label htmlFor={`${id}-sort`}>Display order</Label><Input id={`${id}-sort`} type="number" min="0" value={draft.sortOrder} onChange={(e) => onChange({ sortOrder: e.target.value })} /></div>
    </div>
  );
}

export default function AdminServicesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
  const [services, setServices] = useState<AdminService[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [deleting, setDeleting] = useState<AdminService | null>(null);

  const fail = (caught: unknown, fallback: string) =>
    setNotice({ tone: "error", text: caught instanceof Error ? caught.message : fallback });

  const loadCities = useCallback(async () => {
    try {
      const rows = await api<City[]>("/api/admin/cities");
      setCities(rows);
      if (!rows.length) setLoading(false);
      setCityId((old) => old || rows[0]?.id || "");
    } catch (caught) {
      fail(caught, "Could not load cities.");
      setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    try {
      const rows = await api<AdminService[]>(`/api/admin/services?cityId=${cityId}`);
      setServices(rows);
      const nextPrices: Record<string, string> = {};
      const nextDrafts: Record<string, Draft> = {};
      rows.forEach((service) => {
        VEHICLES.forEach((vehicle) => {
          const price = service.prices.find((item) => item.vehicleType === vehicle.id);
          nextPrices[`${service.id}:${vehicle.id}`] = price ? String(price.price) : "";
        });
        nextDrafts[service.id] = toDraft(service);
      });
      setPrices(nextPrices);
      setDrafts(nextDrafts);
    } catch (caught) {
      fail(caught, "Could not load services.");
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCities(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCities]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function withSaving(work: () => Promise<string>, fallback: string) {
    setSaving(true);
    setNotice(null);
    try {
      const text = await work();
      setNotice({ tone: "ok", text });
    } catch (caught) {
      fail(caught, fallback);
    } finally {
      setSaving(false);
    }
  }

  const patchService = (service: AdminService, body: Record<string, unknown>) =>
    withSaving(async () => {
      await api(`/api/admin/services/${service.id}`, { method: "PATCH", body });
      await load();
      return `${body.name ?? service.name} updated.`;
    }, "Could not update the service.");

  const createService = () =>
    withSaving(async () => {
      await api("/api/admin/services", { method: "POST", body: fromDraft(newDraft) });
      setAdding(false);
      setNewDraft(emptyDraft);
      await load();
      return `${newDraft.name} created. Add its prices below and save.`;
    }, "Could not create the service.");

  const deleteService = () =>
    withSaving(async () => {
      if (!deleting) return "";
      await api(`/api/admin/services/${deleting.id}`, { method: "DELETE" });
      const name = deleting.name;
      setDeleting(null);
      await load();
      return `${name} deleted.`;
    }, "Could not delete the service.");

  const savePrices = () =>
    withSaving(async () => {
      // Blank or 0 removes the price for that vehicle in this city.
      const payload = services.flatMap((service) =>
        VEHICLES.map((vehicle) => {
          const raw = prices[`${service.id}:${vehicle.id}`];
          const value = raw === "" || raw === undefined ? 0 : Number(raw);
          if (!Number.isInteger(value) || value < 0) throw new Error("Prices must be non-negative whole rupees.");
          const existing = service.prices.find((p) => p.vehicleType === vehicle.id);
          const existed = !!existing;
          return value > 0 || existed ? [{ serviceId: service.id, vehicleType: vehicle.id, price: value, isActive: existing?.isActive ?? true }] : [];
        }).flat(),
      );
      if (!payload.length) throw new Error("Enter at least one price.");
      await api("/api/admin/prices", { method: "PUT", body: { cityId, prices: payload } });
      await load();
      return "Prices saved.";
    }, "Could not save prices.");

  const generateSlots = () =>
    withSaving(async () => {
      const result = await api<{ created: number }>("/api/admin/slots/generate", { method: "POST", body: { days: 14 } });
      return `Generated ${result.created} new slots.`;
    }, "Could not generate slots.");

  const updateDraft = (id: string, patch: Partial<Draft>) => setDrafts((old) => ({ ...old, [id]: { ...old[id], ...patch } }));

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description="Add, edit or remove wash packages and set their price per city and vehicle."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={generateSlots} disabled={saving}><CalendarPlus className="size-4" />Generate slots</Button>
            <Button variant="secondary" onClick={() => setAdding(true)} disabled={saving}><Plus className="size-4" />Add service</Button>
            <Button onClick={savePrices} disabled={saving || loading || !cityId}><Save className="size-4" />Save prices</Button>
          </div>
        }
      />
      {notice && (
        <div role="status" className={`mb-4 rounded-lg p-3 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {notice.text}
        </div>
      )}
      <div className="mb-5 max-w-sm">
        <Label htmlFor="pricing-city">Pricing city</Label>
        <Select id="pricing-city" value={cityId} onChange={(event) => setCityId(event.target.value)}>
          {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : !cityId ? (
        <ErrorState message="Create a city first, then add services and prices." retry={loadCities} />
      ) : !services.length ? (
        <EmptyState title="No services yet" description="Add your first wash package with the button above." />
      ) : (
        <div className="space-y-5">
          {services.map((service) => {
            const draft = drafts[service.id];
            return (
              <Card key={service.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{service.name}</h2>
                      {service.is_popular && <Badge tone="blue">Popular</Badge>}
                      <Badge tone={service.is_active ? "green" : "slate"}>{service.is_active ? "Live" : "Hidden"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{service.duration_min} min · slug {service.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">Popular<Toggle checked={service.is_popular} onChange={(value) => patchService(service, { isPopular: value })} label={`Popular ${service.name}`} /></label>
                    <label className="flex items-center gap-2 text-sm">Live<Toggle checked={service.is_active} onChange={(value) => patchService(service, { isActive: value })} label={`Live ${service.name}`} /></label>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={saving} onClick={() => setDeleting(service)}>
                      <Trash2 className="size-4" />Delete
                    </Button>
                  </div>
                </div>

                {draft && (
                  <div className="mt-5">
                    <ServiceFields id={service.id} draft={draft} onChange={(patch) => updateDraft(service.id, patch)} />
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="secondary" disabled={saving} onClick={() => patchService(service, fromDraft(draft))}>
                        <Save className="size-4" />Save details
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Price per wash in this city (blank = not offered)</p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {VEHICLES.map((vehicle) => (
                      <div key={vehicle.id}>
                        <Label htmlFor={`${service.id}-${vehicle.id}`}>{vehicle.label}</Label>
                        <Input
                          id={`${service.id}-${vehicle.id}`}
                          type="number"
                          min="0"
                          placeholder="Not offered"
                          value={prices[`${service.id}:${vehicle.id}`] ?? ""}
                          onChange={(event) => setPrices({ ...prices, [`${service.id}:${vehicle.id}`]: event.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add service"
        description="The package appears on the site once it has at least one price."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button disabled={saving || newDraft.name.trim().length < 2 || Number(newDraft.durationMin) < 10} onClick={createService}>
              {saving && <Loader2 className="size-4 animate-spin" />}Create service
            </Button>
          </>
        }
      >
        <ServiceFields id="new" draft={newDraft} onChange={(patch) => setNewDraft((old) => ({ ...old, ...patch }))} />
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? "service"}?`}
        description="This removes the package and its prices in every city. Services with booking history or monthly plans cannot be deleted; hide them instead."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Keep</Button>
            <Button variant="danger" disabled={saving} onClick={deleteService}>
              {saving && <Loader2 className="size-4 animate-spin" />}Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Customers will no longer see this package. Existing bookings are not affected.</p>
      </Modal>

      {saving && (
        <div className="fixed right-5 bottom-5 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <Loader2 className="size-4 animate-spin" />Saving…
        </div>
      )}
    </>
  );
}
