"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Briefcase, Star, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";

interface Dashboard {
  bookingsToday: number; unassigned: number; workersActive: number; workersOnline: number; averageRating: number | null;
  revenue7d: number; revenueByDay: { date: string; amount: number }[]; revenueByCity: { city: string; amount: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await api<Dashboard>("/api/admin/dashboard")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load dashboard."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (!data) return <ErrorState message={error || "Dashboard is unavailable."} retry={load} />;
  const max = Math.max(1, ...data.revenueByDay.map((item) => item.amount));
  return <>
    <PageHeader title="Dashboard" description="Live operations and revenue from Supabase." action={<Button href="/admin/bookings?status=confirmed">Assign {data.unassigned} bookings</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Bookings today" value={String(data.bookingsToday)} icon={<Briefcase className="size-5" />} /><StatCard label="Revenue (7 days)" value={formatMoney(data.revenue7d)} icon={<Banknote className="size-5" />} /><StatCard label="Active workers" value={`${data.workersOnline}/${data.workersActive} online`} icon={<UserCheck className="size-5" />} /><StatCard label="30-day rating" value={data.averageRating?.toFixed(1) ?? "No ratings"} icon={<Star className="size-5" />} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Revenue by day</h2><div className="mt-5 space-y-3">{data.revenueByDay.map((item) => <div key={item.date}><div className="mb-1 flex justify-between text-xs"><span>{formatDate(item.date)}</span><strong>{formatMoney(item.amount)}</strong></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-brand-600" style={{ width: `${Math.max(2, item.amount / max * 100)}%` }} /></div></div>)}</div></Card><Card className="p-5"><h2 className="font-semibold">Revenue by city</h2><div className="mt-4 divide-y">{data.revenueByCity.length ? data.revenueByCity.map((item) => <div key={item.city} className="flex justify-between py-3 text-sm"><span>{item.city}</span><strong>{formatMoney(item.amount)}</strong></div>) : <p className="py-8 text-center text-sm text-slate-500">No captured payments in the last seven days.</p>}</div></Card></div>
  </>;
}
