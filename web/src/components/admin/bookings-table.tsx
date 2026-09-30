"use client";

import { useMemo, useState } from "react";
import { Download, Search, Star, UserPlus } from "lucide-react";
import { Avatar, Button, Card, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";
import {
  BOOKINGS,
  CITIES,
  WORKERS,
  cityName,
  serviceName,
  workerById,
  type Booking,
  type BookingStatus,
} from "@/lib/data";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const TABS: { id: string; label: string; match: (s: BookingStatus) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "confirmed", label: "Unassigned", match: (s) => s === "confirmed" },
  { id: "active", label: "In progress", match: (s) => ["assigned", "accepted", "on_the_way", "in_progress"].includes(s) },
  { id: "completed", label: "Completed", match: (s) => s === "completed" },
  { id: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" },
];

export function BookingsTable({ initialStatus }: { initialStatus: string }) {
  const [rows, setRows] = useState<Booking[]>(BOOKINGS);
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialStatus) ? initialStatus : "all");
  const [city, setCity] = useState("all");
  const [query, setQuery] = useState("");
  const [assigning, setAssigning] = useState<Booking | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>("");

  const filtered = useMemo(() => {
    const t = TABS.find((x) => x.id === tab)!;
    const q = query.trim().toLowerCase();
    return rows.filter(
      (b) =>
        t.match(b.status) &&
        (city === "all" || b.cityId === city) &&
        (!q || [b.id, b.customer, b.phone, b.plate].some((v) => v.toLowerCase().includes(q))),
    );
  }, [rows, tab, city, query]);

  const candidates = assigning
    ? WORKERS.filter((w) => w.cityId === assigning.cityId && w.status === "active").sort(
        (a, b) => Number(b.online) - Number(a.online) || b.rating - a.rating,
      )
    : [];

  function assign() {
    if (!assigning || !selectedWorker) return;
    setRows((rs) =>
      rs.map((b) => (b.id === assigning.id ? { ...b, workerId: selectedWorker, status: "assigned" } : b)),
    );
    setAssigning(null);
    setSelectedWorker("");
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="View, filter and assign every booking across your cities."
        action={
          <Button variant="secondary">
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const count = rows.filter((b) => t.match(b.status)).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                    tab === t.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {t.label}
                  <span className={cn("rounded-full px-1.5 text-xs", tab === t.id ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ID, name, phone, plate"
                className="h-10 w-full rounded-lg pr-3 pl-9 text-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>
            <Select value={city} onChange={(e) => setCity(e.target.value)} className="w-40">
              <option value="all">All cities</option>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Vehicle &amp; service</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Worker</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const worker = workerById(b.workerId);
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{b.id}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(b.date)} · {b.slot}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{b.customer}</p>
                      <p className="text-xs text-slate-500">+91 {b.phone}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-slate-900">{serviceName(b.serviceId)}</p>
                      <p className="text-xs text-slate-500">
                        {b.vehicle} · {b.plate}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-slate-900">{b.area}</p>
                      <p className="text-xs text-slate-500">{cityName(b.cityId)}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {worker ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={worker.name} className="size-7 text-[10px]" />
                          <span className="text-slate-900">{worker.name}</span>
                        </div>
                      ) : b.status === "confirmed" ? (
                        <Button size="sm" onClick={() => setAssigning(b)}>
                          <UserPlus className="size-4" /> Assign
                        </Button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <p className="font-medium text-slate-900">{formatMoney(b.amount)}</p>
                      <p className="text-xs text-slate-500">
                        {b.payment}
                        {b.offerCode && ` · ${b.offerCode}`}
                      </p>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                    No bookings match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
          <span>
            Showing {filtered.length} of {rows.length} bookings
          </span>
        </div>
      </Card>

      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={`Assign ${assigning?.id ?? ""}`}
        description={assigning ? `${serviceName(assigning.serviceId)} · ${assigning.area}, ${cityName(assigning.cityId)} · ${assigning.slot}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssigning(null)}>
              Cancel
            </Button>
            <Button onClick={assign} disabled={!selectedWorker}>
              Assign worker
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-500">Workers in this city, online first, then by rating.</p>
        <div className="space-y-2">
          {candidates.map((w) => (
            <label
              key={w.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 transition",
                selectedWorker === w.id ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 hover:ring-slate-300",
              )}
            >
              <input
                type="radio"
                name="worker"
                value={w.id}
                checked={selectedWorker === w.id}
                onChange={() => setSelectedWorker(w.id)}
                className="sr-only"
              />
              <Avatar name={w.name} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{w.name}</p>
                <p className="text-xs text-slate-500">{w.area}</p>
              </div>
              <div className="text-right text-xs">
                <p className="flex items-center justify-end gap-1 font-medium text-slate-700">
                  <Star className="size-3 fill-amber-400 text-amber-400" /> {w.rating}
                </p>
                <p className={w.online ? "text-emerald-600" : "text-slate-400"}>{w.online ? "Online" : "Offline"}</p>
              </div>
            </label>
          ))}
          {candidates.length === 0 && <p className="text-sm text-slate-500">No active workers in this city.</p>}
        </div>
      </Modal>
    </>
  );
}
