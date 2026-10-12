"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, MapPin, Star, XCircle } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { Booking, Slot } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-state";
import { Button, Card, Input, Label, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";

type BookingList = { items: Booking[]; page: number; pageSize: number; total: number };
type Action = { kind: "cancel" | "review" | "reschedule"; booking: Booking } | null;

export default function BookingsPage() {
  const [scope, setScope] = useState<"upcoming" | "past" | "all">("all");
  const [data, setData] = useState<BookingList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await api<BookingList>(`/api/bookings?scope=${scope}&page=1&pageSize=50`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load bookings."); }
    finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (action?.kind !== "reschedule") return;
    setSaving(true); setSlotId("");
    api<Slot[]>(`/api/slots?areaId=${action.booking.areaId}&date=${date}`)
      .then(setSlots).catch((caught: ApiError) => setError(caught.message)).finally(() => setSaving(false));
  }, [action, date]);

  async function submitAction() {
    if (!action) return;
    setSaving(true); setError("");
    try {
      if (action.kind === "cancel") await api(`/api/bookings/${action.booking.id}/cancel`, { method: "POST", body: { reason: reason || undefined } });
      if (action.kind === "review") await api(`/api/bookings/${action.booking.id}/review`, { method: "POST", body: { rating: Number(rating), comment: comment || undefined } });
      if (action.kind === "reschedule") await api(`/api/bookings/${action.booking.id}/reschedule`, { method: "POST", body: { slotId } });
      setAction(null); setReason(""); setComment(""); setSlotId(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The booking could not be updated."); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <PageHeader title="My bookings" description="Live status, worker details and booking management." action={<Button href="/book">Book another wash</Button>} />
    <div className="mb-5 flex gap-2">{(["all", "upcoming", "past"] as const).map((item) => <Button key={item} size="sm" variant={scope === item ? "dark" : "secondary"} onClick={() => setScope(item)}>{item[0].toUpperCase() + item.slice(1)}</Button>)}</div>
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <LoadingState label="Loading your bookings…" /> : !data?.items.length ? <EmptyState title="No bookings yet" description="Your confirmed and completed washes will appear here." /> : <div key={scope} className="space-y-4">{data.items.map((booking, index) => <Card key={booking.id} hover className="step-enter p-5" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{booking.code} · {booking.service.name}</h2><StatusBadge status={booking.status} /></div><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="size-4" />{formatDate(booking.slot.date)}, {booking.slot.start}–{booking.slot.end}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4" />{booking.address.line}, {booking.area}, {booking.city}</p><p className="mt-1 text-sm text-slate-500">{booking.vehicle.makeModel} · {booking.vehicle.plate}</p>{booking.worker && <p className="mt-2 text-sm">Worker: <strong>{booking.worker.name}</strong>{booking.worker.phone ? ` · ${booking.worker.phone}` : ""}</p>}{booking.cancelledReason && <p className="mt-2 text-sm text-red-600">{booking.cancelledReason}</p>}</div>
        <div className="text-left sm:text-right"><p className="text-lg font-bold">{formatMoney(booking.price.total)}</p><div className="mt-3 flex flex-wrap gap-2 sm:justify-end">{["confirmed", "assigned", "accepted"].includes(booking.status) && <Button size="sm" variant="secondary" onClick={() => setAction({ kind: "reschedule", booking })}>Reschedule</Button>}{["pending_payment", "confirmed", "assigned", "accepted"].includes(booking.status) && <Button size="sm" variant="danger" onClick={() => setAction({ kind: "cancel", booking })}><XCircle className="size-4" />Cancel</Button>}{booking.status === "completed" && <Button size="sm" variant="secondary" onClick={() => setAction({ kind: "review", booking })}><Star className="size-4" />Rate</Button>}</div></div>
      </div>
    </Card>)}</div>}
    {error && !data && !loading && <ErrorState message={error} retry={load} />}

    <Modal open={!!action} onClose={() => setAction(null)} title={action?.kind === "cancel" ? "Cancel booking" : action?.kind === "review" ? "Rate your wash" : "Choose a new slot"} footer={<><Button variant="secondary" onClick={() => setAction(null)}>Close</Button><Button variant={action?.kind === "cancel" ? "danger" : "primary"} disabled={saving || (action?.kind === "reschedule" && !slotId)} onClick={submitAction}>{saving && <Loader2 className="size-4 animate-spin" />}{action?.kind === "cancel" ? "Confirm cancellation" : action?.kind === "review" ? "Submit review" : "Reschedule"}</Button></>}>
      {action?.kind === "cancel" && <div><Label htmlFor="reason">Reason (optional)</Label><Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div>}
      {action?.kind === "review" && <div className="space-y-4"><div><Label htmlFor="rating">Rating</Label><Select id="rating" value={rating} onChange={(event) => setRating(event.target.value)}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</Select></div><div><Label htmlFor="comment">Comment (optional)</Label><Input id="comment" value={comment} onChange={(event) => setComment(event.target.value)} /></div></div>}
      {action?.kind === "reschedule" && <div className="space-y-4"><div><Label htmlFor="date">New date</Label><Input id="date" type="date" value={date} min={new Date().toLocaleDateString("en-CA")} onChange={(event) => setDate(event.target.value)} /></div><div><Label htmlFor="slot">Available time</Label><Select id="slot" value={slotId} onChange={(event) => setSlotId(event.target.value)}><option value="">Choose a slot</option>{slots.filter((item) => item.bookable).map((item) => <option key={item.id} value={item.id}>{item.start}–{item.end} ({item.available} left)</option>)}</Select></div></div>}
    </Modal>
  </div>;
}
