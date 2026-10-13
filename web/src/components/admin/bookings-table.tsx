"use client";
/* eslint-disable @next/next/no-img-element -- job photos use short-lived signed storage URLs */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Car, CreditCard, Download, Eye, Loader2, MapPin, Search, Star, UserPlus, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Booking, BookingStatus, City } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Input, Label, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";
import { EmptyState, LoadingState } from "@/components/data-state";

type BookingList = { items: Booking[]; page: number; pageSize: number; total: number };
type Candidate = { id: string; name: string; rating: number; isOnline: boolean; jobsDone: number };
type BookingDetail = Booking & {
  notes: string | null;
  timeline: { status: BookingStatus; at: string }[];
  photos: { kind: "before" | "after"; url: string | null }[];
  payment: { status: string; amount: number; method: string | null; provider_payment_id: string | null; created_at: string } | null;
};

const TABS: { id: string; label: string; statuses?: BookingStatus[] }[] = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Unassigned", statuses: ["confirmed"] },
  { id: "active", label: "In progress", statuses: ["assigned", "accepted", "on_the_way", "in_progress"] },
  { id: "completed", label: "Completed", statuses: ["completed"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled", "expired"] },
];
const CANCELLABLE: BookingStatus[] = ["pending_payment", "confirmed", "assigned", "accepted", "on_the_way", "in_progress"];
const words = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function DetailSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>{title}</h3><div className="mt-3 space-y-2 text-sm text-slate-600">{children}</div></section>;
}

