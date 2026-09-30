"use client";

import { useState } from "react";
import { Percent, Plus, Tag, TicketPercent, Users } from "lucide-react";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select, StatCard, Toggle } from "@/components/ui";
import { CITIES, OFFERS, SERVICES, cityName, serviceName, type Offer } from "@/lib/data";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const EMPTY = {
  code: "",
  title: "",
  type: "flat" as Offer["type"],
  value: "",
  maxDiscount: "",
  minOrder: "0",
  cityIds: [] as string[],
  serviceIds: [] as string[],
  userType: "all" as Offer["userType"],
  validFrom: "",
  validTo: "",
  usageLimit: "",
  perUserLimit: "1",
  autoApply: false,
};

function Chips({
  options,
  selected,
  onChange,
  allLabel,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "rounded-full px-3 py-1 text-sm font-medium ring-1",
          selected.length === 0 ? "bg-brand-600 text-white ring-brand-600" : "text-slate-600 ring-slate-300 hover:bg-slate-50",
        )}
      >
        {allLabel}
      </button>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(on ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium ring-1",
              on ? "bg-brand-50 text-brand-700 ring-brand-600" : "text-slate-600 ring-slate-300 hover:bg-slate-50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>(OFFERS);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);

  const valid = f.code.length >= 3 && Number(f.value) > 0 && f.validFrom && f.validTo;

  function create() {
    setOffers((os) => [
      {
        id: `o${Date.now()}`,
        code: f.code.toUpperCase(),
        title: f.title || f.code.toUpperCase(),
        type: f.type,
        value: Number(f.value),
        maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : undefined,
        minOrder: Number(f.minOrder) || 0,
        cityIds: f.cityIds,
        serviceIds: f.serviceIds,
        userType: f.userType,
        validFrom: f.validFrom,
        validTo: f.validTo,
        used: 0,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined,
        perUserLimit: Number(f.perUserLimit) || 1,
        autoApply: f.autoApply,
        isActive: true,
      },
      ...os,
    ]);
    setF(EMPTY);
    setOpen(false);
  }

  const totalUses = offers.reduce((s, o) => s + o.used, 0);

  return (
    <>
      <PageHeader
        title="Offers & discounts"
        description="Only admins can create offers. Customers can apply a code only if every rule below passes."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Create offer
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active offers" value={String(offers.filter((o) => o.isActive).length)} icon={<Tag className="size-5" />} />
        <StatCard label="Total redemptions" value={totalUses.toLocaleString("en-IN")} icon={<Users className="size-5" />} />
        <StatCard label="Discount given (30 days)" value={formatMoney(48250)} icon={<TicketPercent className="size-5" />} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Offer</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Applies to</th>
                <th className="px-5 py-3">Valid</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.map((o) => {
                const expired = o.validTo < "2026-09-30";
                const pct = o.usageLimit ? Math.min(100, (o.used / o.usageLimit) * 100) : null;
                return (
                  <tr key={o.id} className={cn("hover:bg-slate-50", !o.isActive && "opacity-60")}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-semibold text-white">{o.code}</span>
                      <p className="mt-1.5 text-xs text-slate-500">{o.title}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-900">
                        {o.type === "flat" ? `${formatMoney(o.value)} off` : `${o.value}% off`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {o.maxDiscount ? `Max ${formatMoney(o.maxDiscount)} · ` : ""}
                        Min order {formatMoney(o.minOrder)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        <Badge>{o.cityIds.length ? o.cityIds.map(cityName).join(", ") : "All cities"}</Badge>
                        <Badge>{o.serviceIds.length ? o.serviceIds.map(serviceName).join(", ") : "All packages"}</Badge>
                        {o.userType === "new" && <Badge tone="violet">New users</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-slate-700">{formatDate(o.validFrom)} –</p>
                      <p className={expired ? "text-red-600" : "text-slate-700"}>
                        {formatDate(o.validTo)} {expired && "(expired)"}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-medium text-slate-900">
                        {o.used}
                        <span className="font-normal text-slate-500"> / {o.usageLimit ?? "∞"}</span>
                      </p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Toggle
                        checked={o.isActive}
                        onChange={(v) => setOffers((os) => os.map((x) => (x.id === o.id ? { ...x, isActive: v } : x)))}
                        label={`Toggle ${o.code}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create offer"
        description="Customers can use this code at checkout once it's active."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!valid}>
              Create offer
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="o-code">Coupon code</Label>
              <Input
                id="o-code"
                value={f.code}
                onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                placeholder="DIWALI20"
                className="font-mono uppercase"
              />
            </div>
            <div>
              <Label htmlFor="o-title">Display title</Label>
              <Input id="o-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Diwali 20% off" />
            </div>
          </div>

          <div>
            <Label>Discount type</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "flat" as const, label: "Flat amount", icon: Tag },
                { id: "percent" as const, label: "Percentage", icon: Percent },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setF({ ...f, type: t.id })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold ring-1",
                    f.type === t.id ? "bg-brand-50 text-brand-700 ring-2 ring-brand-600" : "text-slate-600 ring-slate-300",
                  )}
                >
                  <t.icon className="size-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="o-value">{f.type === "flat" ? "Amount (₹)" : "Percent (%)"}</Label>
              <Input id="o-value" type="number" min={1} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="o-max">Max discount (₹)</Label>
              <Input
                id="o-max"
                type="number"
                min={0}
                value={f.maxDiscount}
                onChange={(e) => setF({ ...f, maxDiscount: e.target.value })}
                disabled={f.type === "flat"}
                placeholder={f.type === "flat" ? "—" : "No cap"}
              />
            </div>
            <div>
              <Label htmlFor="o-min">Min order (₹)</Label>
              <Input id="o-min" type="number" min={0} value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Cities</Label>
            <Chips
              allLabel="All cities"
              options={CITIES.map((c) => ({ id: c.id, label: c.name }))}
              selected={f.cityIds}
              onChange={(ids) => setF({ ...f, cityIds: ids })}
            />
          </div>
          <div>
            <Label>Packages</Label>
            <Chips
              allLabel="All packages"
              options={SERVICES.map((s) => ({ id: s.id, label: s.name }))}
              selected={f.serviceIds}
              onChange={(ids) => setF({ ...f, serviceIds: ids })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="o-from">Valid from</Label>
              <Input id="o-from" type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="o-to">Valid until</Label>
              <Input id="o-to" type="date" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="o-users">Who can use</Label>
              <Select id="o-users" value={f.userType} onChange={(e) => setF({ ...f, userType: e.target.value as Offer["userType"] })}>
                <option value="all">All customers</option>
                <option value="new">New customers</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="o-limit">Total uses</Label>
              <Input id="o-limit" type="number" min={1} value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <Label htmlFor="o-per">Per customer</Label>
              <Input id="o-per" type="number" min={1} value={f.perUserLimit} onChange={(e) => setF({ ...f, perUserLimit: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Apply automatically</p>
              <p className="text-xs text-slate-500">Discount applies at checkout without entering the code.</p>
            </div>
            <Toggle checked={f.autoApply} onChange={(v) => setF({ ...f, autoApply: v })} label="Apply automatically" />
          </div>
        </div>
      </Modal>
    </>
  );
}
