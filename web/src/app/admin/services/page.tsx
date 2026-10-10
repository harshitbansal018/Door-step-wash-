"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import type { City, VehicleType } from "@/lib/domain";
import { VEHICLES } from "@/lib/domain";
import { Badge, Button, Card, Input, Label, PageHeader, Select, Toggle } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/data-state";

interface AdminService { id: string; name: string; description: string; duration_min: number; features: string[]; is_popular: boolean; is_active: boolean; prices: { vehicleType: VehicleType; price: number; isActive: boolean }[] }

export default function AdminServicesPage() {
  const [cities, setCities] = useState<City[]>([]); const [cityId, setCityId] = useState(""); const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const loadCities = useCallback(async () => { try { const rows = await api<City[]>("/api/admin/cities"); setCities(rows); setCityId((old) => old || rows[0]?.id || ""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load cities."); setLoading(false); } }, []);
  useEffect(() => { void loadCities(); }, [loadCities]);
  const load = useCallback(async () => { if (!cityId) return; setLoading(true); setError(""); try { const rows = await api<AdminService[]>(`/api/admin/services?cityId=${cityId}`); setServices(rows); const next: Record<string,string> = {}; rows.forEach((service) => VEHICLES.forEach((vehicle) => { const price = service.prices.find((item) => item.vehicleType === vehicle.id); next[`${service.id}:${vehicle.id}`] = price ? String(price.price) : ""; })); setPrices(next); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load services."); } finally { setLoading(false); } }, [cityId]);
  useEffect(() => { void load(); }, [load]);
  async function updateService(service: AdminService, patch: Record<string, unknown>) { setSaving(true); try { await api(`/api/admin/services/${service.id}`, { method: "PATCH", body: patch }); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update service."); } finally { setSaving(false); } }
  async function savePrices() { setSaving(true); try { const payload = services.flatMap((service) => VEHICLES.flatMap((vehicle) => { const value = Number(prices[`${service.id}:${vehicle.id}`]); return value > 0 ? [{ serviceId: service.id, vehicleType: vehicle.id, price: value, isActive: true }] : []; })); if (!payload.length) throw new Error("Enter at least one price."); await api("/api/admin/prices", { method: "PUT", body: { cityId, prices: payload } }); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save prices."); } finally { setSaving(false); } }
  async function generateSlots() { setSaving(true); try { const result = await api<{ created: number }>("/api/admin/slots/generate", { method: "POST", body: { days: 14 } }); setError(`Generated ${result.created} new slots.`); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not generate slots."); } finally { setSaving(false); } }
  return <>
    <PageHeader title="Services & pricing" description="Manage the live catalog and city-specific prices." action={<div className="flex gap-2"><Button variant="secondary" onClick={generateSlots} disabled={saving}><CalendarPlus className="size-4" />Generate slots</Button><Button onClick={savePrices} disabled={saving || !cityId}><Save className="size-4" />Save prices</Button></div>} />
    {error && <div role="status" className={`mb-4 rounded-lg p-3 text-sm ${error.startsWith("Generated") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{error}</div>}
    <div className="mb-5 max-w-sm"><Label htmlFor="pricing-city">Pricing city</Label><Select id="pricing-city" value={cityId} onChange={(event) => setCityId(event.target.value)}>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</Select></div>
    {loading ? <LoadingState /> : !services.length ? <ErrorState message="No services exist in the database." retry={load} /> : <div className="space-y-5">{services.map((service) => <Card key={service.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold">{service.name}</h2>{service.is_popular && <Badge tone="blue">Popular</Badge>}<Badge tone={service.is_active ? "green" : "slate"}>{service.is_active ? "Active" : "Hidden"}</Badge></div><p className="mt-1 text-sm text-slate-500">{service.description}</p><p className="mt-2 text-xs text-slate-500">{service.duration_min} minutes · {service.features.join(" · ")}</p></div><div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm">Popular<Toggle checked={service.is_popular} onChange={(value) => updateService(service, { isPopular: value })} label={`Popular ${service.name}`} /></label><label className="flex items-center gap-2 text-sm">Active<Toggle checked={service.is_active} onChange={(value) => updateService(service, { isActive: value })} label={`Active ${service.name}`} /></label></div></div><div className="mt-5 grid gap-3 sm:grid-cols-4">{VEHICLES.map((vehicle) => <div key={vehicle.id}><Label htmlFor={`${service.id}-${vehicle.id}`}>{vehicle.label} price</Label><Input id={`${service.id}-${vehicle.id}`} type="number" min="1" value={prices[`${service.id}:${vehicle.id}`] ?? ""} onChange={(event) => setPrices({ ...prices, [`${service.id}:${vehicle.id}`]: event.target.value })} /></div>)}</div></Card>)}</div>}
    {saving && <div className="fixed right-5 bottom-5 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"><Loader2 className="size-4 animate-spin" />Saving…</div>}
  </>;
}