function DetailRow({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-slate-500">{label}</span><span className={strong ? "text-right font-semibold text-slate-900" : "text-right text-slate-700"}>{value}</span></div>;
}

function BookingDetails({ booking }: { booking: BookingDetail }) {
  const address = [booking.address.line, booking.address.landmark, booking.area, booking.city, booking.address.pincode].filter(Boolean).join(", ");
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-950 p-4 text-white"><div><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-bold">{booking.code}</span><StatusBadge status={booking.status} />{booking.subscriptionId && <Badge tone="violet">Monthly plan</Badge>}</div><p className="mt-1 text-sm text-slate-300">Created {new Date(booking.createdAt).toLocaleString("en-IN")}</p></div><p className="text-xl font-bold">{formatMoney(booking.price.total)}</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <DetailSection title="Schedule & service" icon={<CalendarDays className="size-4" />}><DetailRow label="Service" value={booking.service.name} strong /><DetailRow label="Date" value={formatDate(booking.slot.date)} /><DetailRow label="Time" value={`${booking.slot.start} – ${booking.slot.end}`} /></DetailSection>
      <DetailSection title="Customer & vehicle" icon={<Car className="size-4" />}><DetailRow label="Customer" value={booking.contact.name} strong /><DetailRow label="Phone" value={booking.contact.phone ? <a className="text-brand-700 hover:underline" href={`tel:${booking.contact.phone}`}>{booking.contact.phone}</a> : "—"} /><DetailRow label="Vehicle" value={`${booking.vehicle.makeModel} (${words(booking.vehicle.type)})`} /><DetailRow label="Registration" value={booking.vehicle.plate} /></DetailSection>
      <DetailSection title="Location & access" icon={<MapPin className="size-4" />}><p className="leading-6 text-slate-700">{address}</p><DetailRow label="Parking" value={words(booking.address.parkingType)} />{booking.address.parkingSpot && <DetailRow label="Parking spot" value={booking.address.parkingSpot} />}<DetailRow label="Car access" value={words(booking.address.carAccess)} /></DetailSection>
      <DetailSection title="Price & payment" icon={<CreditCard className="size-4" />}><DetailRow label="Service price" value={formatMoney(booking.price.base)} /><DetailRow label="Area charge" value={formatMoney(booking.price.areaCharge)} /><DetailRow label="Discount" value={booking.price.discount ? `−${formatMoney(booking.price.discount)}` : formatMoney(0)} /><div className="border-t border-slate-200 pt-2"><DetailRow label="Total" value={formatMoney(booking.price.total)} strong /></div><DetailRow label="Payment" value={booking.payment ? words(booking.payment.status) : "No payment record"} />{booking.payment?.method && <DetailRow label="Method" value={words(booking.payment.method)} />}{booking.payment?.provider_payment_id && <DetailRow label="Payment ID" value={<span className="break-all font-mono text-xs">{booking.payment.provider_payment_id}</span>} />}</DetailSection>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <DetailSection title="Assigned worker" icon={<UserPlus className="size-4" />}>{booking.worker ? <div className="flex items-center gap-3"><Avatar name={booking.worker.name} /><div><p className="font-semibold text-slate-900">{booking.worker.name}</p><p className="text-xs text-slate-500">Rating {booking.worker.rating || "New"}{booking.worker.phone ? ` · ${booking.worker.phone}` : ""}</p></div></div> : <p>No worker assigned.</p>}</DetailSection>
      <DetailSection title="Customer instructions" icon={<Eye className="size-4" />}><p className="leading-6 text-slate-700">{booking.notes || "No additional instructions."}</p>{booking.cancelledReason && <p className="rounded-lg bg-red-50 p-3 text-red-700"><strong>Cancellation:</strong> {booking.cancelledReason}</p>}</DetailSection>
    </div>
    <section><h3 className="text-sm font-semibold text-slate-900">Status timeline</h3><ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{booking.timeline.map((item, index) => <li key={`${item.status}-${item.at}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 p-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" /><div><p className="text-sm font-medium text-slate-800">{words(item.status)}</p><p className="text-xs text-slate-500">{new Date(item.at).toLocaleString("en-IN")}</p></div></li>)}{!booking.timeline.length && <li className="text-sm text-slate-500">No status history yet.</li>}</ol></section>
    {!!booking.photos.length && <section><h3 className="text-sm font-semibold text-slate-900">Job photos</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{booking.photos.map((photo, index) => photo.url && <a key={`${photo.kind}-${index}`} href={photo.url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl bg-slate-100"><img src={photo.url} alt={`${words(photo.kind)} wash`} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" /><span className="absolute inset-x-2 bottom-2 rounded-md bg-slate-950/75 px-2 py-1 text-center text-xs font-medium text-white">{words(photo.kind)}</span></a>)}</div></section>}
  </div>;
}

export function BookingsTable({ initialStatus }: { initialStatus: string }) {
  const [rows, setRows] = useState<Booking[]>([]); const [cities, setCities] = useState<City[]>([]);
  const [tab, setTab] = useState(TABS.some((item) => item.id === initialStatus) ? initialStatus : "all");
  const [cityId, setCityId] = useState(""); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [assigning, setAssigning] = useState<Booking | null>(null); const [candidates, setCandidates] = useState<Candidate[]>([]); const [workerId, setWorkerId] = useState("");
  const [cancelling, setCancelling] = useState<Booking | null>(null); const [reason, setReason] = useState(""); const [refund, setRefund] = useState(true);
  const [viewing, setViewing] = useState<Booking | null>(null); const [detail, setDetail] = useState<BookingDetail | null>(null); const [detailLoading, setDetailLoading] = useState(false);

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

  async function viewDetails(booking: Booking) { setViewing(booking); setDetail(null); setDetailLoading(true); setError(""); try { setDetail(await api<BookingDetail>(`/api/admin/bookings/${booking.id}`)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load booking details."); setViewing(null); } finally { setDetailLoading(false); } }
  async function openAssign(booking: Booking) { setAssigning(booking); setWorkerId(""); setCandidates([]); setError(""); try { setCandidates(await api<Candidate[]>(`/api/admin/bookings/${booking.id}/candidates`)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load workers."); } }
  async function assign() { if (!assigning || !workerId) return; setSaving(true); try { await api(`/api/admin/bookings/${assigning.id}/assign`, { method: "POST", body: { workerId } }); setAssigning(null); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not assign worker."); } finally { setSaving(false); } }
  async function cancel() { if (!cancelling || reason.trim().length < 3) return; setSaving(true); try { await api(`/api/admin/bookings/${cancelling.id}/cancel`, { method: "POST", body: { reason, refund } }); setCancelling(null); setReason(""); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not cancel booking."); } finally { setSaving(false); } }
  function exportCsv() { const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; const lines = [["Code", "Customer", "Phone", "Service", "City", "Area", "Date", "Time", "Status", "Amount", "Worker"], ...rows.map((item) => [item.code, item.contact.name, item.contact.phone, item.service.name, item.city, item.area, item.slot.date, `${item.slot.start}-${item.slot.end}`, item.status, item.price.total, item.worker?.name ?? ""])].map((line) => line.map(quote).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([lines], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `bookings-${new Date().toLocaleDateString("en-CA")}.csv`; anchor.click(); URL.revokeObjectURL(url); }

  const activeTab = useMemo(() => TABS.find((item) => item.id === tab), [tab]);
  const closeDetails = () => { setViewing(null); setDetail(null); };
  return <>
    <PageHeader title="Bookings" description="Live bookings across every city." action={<Button variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" />Export CSV</Button>} />
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:justify-between"><div className="scroll-slim flex gap-1 overflow-x-auto">{TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item.label}</button>)}</div><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute top-3 left-3 size-4 text-slate-400" /><Input aria-label="Search bookings" className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, customer, phone, plate" /></div><Select aria-label="City" value={cityId} onChange={(event) => setCityId(event.target.value)}><option value="">All cities</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</Select></div></div>
      {loading ? <LoadingState /> : !rows.length ? <div className="p-5"><EmptyState title="No bookings" description={`No ${activeTab?.label.toLowerCase()} bookings match these filters.`} /></div> : <div className="scroll-slim overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Booking</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Vehicle & service</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((booking) => <tr key={booking.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><strong>{booking.code}</strong><span className="block text-xs text-slate-500">{formatDate(booking.slot.date)} · {booking.slot.start}</span></td><td className="px-5 py-4">{booking.contact.name}<span className="block text-xs text-slate-500">{booking.contact.phone}</span></td><td className="px-5 py-4">{booking.service.name}<span className="block text-xs text-slate-500">{booking.vehicle.makeModel} · {booking.vehicle.plate}</span></td><td className="px-5 py-4">{booking.area}<span className="block text-xs text-slate-500">{booking.city}</span></td><td className="px-5 py-4">{booking.worker ? <div className="flex items-center gap-2"><Avatar name={booking.worker.name} className="size-7" />{booking.worker.name}</div> : booking.status === "confirmed" ? <Button size="sm" onClick={() => openAssign(booking)}><UserPlus className="size-4" />Assign</Button> : "—"}</td><td className="px-5 py-4"><StatusBadge status={booking.status} /></td><td className="px-5 py-4 text-right font-semibold">{formatMoney(booking.price.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => viewDetails(booking)}><Eye className="size-4" />View</Button>{CANCELLABLE.includes(booking.status) && <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setCancelling(booking)}><XCircle className="size-4" />Cancel</Button>}</div></td></tr>)}</tbody></table></div>}
    </Card>
    <Modal open={!!viewing} onClose={closeDetails} size="lg" title={`Booking ${viewing?.code ?? "details"}`} description="Complete customer, service, payment and fulfilment information." footer={<Button variant="secondary" onClick={closeDetails}>Close</Button>}>{detailLoading ? <LoadingState rows={4} label="Loading booking details…" /> : detail ? <BookingDetails booking={detail} /> : null}</Modal>
    <Modal open={!!assigning} onClose={() => setAssigning(null)} title={`Assign ${assigning?.code ?? "booking"}`} footer={<><Button variant="secondary" onClick={() => setAssigning(null)}>Close</Button><Button disabled={!workerId || saving} onClick={assign}>{saving && <Loader2 className="size-4 animate-spin" />}Assign</Button></>}><div className="space-y-2">{candidates.map((worker) => <label key={worker.id} className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 ring-1 ${workerId === worker.id ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200"}`}><input type="radio" name="worker" value={worker.id} checked={workerId === worker.id} onChange={() => setWorkerId(worker.id)} /><Avatar name={worker.name} /><span className="flex-1"><strong>{worker.name}</strong><span className="block text-xs text-slate-500">{worker.jobsDone} jobs · {worker.isOnline ? "Online" : "Offline"}</span></span><span className="flex items-center gap-1"><Star className="size-4 fill-amber-400 text-amber-400" />{worker.rating}</span></label>)}{!candidates.length && <p className="text-sm text-slate-500">No active workers are available in this area.</p>}</div></Modal>
    <Modal open={!!cancelling} onClose={() => setCancelling(null)} title={`Cancel ${cancelling?.code ?? "booking"}`} footer={<><Button variant="secondary" onClick={() => setCancelling(null)}>Close</Button><Button variant="danger" disabled={reason.trim().length < 3 || saving} onClick={cancel}>{saving && <Loader2 className="size-4 animate-spin" />}Cancel booking</Button></>}><div className="space-y-4"><div><Label htmlFor="cancel-reason">Reason</Label><Input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refund} onChange={(event) => setRefund(event.target.checked)} />Issue full refund when a captured payment exists</label></div></Modal>
  </>;
}
