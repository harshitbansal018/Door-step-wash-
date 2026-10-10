"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Search, Star, UserPlus, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Booking, BookingStatus, City } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { Avatar, Button, Card, Input, Label, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";
import { EmptyState, LoadingState } from "@/components/data-state";

type BookingList = { items: Booking[]; page: number; pageSize: number; total: number };
type Candidate = { id: string; name: string; rating: number; isOnline: boolean; jobsDone: number };
const TABS: { id: string; label: string; statuses?: BookingStatus[] }[] = [
  { id: "all", label: "All" }, { id: "confirmed", label: "Unassigned", statuses: ["confirmed"] },
  { id: "active", label: "In progress", statuses: ["assigned", "accepted", "on_the_way", "in_progress"] },
  { id: "completed", label: "Completed", statuses: ["completed"] }, { id: "cancelled", label: "Cancelled", statuses: ["cancelled", "expired"] },
];

export function BookingsTable({ initialStatus }: { initialStatus: string }) {
  const [rows, setRows] = useState<Booking[]>([]); const [cities, setCities] = useState<City[]>([]);
  const [tab, setTab] = useState(TABS.some((item) => item.id === initialStatus) ? initialStatus : "all");
  const [cityId, setCityId] = useState(""); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [assigning, setAssigning] = useState<Booking | null>(null); const [candidates, setCandidates] = useState<Candidate[]>([]); const [workerId, setWorkerId] = useState("");
  const [cancelling, setCancelling] = useState<Booking | null>(null); const [reason, setReason] = useState(""); const [refund, setRefund] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const selected = TABS.find((item) => item.id === tab);
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (selected?.statuses) params.set("status", selected.statuses.join(",")); if (cityId) params.set("cityId", cityId); if (query.trim()) params.set("search", query.trim());
    try { const [bookings, cityRows] = await Promise.all([api<BookingList>(`/api/admin/bookings?${params}`), api<City[]>("/api/admin/cities")]); setRows(bookings.items); setCities(cityRows); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load bookings."); }
    finally { setLoading(false); }
  }, [tab, cityId, query]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);

  async function openAssign(booking: Booking) { setAssigning(booking); setWorkerId(""); setCandidates([]); setError(""); try { setCandidates(await api<Candidate[]>(`/api/admin/bookings/${booking.id}/candidates`)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load workers."); } }
  async function assign() { if (!assigning || !workerId) return; setSaving(true); try { await api(`/api/admin/bookings/${assigning.id}/assign`, { method: "POST", body: { workerId } }); setAssigning(null); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not assign worker."); } finally { setSaving(false); } }
  async function cancel() { if (!cancelling || reason.trim().length < 3) return; setSaving(true); try { await api(`/api/admin/bookings/${cancelling.id}/cancel`, { method: "POST", body: { reason, refund } }); setCancelling(null); setReason(""); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not cancel booking."); } finally { setSaving(false); } }
  function exportCsv() { const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; const lines = [["Code","Customer","Phone","Service","City","Area","Date","Time","Status","Amount","Worker"], ...rows.map((item) => [item.code,item.contact.name,item.contact.phone,item.service.name,item.city,item.area,item.slot.date,`${item.slot.start}-${item.slot.end}`,item.status,item.price.total,item.worker?.name ?? ""])].map((line) => line.map(quote).join(",")).join("\n"); const blob = new Blob([lines], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `bookings-${new Date().toLocaleDateString("en-CA")}.csv`; anchor.click(); URL.revokeObjectURL(url); }

  const activeTab = useMemo(() => TABS.find((item) => item.id === tab), [tab]);
  return <>
    <PageHeader title="Bookings" description="Live bookings across every city." action={<Button variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" />Export CSV</Button>} />
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:justify-between"><div className="flex gap-1 overflow-x-auto">{TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item.label}</button>)}</div><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute top-3 left-3 size-4 text-slate-400" /><Input aria-label="Search bookings" className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, customer, phone, plate" /></div><Select aria-label="City" value={cityId} onChange={(event) => setCityId(event.target.value)}><option value="">All cities</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</Select></div></div>
      {loading ? <LoadingState /> : !rows.length ? <div className="p-5"><EmptyState title="No bookings" description={`No ${activeTab?.label.toLowerCase()} bookings match these filters.`} /></div> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Booking</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Vehicle & service</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((booking) => <tr key={booking.id}><td className="px-5 py-4"><strong>{booking.code}</strong><span className="block text-xs text-slate-500">{formatDate(booking.slot.date)} · {booking.slot.start}</span></td><td className="px-5 py-4">{booking.contact.name}<span className="block text-xs text-slate-500">{booking.contact.phone}</span></td><td className="px-5 py-4">{booking.service.name}<span className="block text-xs text-slate-500">{booking.vehicle.makeModel} · {booking.vehicle.plate}</span></td><td className="px-5 py-4">{booking.area}<span className="block text-xs text-slate-500">{booking.city}</span></td><td className="px-5 py-4">{booking.worker ? <div className="flex items-center gap-2"><Avatar name={booking.worker.name} className="size-7" />{booking.worker.name}</div> : booking.status === "confirmed" ? <Button size="sm" onClick={() => openAssign(booking)}><UserPlus className="size-4" />Assign</Button> : "—"}</td><td className="px-5 py-4"><StatusBadge status={booking.status} /></td><td className="px-5 py-4 text-right font-semibold">{formatMoney(booking.price.total)}</td><td className="px-5 py-4 text-right">{["pending_payment","confirmed","assigned","accepted","on_the_way","in_progress"].includes(booking.status) && <Button size="sm" variant="ghost" onClick={() => setCancelling(booking)}><XCircle className="size-4" />Cancel</Button>}</td></tr>)}</tbody></table></div>}
    </Card>
    <Modal open={!!assigning} onClose={() => setAssigning(null)} title={`Assign ${assigning?.code ?? "booking"}`} footer={<><Button variant="secondary" onClick={() => setAssigning(null)}>Close</Button><Button disabled={!workerId || saving} onClick={assign}>{saving && <Loader2 className="size-4 animate-spin" />}Assign</Button></>}><div className="space-y-2">{candidates.map((worker) => <label key={worker.id} className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 ring-1 ${workerId === worker.id ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200"}`}><input type="radio" name="worker" value={worker.id} checked={workerId === worker.id} onChange={() => setWorkerId(worker.id)} /><Avatar name={worker.name} /><span className="flex-1"><strong>{worker.name}</strong><span className="block text-xs text-slate-500">{worker.jobsDone} jobs · {worker.isOnline ? "Online" : "Offline"}</span></span><span className="flex items-center gap-1"><Star className="size-4 fill-amber-400 text-amber-400" />{worker.rating}</span></label>)}{!candidates.length && <p className="text-sm text-slate-500">No active workers are available in this area.</p>}</div></Modal>
    <Modal open={!!cancelling} onClose={() => setCancelling(null)} title={`Cancel ${cancelling?.code ?? "booking"}`} footer={<><Button variant="secondary" onClick={() => setCancelling(null)}>Close</Button><Button variant="danger" disabled={reason.trim().length < 3 || saving} onClick={cancel}>{saving && <Loader2 className="size-4 animate-spin" />}Cancel booking</Button></>}><div className="space-y-4"><div><Label htmlFor="cancel-reason">Reason</Label><Input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refund} onChange={(event) => setRefund(event.target.checked)} />Issue full refund when a captured payment exists</label></div></Modal>
  </>;
}
