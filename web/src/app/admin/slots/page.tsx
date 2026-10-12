"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Button, Card, Input, Label, Modal, PageHeader, Select, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import type { City } from "@/lib/domain";

interface AdminSlot { id: string; area_id: string; slot_date: string; start_time: string; end_time: string; capacity: number; booked: number; is_blocked: boolean }
type SlotForm = { areaId: string; date: string; startTime: string; endTime: string; capacity: string; isBlocked: boolean };

const today = () => new Date().toLocaleDateString("en-CA");

export default function AdminSlotsPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [areaId, setAreaId] = useState("");
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminSlot | null>(null);
  const [form, setForm] = useState<SlotForm>({ areaId: "", date: today(), startTime: "08:00", endTime: "09:00", capacity: "1", isBlocked: false });

  const areas = cities.flatMap((city) => city.areas.map((area) => ({ ...area, city: city.name })));

  const loadSlots = useCallback(async () => {
    if (!areaId) { setSlots([]); return; }
    setSlotLoading(true); setError("");
    try { setSlots(await api<AdminSlot[]>(`/api/admin/slots?areaId=${areaId}&date=${date}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load slots."); }
    finally { setSlotLoading(false); }
  }, [areaId, date]);

  useEffect(() => {
    let active = true;
    api<City[]>("/api/admin/cities")
      .then((rows) => { if (!active) return; setCities(rows); setAreaId(rows.flatMap((city) => city.areas).find((area) => area.is_active)?.id ?? rows[0]?.areas[0]?.id ?? ""); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load areas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!areaId) return;
    let active = true;
    api<AdminSlot[]>(`/api/admin/slots?areaId=${areaId}&date=${date}`)
      .then((rows) => { if (active) setSlots(rows); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load slots."); });
    return () => { active = false; };
  }, [areaId, date]);

  const payload = () => ({ areaId: form.areaId, date: form.date, startTime: form.startTime, endTime: form.endTime, capacity: Number(form.capacity), isBlocked: form.isBlocked });

  function openCreate() {
    setForm({ areaId, date, startTime: "08:00", endTime: "09:00", capacity: "1", isBlocked: false });
    setAdding(true); setNotice(""); setError("");
  }

  function openEdit(slot: AdminSlot) {
    setForm({ areaId: slot.area_id, date: slot.slot_date, startTime: slot.start_time.slice(0, 5), endTime: slot.end_time.slice(0, 5), capacity: String(slot.capacity), isBlocked: slot.is_blocked });
    setEditing(slot); setNotice(""); setError("");
  }

  async function create() {
    setSaving(true); setError("");
    try { await api("/api/admin/slots", { method: "POST", body: payload() }); setAdding(false); setAreaId(form.areaId); setDate(form.date); setNotice("Time slot created."); await loadSlots(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create slot."); }
    finally { setSaving(false); }
  }

  async function save() {
    if (!editing) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/slots/${editing.id}`, { method: "PATCH", body: payload() }); setEditing(null); setNotice("Time slot updated."); await loadSlots(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update slot."); }
    finally { setSaving(false); }
  }

  async function update(slot: AdminSlot, patch: { capacity?: number; isBlocked?: boolean }) {
    setSaving(true); setError("");
    try { await api(`/api/admin/slots/${slot.id}`, { method: "PATCH", body: patch }); await loadSlots(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update slot."); }
    finally { setSaving(false); }
  }

  async function remove(slot: AdminSlot) {
    if (!window.confirm(`Permanently delete the ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)} slot on ${slot.slot_date}?`)) return;
    setSaving(true); setError(""); setNotice("");
    try { await api(`/api/admin/slots/${slot.id}`, { method: "DELETE" }); setNotice("Time slot deleted."); await loadSlots(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete slot. Block it instead if it has booking history."); }
    finally { setSaving(false); }
  }

  async function generate() {
    setSaving(true); setError(""); setNotice("");
    try { const result = await api<{ created: number }>("/api/admin/slots/generate", { method: "POST", body: { days: 14 } }); setNotice(`Generated ${result.created} new slots.`); await loadSlots(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not generate slots."); }
    finally { setSaving(false); }
  }

  const validForm = form.areaId && form.date && form.startTime && form.endTime && form.endTime > form.startTime && Number(form.capacity) >= 0 && Number(form.capacity) <= 50;
  const fields = <div className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><Label htmlFor="manage-slot-area">Service area</Label><Select id="manage-slot-area" value={form.areaId} onChange={(event) => setForm({ ...form, areaId: event.target.value })}>{areas.map((area) => <option key={area.id} value={area.id}>{area.city} · {area.name}</option>)}</Select></div>
    <div><Label htmlFor="manage-slot-date">Date</Label><Input id="manage-slot-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
    <div><Label htmlFor="manage-slot-capacity">Capacity</Label><Input id="manage-slot-capacity" type="number" min={editing?.booked ?? 0} max="50" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></div>
    <div><Label htmlFor="manage-slot-start">Start time</Label><Input id="manage-slot-start" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div>
    <div><Label htmlFor="manage-slot-end">End time</Label><Input id="manage-slot-end" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></div>
    <label className="flex items-center gap-3 text-sm font-medium text-slate-700 sm:col-span-2"><Toggle checked={form.isBlocked} onChange={(value) => setForm({ ...form, isBlocked: value })} label="Block this slot" />Block this slot from customer bookings</label>
    {editing && editing.booked > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">This slot has {editing.booked} booking(s). Its area, date and time cannot be changed; capacity can only be set to {editing.booked} or higher.</p>}
  </div>;

  return <>
    <PageHeader title="Time slots" description="Create, edit, block and delete individual booking slots." action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={generate} disabled={saving}><CalendarPlus className="size-4" />Generate 14 days</Button><Button onClick={openCreate} disabled={!areas.length || saving}><Plus className="size-4" />Add slot</Button></div>} />
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="slot-area">Area</Label><Select id="slot-area" value={areaId} onChange={(event) => setAreaId(event.target.value)}><option value="">Select an area</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.city} · {area.name}</option>)}</Select></div><div><Label htmlFor="slot-date">Date</Label><Input id="slot-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
    {loading || slotLoading ? <LoadingState /> : !areaId ? <EmptyState title="No service areas" description="Create a city and service area before adding time slots." /> : !slots.length ? <EmptyState title="No slots" description="Add an individual slot or generate slots for active locations." /> : <Card className="overflow-hidden"><div className="divide-y">{slots.map((slot) => <div key={slot.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex-1"><strong>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</strong><p className="text-xs text-slate-500">{slot.booked} booked of {slot.capacity}{slot.is_blocked ? " · blocked" : ""}</p></div><div className="flex flex-wrap items-center gap-2"><Label htmlFor={`capacity-${slot.id}`}>Capacity</Label><Input id={`capacity-${slot.id}`} className="w-20" type="number" min={slot.booked} max="50" defaultValue={slot.capacity} onBlur={(event) => { const value = Number(event.target.value); if (value !== slot.capacity) void update(slot, { capacity: value }); }} /><span className="text-sm">Blocked</span><Toggle checked={slot.is_blocked} onChange={(value) => update(slot, { isBlocked: value })} label={`Block ${slot.start_time}`} /><Button size="sm" variant="ghost" onClick={() => openEdit(slot)}><Pencil className="size-4" />Edit</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => remove(slot)}><Trash2 className="size-4 text-red-600" /><span className="sr-only">Delete slot</span></Button></div></div>)}</div></Card>}
    <Modal open={adding} onClose={() => setAdding(false)} title="Add time slot" footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={saving || !validForm} onClick={create}>{saving && <Loader2 className="size-4 animate-spin" />}Create slot</Button></>}>{fields}</Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit time slot" footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving || !validForm || Number(form.capacity) < (editing?.booked ?? 0)} onClick={save}>{saving && <Loader2 className="size-4 animate-spin" />}Save slot</Button></>}>{fields}</Modal>
    {saving && <div className="fixed right-5 bottom-5 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"><Loader2 className="size-4 animate-spin" />Saving…</div>}
  </>;
}
