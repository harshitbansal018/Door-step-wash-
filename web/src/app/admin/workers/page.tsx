"use client";

import { useState } from "react";
import { Clock, Plus, Star, UserCheck, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, Input, Label, Modal, PageHeader, Select, StatCard } from "@/components/ui";
import { CITIES, WORKERS, cityName, type Worker } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

const statusBadge = {
  active: <Badge tone="green">Active</Badge>,
  pending_kyc: <Badge tone="amber">KYC pending</Badge>,
  suspended: <Badge tone="red">Suspended</Badge>,
};

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>(WORKERS);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", cityId: CITIES[0].id, area: CITIES[0].areas[0].name });

  const setStatus = (id: string, status: Worker["status"]) =>
    setWorkers((ws) => ws.map((w) => (w.id === id ? { ...w, status } : w)));

  const formCity = CITIES.find((c) => c.id === form.cityId)!;

  return (
    <>
      <PageHeader
        title="Workers"
        description="Onboard washers, verify documents and assign them to service areas."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add worker
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active workers" value={String(workers.filter((w) => w.status === "active").length)} icon={<UserCheck className="size-5" />} />
        <StatCard label="Online now" value={String(workers.filter((w) => w.online && w.status === "active").length)} icon={<Users className="size-5" />} />
        <StatCard label="Awaiting KYC" value={String(workers.filter((w) => w.status === "pending_kyc").length)} icon={<Clock className="size-5" />} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Worker</th>
                <th className="px-5 py-3">Area</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Washes</th>
                <th className="px-5 py-3">Unpaid earnings</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={w.name} />
                        <span
                          className={`absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-white ${w.online ? "bg-emerald-500" : "bg-slate-300"}`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{w.name}</p>
                        <p className="text-xs text-slate-500">+91 {w.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-slate-900">{w.area}</p>
                    <p className="text-xs text-slate-500">{cityName(w.cityId)}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {w.rating ? (
                      <span className="flex items-center gap-1 font-medium text-slate-900">
                        <Star className="size-4 fill-amber-400 text-amber-400" /> {w.rating}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-700">{w.jobsDone}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{formatMoney(w.pendingEarnings)}</td>
                  <td className="px-5 py-4">{statusBadge[w.status]}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    {w.status === "pending_kyc" && (
                      <Button size="sm" onClick={() => setStatus(w.id, "active")}>
                        Approve
                      </Button>
                    )}
                    {w.status === "active" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(w.id, "suspended")}>
                        Suspend
                      </Button>
                    )}
                    {w.status === "suspended" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(w.id, "active")}>
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add worker"
        description="The worker can log in once their KYC documents are approved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name || form.phone.length < 10}
              onClick={() => {
                setWorkers((ws) => [
                  ...ws,
                  {
                    id: `w${Date.now()}`,
                    name: form.name,
                    phone: form.phone,
                    cityId: form.cityId,
                    area: form.area,
                    online: false,
                    rating: 0,
                    jobsDone: 0,
                    status: "pending_kyc",
                    pendingEarnings: 0,
                    joined: new Date().toISOString().slice(0, 10),
                  },
                ]);
                setAdding(false);
                setForm({ ...form, name: "", phone: "" });
              }}
            >
              Add worker
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="w-name">Full name</Label>
            <Input id="w-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="w-phone">Mobile number</Label>
            <Input
              id="w-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="w-city">City</Label>
              <Select
                id="w-city"
                value={form.cityId}
                onChange={(e) => {
                  const c = CITIES.find((x) => x.id === e.target.value)!;
                  setForm({ ...form, cityId: c.id, area: c.areas[0]?.name ?? "" });
                }}
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="w-area">Area</Label>
              <Select id="w-area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                {formCity.areas.map((a) => (
                  <option key={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
