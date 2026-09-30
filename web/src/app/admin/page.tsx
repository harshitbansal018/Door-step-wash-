import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarCheck, IndianRupee, Star, Users } from "lucide-react";
import { Avatar, Button, Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { BOOKINGS, CITIES, REVENUE_7D, WORKERS, cityName, serviceName } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export default function AdminDashboard() {
  const maxRevenue = Math.max(...REVENUE_7D.map((d) => d.amount));
  const weekRevenue = REVENUE_7D.reduce((s, d) => s + d.amount, 0);
  const unassigned = BOOKINGS.filter((b) => b.status === "confirmed");
  const online = WORKERS.filter((w) => w.online && w.status === "active");

  const cityStats = CITIES.filter((c) => c.isActive).map((c) => {
    const bookings = BOOKINGS.filter((b) => b.cityId === c.id && b.status !== "cancelled");
    return { city: c, count: bookings.length, revenue: bookings.reduce((s, b) => s + b.amount, 0) };
  });
  const totalCityRevenue = cityStats.reduce((s, c) => s + c.revenue, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Wednesday, 30 September 2026 · all active cities"
        action={<Button href="/admin/offers">Create offer</Button>}
      />

      {unassigned.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="size-5 text-amber-600" />
            {unassigned.length} paid booking{unassigned.length > 1 ? "s" : ""} waiting for a worker.
          </p>
          <Link href="/admin/bookings?status=confirmed" className="flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline">
            Assign now <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (7 days)" value={formatMoney(weekRevenue)} change={{ value: "+12.4%", positive: true }} icon={<IndianRupee className="size-5" />} />
        <StatCard label="Bookings today" value="38" change={{ value: "+6", positive: true }} icon={<CalendarCheck className="size-5" />} />
        <StatCard label="Workers online" value={`${online.length} / ${WORKERS.filter((w) => w.status === "active").length}`} icon={<Users className="size-5" />} />
        <StatCard label="Average rating" value="4.8" change={{ value: "−0.1", positive: false }} icon={<Star className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue" description="Last 7 days, after discounts" />
          <div className="px-5 pt-6 pb-5">
            <div className="flex h-56 items-end gap-3 sm:gap-6">
              {REVENUE_7D.map((d, i) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">
                    {formatMoney(d.amount)}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition ${i === REVENUE_7D.length - 1 ? "bg-brand-600" : "bg-brand-200 group-hover:bg-brand-300"}`}
                    style={{ height: `${(d.amount / maxRevenue) * 180}px` }}
                  />
                  <span className="text-xs text-slate-500">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue by city" description="Current bookings" />
          <div className="space-y-5 p-5">
            {cityStats.map((c) => (
              <div key={c.city.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-900">{c.city.name}</span>
                  <span className="text-slate-600">
                    {formatMoney(c.revenue)} · {c.count} bookings
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(c.revenue / totalCityRevenue) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-900">Workers online now</p>
              <div className="mt-3 space-y-3">
                {online.map((w) => (
                  <div key={w.id} className="flex items-center gap-3">
                    <Avatar name={w.name} className="size-8" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{w.name}</p>
                      <p className="text-xs text-slate-500">
                        {w.area}, {cityName(w.cityId)}
                      </p>
                    </div>
                    <span className="size-2 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Recent bookings"
          action={
            <Link href="/admin/bookings" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BOOKINGS.slice(0, 6).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 font-medium whitespace-nowrap text-slate-900">
                    {b.id}
                    <p className="text-xs font-normal text-slate-500">{b.slot}</p>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">{b.customer}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">{serviceName(b.serviceId)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">{cityName(b.cityId)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap text-slate-900">{formatMoney(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
