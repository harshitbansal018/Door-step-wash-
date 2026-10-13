"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Car, ChevronRight, Clock3, MapPin, Repeat, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Booking, BookingDetails, BookingStatus, SubscriptionSummary } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { CustomerBookingDetails } from "@/components/site/booking-details";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Avatar, Badge, Button, Card, Modal, PageHeader, StatusBadge } from "@/components/ui";

type BookingList = { items: Booking[]; total: number };
type Me = { user: { fullName: string; email: string } };
const UPCOMING: BookingStatus[] = ["pending_payment", "confirmed", "assigned", "accepted", "on_the_way", "in_progress"];
const PROGRESS: { status: BookingStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "assigned", label: "Assigned" },
  { status: "accepted", label: "Accepted" },
  { status: "on_the_way", label: "On the way" },
  { status: "in_progress", label: "Washing" },
  { status: "completed", label: "Complete" },
];

export default function CustomerDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [plan, setPlan] = useState<SubscriptionSummary | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<Booking | null>(null);
  const [detail, setDetail] = useState<BookingDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [bookingData, planData, me] = await Promise.all([
        api<BookingList>("/api/bookings?scope=all&page=1&pageSize=50"),
        api<SubscriptionSummary | null>("/api/subscriptions"),
        api<Me>("/api/auth/me"),
      ]);
      setBookings(bookingData.items); setPlan(planData); setName(me.user.fullName.split(" ")[0] || me.user.email.split("@")[0]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your dashboard."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const nextBooking = useMemo(() => bookings.filter((booking) => UPCOMING.includes(booking.status)).sort((a, b) => `${a.slot.date}T${a.slot.start}`.localeCompare(`${b.slot.date}T${b.slot.start}`))[0] ?? null, [bookings]);
  const completed = bookings.filter((booking) => booking.status === "completed").length;
  const upcoming = bookings.filter((booking) => UPCOMING.includes(booking.status)).length;

  async function openDetails(booking: Booking) {
    setViewing(booking); setDetail(null); setDetailLoading(true); setError("");
    try { setDetail(await api<BookingDetails>(`/api/bookings/${booking.id}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load booking details."); setViewing(null); }
    finally { setDetailLoading(false); }
  }

  const closeDetails = () => { setViewing(null); setDetail(null); };
  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><LoadingState label="Preparing your dashboard…" rows={4} /></div>;
  if (error && !bookings.length && !plan) return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><ErrorState message={error} retry={load} /></div>;

  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <PageHeader title={name ? `Welcome back, ${name}` : "Your dashboard"} description="Your next wash, plan and recent activity in one place." action={<Button href="/book"><Sparkles className="size-4" />Book a wash</Button>} />
    {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>}

    <div className="grid gap-5 lg:grid-cols-3">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20 sm:p-8 lg:col-span-2">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-40" />
        <div aria-hidden className="absolute -top-24 -right-20 size-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.16em] text-brand-300 uppercase">Next wash</p>
          {nextBooking ? <>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold">{nextBooking.service.name}</h2><StatusBadge status={nextBooking.status} />{nextBooking.subscriptionId && <Badge tone="violet">Plan</Badge>}</div><p className="mt-1 text-xs font-medium tracking-wide text-slate-400">{nextBooking.code}</p><p className="mt-3 flex items-center gap-2 text-sm text-slate-300"><CalendarDays className="size-4 text-brand-300" />{formatDate(nextBooking.slot.date)}, {nextBooking.slot.start} – {nextBooking.slot.end}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><MapPin className="size-4 text-brand-300" />{nextBooking.area}, {nextBooking.city}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><Car className="size-4 text-brand-300" />{nextBooking.vehicle.makeModel} · {nextBooking.vehicle.plate}</p></div>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => openDetails(nextBooking)}>View details</Button><Button href="/bookings" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">Manage</Button></div>
            </div>
            <div className="mt-7 grid grid-cols-6 gap-1.5">{PROGRESS.map((step, index) => { const current = PROGRESS.findIndex((item) => item.status === nextBooking.status); const active = current >= 0 && index <= current; return <div key={step.status}><div className={`h-1.5 rounded-full ${active ? "bg-brand-400" : "bg-white/15"}`} /><p className={`mt-2 hidden text-[10px] sm:block ${active ? "text-white" : "text-slate-500"}`}>{step.label}</p></div>; })}</div>
            {nextBooking.worker && <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5"><Avatar name={nextBooking.worker.name} className="bg-white/10 text-white" /><div><p className="text-sm font-semibold">{nextBooking.worker.name}</p><p className="text-xs text-slate-400">Your service partner{nextBooking.worker.phone ? ` · ${nextBooking.worker.phone}` : ""}</p></div></div>}
          </> : <div className="py-8"><h2 className="text-2xl font-bold">No wash scheduled</h2><p className="mt-2 max-w-md text-sm text-slate-300">Choose a service and a convenient time. We’ll bring everything needed to your doorstep.</p><Button href="/book" className="mt-5">Schedule a wash <ArrowRight className="size-4" /></Button></div>}
        </div>
      </section>

      <Card className="overflow-hidden p-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Monthly plan</p><h2 className="mt-2 text-xl font-bold text-slate-900">{plan?.subscription.plan.name ?? "Wash smarter"}</h2></div><span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Repeat className="size-5" /></span></div>
        {plan ? <><div className="mt-6 flex items-end justify-between"><div><span className="text-4xl font-bold text-slate-900">{plan.subscription.washes.remaining}</span><span className="ml-1 text-sm text-slate-500">washes left</span></div><Badge tone={plan.subscription.status === "active" ? "green" : "amber"}>{plan.subscription.status.replaceAll("_", " ")}</Badge></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${plan.subscription.washes.total ? (plan.subscription.washes.remaining / plan.subscription.washes.total) * 100 : 0}%` }} /></div><p className="mt-3 text-xs text-slate-500">{plan.subscription.period.end ? `Current period ends ${formatDate(plan.subscription.period.end)}` : "Payment pending"}</p><Button href="/plan" variant="secondary" className="mt-5 w-full">Manage plan <ChevronRight className="size-4" /></Button></> : <><p className="mt-4 text-sm leading-6 text-slate-600">Save on regular washes with a fixed weekly slot and one monthly payment.</p><Button href="/pricing#monthly-plans" variant="secondary" className="mt-5 w-full">Explore plans</Button></>}
      </Card>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="p-4"><p className="text-xs text-slate-500">Upcoming</p><p className="mt-1 text-2xl font-bold">{upcoming}</p></Card>
      <Card className="p-4"><p className="text-xs text-slate-500">Completed</p><p className="mt-1 text-2xl font-bold">{completed}</p></Card>
      <Card className="p-4"><p className="text-xs text-slate-500">Plan savings</p><p className="mt-1 text-2xl font-bold">{formatMoney(plan?.savings ?? 0)}</p></Card>
      <Card className="p-4"><p className="text-xs text-slate-500">Plan balance</p><p className="mt-1 text-2xl font-bold">{plan?.subscription.washes.remaining ?? 0}</p></Card>
    </div>

    <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_.8fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Recent bookings</h2><p className="text-sm text-slate-500">Your latest wash activity</p></div><Button href="/bookings" size="sm" variant="ghost">View all <ArrowRight className="size-4" /></Button></div>{bookings.length ? <div className="divide-y divide-slate-100">{bookings.slice(0, 5).map((booking) => <button key={booking.id} onClick={() => openDetails(booking)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"><span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700"><span>{new Date(`${booking.slot.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short" })}</span><span className="text-base">{Number(booking.slot.date.slice(-2))}</span></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{booking.service.name} · {booking.vehicle.makeModel}</p><p className="truncate text-xs text-slate-500">{booking.slot.start} · {booking.area}, {booking.city}</p></div><StatusBadge status={booking.status} /><ChevronRight className="size-4 text-slate-300" /></button>)}</div> : <div className="p-8 text-center"><p className="text-sm text-slate-500">Your bookings will appear here.</p></div>}</Card>

      <div><h2 className="mb-3 font-semibold text-slate-900">Quick actions</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{[
        { href: "/book", icon: <Sparkles className="size-5" />, title: "Book another wash", text: "Choose a service and time" },
        { href: "/bookings", icon: <Clock3 className="size-5" />, title: "Manage bookings", text: "Reschedule, cancel or review" },
        { href: "/plan", icon: <Repeat className="size-5" />, title: "Manage monthly plan", text: "Visits, renewal and billing" },
        { href: "/account", icon: <Settings className="size-5" />, title: "Account & security", text: "Profile and password" },
      ].map((item) => <a key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{item.icon}</span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{item.title}</strong><span className="block text-xs text-slate-500">{item.text}</span></span><ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" /></a>)}</div><div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100"><ShieldCheck className="size-5 shrink-0" /><p className="text-xs leading-5">Your payments and booking details are protected.</p></div></div>
    </div>

    <Modal open={!!viewing} onClose={closeDetails} size="lg" title={`Booking ${viewing?.code ?? "details"}`} description="Everything about this doorstep wash." footer={<Button variant="secondary" onClick={closeDetails}>Close</Button>}>{detailLoading ? <LoadingState rows={4} label="Loading booking details…" /> : detail ? <CustomerBookingDetails booking={detail} /> : null}</Modal>
  </div>;
}
