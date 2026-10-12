"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-state";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import type { Area, City } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";

type CityForm = { name: string; state: string; launchDate: string; openTime: string; closeTime: string; slotMinutes: string; cancellationWindowMinutes: string };
type AreaForm = { name: string; extraCharge: string; pincodes: string };

const emptyCity: CityForm = { name: "", state: "", launchDate: "", openTime: "08:00", closeTime: "18:00", slotMinutes: "60", cancellationWindowMinutes: "120" };
const emptyArea: AreaForm = { name: "", extraCharge: "0", pincodes: "" };
const pincodeList = (value: string) => [...new Set(value.split(/[,\s]+/).filter(Boolean))];

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addingCity, setAddingCity] = useState(false);
  const [areaCity, setAreaCity] = useState<City | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [cityForm, setCityForm] = useState<CityForm>(emptyCity);
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyArea);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setCities(await api<City[]>("/api/admin/cities")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load cities."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    api<City[]>("/api/admin/cities")
      .then((rows) => { if (active) setCities(rows); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load cities."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cityPayload = () => ({
    name: cityForm.name,
    state: cityForm.state,
    ...(cityForm.launchDate ? { launchDate: cityForm.launchDate } : {}),
    openTime: cityForm.openTime,
    closeTime: cityForm.closeTime,
    slotMinutes: Number(cityForm.slotMinutes),
    cancellationWindowMinutes: Number(cityForm.cancellationWindowMinutes),
  });

  async function createCity() {
    setSaving(true); setError("");
    try { await api("/api/admin/cities", { method: "POST", body: cityPayload() }); setAddingCity(false); setCityForm(emptyCity); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create city."); }
    finally { setSaving(false); }
  }

  function openCityEditor(city: City) {
    setEditingCity(city);
    setCityForm({ name: city.name, state: city.state, launchDate: city.launch_date ?? "", openTime: city.open_time.slice(0, 5), closeTime: city.close_time.slice(0, 5), slotMinutes: String(city.slot_minutes), cancellationWindowMinutes: String(city.cancellation_window_minutes) });
  }

  async function saveCity() {
    if (!editingCity) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/cities/${editingCity.id}`, { method: "PATCH", body: cityPayload() }); setEditingCity(null); setCityForm(emptyCity); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update city."); }
    finally { setSaving(false); }
  }

  async function deleteCity(city: City) {
    if (!window.confirm(`Permanently delete ${city.name} and all of its unused areas, pincodes, prices and future slots? This cannot be undone.`)) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/cities/${city.id}`, { method: "DELETE" }); await load(); }
    catch (caught) { setError(caught instanceof Error ? `${caught.message} Deactivate the city instead if it has booking or worker history.` : "Could not delete city."); }
    finally { setSaving(false); }
  }

  async function createArea() {
    if (!areaCity) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/cities/${areaCity.id}/areas`, { method: "POST", body: { name: areaForm.name, extraCharge: Number(areaForm.extraCharge), pincodes: pincodeList(areaForm.pincodes) } }); setAreaCity(null); setAreaForm(emptyArea); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create area."); }
    finally { setSaving(false); }
  }

  function openAreaEditor(area: Area) {
    setEditingArea(area);
    setAreaForm({ name: area.name, extraCharge: String(area.extra_charge), pincodes: area.pincodes.join(", ") });
  }

  async function saveArea() {
    if (!editingArea) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/areas/${editingArea.id}`, { method: "PATCH", body: { name: areaForm.name, extraCharge: Number(areaForm.extraCharge), pincodes: pincodeList(areaForm.pincodes) } }); setEditingArea(null); setAreaForm(emptyArea); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update area."); }
    finally { setSaving(false); }
  }

  async function toggleCity(city: City, isActive: boolean) {
    try { await api(`/api/admin/cities/${city.id}`, { method: "PATCH", body: { isActive } }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update city."); }
  }

  async function toggleArea(area: Area, isActive: boolean) {
    try { await api(`/api/admin/areas/${area.id}`, { method: "PATCH", body: { isActive } }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update area."); }
  }

  async function deleteArea(area: Area) {
    if (!window.confirm(`Permanently delete ${area.name}, its pincodes and future slots? This cannot be undone.`)) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/areas/${area.id}`, { method: "DELETE" }); await load(); }
    catch (caught) { setError(caught instanceof Error ? `${caught.message} Deactivate the area instead if it has booking history.` : "Could not delete area."); }
    finally { setSaving(false); }
  }

  const cityFormFields = <div className="grid gap-4 sm:grid-cols-2">
    <div><Label htmlFor="city-name">City</Label><Input id="city-name" value={cityForm.name} onChange={(event) => setCityForm({ ...cityForm, name: event.target.value })} /></div>
    <div><Label htmlFor="state">State</Label><Input id="state" value={cityForm.state} onChange={(event) => setCityForm({ ...cityForm, state: event.target.value })} /></div>
    <div><Label htmlFor="launch-date">Launch date</Label><Input id="launch-date" type="date" value={cityForm.launchDate} onChange={(event) => setCityForm({ ...cityForm, launchDate: event.target.value })} /></div>
    <div><Label htmlFor="open">Open time</Label><Input id="open" type="time" value={cityForm.openTime} onChange={(event) => setCityForm({ ...cityForm, openTime: event.target.value })} /></div>
    <div><Label htmlFor="close">Close time</Label><Input id="close" type="time" value={cityForm.closeTime} onChange={(event) => setCityForm({ ...cityForm, closeTime: event.target.value })} /></div>
    <div><Label htmlFor="slot-minutes">Slot minutes</Label><Input id="slot-minutes" type="number" min="30" max="240" value={cityForm.slotMinutes} onChange={(event) => setCityForm({ ...cityForm, slotMinutes: event.target.value })} /></div>
    <div><Label htmlFor="cancel-window">Cancellation window (minutes)</Label><Input id="cancel-window" type="number" min="0" max="2880" value={cityForm.cancellationWindowMinutes} onChange={(event) => setCityForm({ ...cityForm, cancellationWindowMinutes: event.target.value })} /></div>
  </div>;

  const areaFormFields = <div className="space-y-4">
    <div><Label htmlFor="area-name">Area name</Label><Input id="area-name" value={areaForm.name} onChange={(event) => setAreaForm({ ...areaForm, name: event.target.value })} /></div>
    <div><Label htmlFor="pincodes">Pincodes (comma or space separated)</Label><Input id="pincodes" value={areaForm.pincodes} onChange={(event) => setAreaForm({ ...areaForm, pincodes: event.target.value.replace(/[^0-9,\s]/g, "") })} /></div>
    <div><Label htmlFor="charge">Extra charge</Label><Input id="charge" type="number" min="0" value={areaForm.extraCharge} onChange={(event) => setAreaForm({ ...areaForm, extraCharge: event.target.value })} /></div>
  </div>;

  return <>
    <PageHeader title="Cities & service areas" description="Create, edit, deactivate or permanently delete service locations." action={<Button onClick={() => { setCityForm(emptyCity); setAddingCity(true); }}><Plus className="size-4" />Add city</Button>} />
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <LoadingState /> : !cities.length ? <EmptyState title="No cities" description="Create a city and add service areas to start accepting bookings." /> : <div className="space-y-5">{cities.map((city) => <Card key={city.id} className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{city.name}, {city.state}</h2><Badge tone={city.is_active ? "green" : "slate"}>{city.is_active ? "Booking open" : "Inactive"}</Badge></div><p className="mt-1 text-xs text-slate-500">{city.open_time.slice(0, 5)}–{city.close_time.slice(0, 5)} · {city.slot_minutes}-minute slots · {city.areas.length} areas</p></div>
        <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="secondary" onClick={() => { setAreaForm(emptyArea); setAreaCity(city); }}><Plus className="size-4" />Area</Button><Button size="sm" variant="ghost" onClick={() => openCityEditor(city)}><Pencil className="size-4" />Edit</Button><Toggle checked={city.is_active} onChange={(value) => toggleCity(city, value)} label={`Toggle ${city.name}`} /><Button size="sm" variant="ghost" disabled={saving} onClick={() => deleteCity(city)}><Trash2 className="size-4 text-red-600" /><span className="sr-only">Delete {city.name}</span></Button></div>
      </div>
      <div className="divide-y">{city.areas.map((area) => <div key={area.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="flex items-center gap-2 font-medium"><MapPin className="size-4 text-brand-600" />{area.name}</p><p className="mt-1 text-xs text-slate-500">{area.pincodes.join(", ")} · travel charge {formatMoney(area.extra_charge)}</p></div>
        <div className="flex items-center gap-2"><Badge tone={area.is_active ? "green" : "slate"}>{area.is_active ? "Active" : "Inactive"}</Badge><Toggle checked={area.is_active} onChange={(value) => toggleArea(area, value)} label={`Toggle ${area.name}`} /><Button size="sm" variant="ghost" onClick={() => openAreaEditor(area)}><Pencil className="size-4" />Edit</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => deleteArea(area)}><Trash2 className="size-4 text-red-600" /><span className="sr-only">Delete {area.name}</span></Button></div>
      </div>)}{!city.areas.length && <p className="p-5 text-sm text-slate-500">No areas yet.</p>}</div>
    </Card>)}</div>}
    {!loading && error && !cities.length && <ErrorState message={error} retry={load} />}

    <Modal open={addingCity} onClose={() => setAddingCity(false)} title="Add city" footer={<><Button variant="secondary" onClick={() => setAddingCity(false)}>Cancel</Button><Button disabled={saving || cityForm.name.length < 2 || cityForm.state.length < 2} onClick={createCity}>{saving && <Loader2 className="size-4 animate-spin" />}Create city</Button></>}>{cityFormFields}</Modal>
    <Modal open={!!editingCity} onClose={() => setEditingCity(null)} title={`Edit ${editingCity?.name ?? "city"}`} footer={<><Button variant="secondary" onClick={() => setEditingCity(null)}>Cancel</Button><Button disabled={saving || cityForm.name.length < 2 || cityForm.state.length < 2} onClick={saveCity}>{saving && <Loader2 className="size-4 animate-spin" />}Save city</Button></>}>{cityFormFields}</Modal>
    <Modal open={!!areaCity} onClose={() => setAreaCity(null)} title={`Add area to ${areaCity?.name ?? "city"}`} footer={<><Button variant="secondary" onClick={() => setAreaCity(null)}>Cancel</Button><Button disabled={saving || areaForm.name.length < 2 || pincodeList(areaForm.pincodes).length === 0} onClick={createArea}>{saving && <Loader2 className="size-4 animate-spin" />}Create area</Button></>}>{areaFormFields}</Modal>
    <Modal open={!!editingArea} onClose={() => setEditingArea(null)} title={`Edit ${editingArea?.name ?? "area"}`} footer={<><Button variant="secondary" onClick={() => setEditingArea(null)}>Cancel</Button><Button disabled={saving || areaForm.name.length < 2 || pincodeList(areaForm.pincodes).length === 0} onClick={saveArea}>{saving && <Loader2 className="size-4 animate-spin" />}Save area</Button></>}>{areaFormFields}</Modal>
  </>;
}
