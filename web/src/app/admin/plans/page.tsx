"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Plus, Save, Trash2 } from "lucide-react";
import { FilterBar, SearchBox, useDebounced } from "@/components/filters";
import { Pagination } from "@/components/pagination";
import { api } from "@/lib/api";
import { type City, SUBSCRIPTION_META, type Subscription, type SubscriptionStatus, VEHICLES, type VehicleType, WEEKDAYS } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, Input, Label, Modal, PageHeader, Select, Toggle } from "@/components/ui";
import { EmptyState, LoadingState } from "@/components/data-state";

interface AdminPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  washes_per_month: number;
  bonus_count: number;
  service_id: string;
  bonus_service_id: string | null;
  sort_order: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  service: string | null;
  bonusService: string | null;
  prices: { vehicleType: VehicleType; price: number; isActive: boolean }[];
}

type AdminSubscription = Subscription & { customer: { name: string; email: string; phone: string | null } };
type SubscriptionList = { items: AdminSubscription[]; total: number };
type Draft = { name: string; tagline: string; description: string; serviceId: string; washesPerMonth: string; bonusServiceId: string; bonusCount: string; features: string; sortOrder: string };
const emptyDraft: Draft = { name: "", tagline: "", description: "", serviceId: "", washesPerMonth: "4", bonusServiceId: "", bonusCount: "0", features: "", sortOrder: "0" };
const fromDraft = (d: Draft) => ({ name: d.name, tagline: d.tagline, description: d.description, serviceId: d.serviceId, washesPerMonth: Number(d.washesPerMonth), bonusServiceId: d.bonusServiceId || null, bonusCount: d.bonusServiceId ? Number(d.bonusCount) : 0, features: d.features.split("\n").map((l) => l.trim()).filter(Boolean), sortOrder: Number(d.sortOrder) });
type ServiceOption = { id: string; name: string };

function PlanFields({ id, draft, services, onChange }: { id: string; draft: Draft; services: ServiceOption[]; onChange: (patch: Partial<Draft>) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {(["name", "tagline", "description"] as const).map((key) => <div key={key}><Label htmlFor={id + key}>{key}</Label><Input id={id + key} value={draft[key]} onChange={(e) => onChange({ [key]: e.target.value })} /></div>)}
    {(["serviceId", "bonusServiceId"] as const).map((key) => <div key={key}><Label htmlFor={id + key}>{key === "serviceId" ? "Regular service" : "Bonus service"}</Label><Select id={id + key} value={draft[key]} onChange={(e) => onChange({ [key]: e.target.value, ...(key === "bonusServiceId" && !e.target.value ? { bonusCount: "0" } : {}) })}><option value="">{key === "serviceId" ? "Choose service" : "None"}</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></div>)}
    {(["washesPerMonth", "bonusCount", "sortOrder"] as const).map((key) => <div key={key}><Label htmlFor={id + key}>{key === "washesPerMonth" ? "Washes per month" : key === "bonusCount" ? "Bonus visits" : "Display order"}</Label><Input id={id + key} type="number" min={key === "washesPerMonth" ? 1 : 0} max={key === "washesPerMonth" ? 31 : key === "bonusCount" ? 4 : 1000} disabled={key === "bonusCount" && !draft.bonusServiceId} value={draft[key]} onChange={(e) => onChange({ [key]: e.target.value })} /></div>)}
    <div className="sm:col-span-2"><Label htmlFor={id + "features"}>Features (one per line)</Label><textarea id={id + "features"} rows={4} value={draft.features} onChange={(e) => onChange({ features: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
  </div>;
}

const STATUS_FILTERS: { id: SubscriptionStatus | ""; label: string }[] = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "expired", label: "Expired" },
  { id: "cancelled", label: "Cancelled" },
  { id: "pending_payment", label: "Unpaid" },
];

export default function AdminPlansPage() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [deleting, setDeleting] = useState<AdminPlan | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [subs, setSubs] = useState<SubscriptionList | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [subPage, setSubPage] = useState(1);
  const [subSearch, setSubSearch] = useState("");
  const [subCity, setSubCity] = useState("");
  const subQ = useDebounced(subSearch.trim());
  const subKey = `${status}|${subQ}|${subCity}`;
  const [lastStatus, setLastStatus] = useState(subKey);
  if (lastStatus !== subKey) { setLastStatus(subKey); setSubPage(1); }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const fail = (caught: unknown, fallback: string) =>
    setNotice({ tone: "error", text: caught instanceof Error ? caught.message : fallback });

  const loadCities = useCallback(async () => {
    try {
      const rows = await api<City[]>("/api/admin/cities");
      setCities(rows);
      if (!rows.length) setLoading(false);
      setCityId((old) => old || rows[0]?.id || "");
    } catch (caught) {
      fail(caught, "Could not load cities.");
      setLoading(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    try {
      setServices(await api<ServiceOption[]>(`/api/admin/services?cityId=${cityId}`));
      const rows = await api<AdminPlan[]>(`/api/admin/plans?cityId=${cityId}`);
      setPlans(rows);
      const nextPrices: Record<string, string> = {};
      const nextDrafts: Record<string, Draft> = {};
      rows.forEach((plan) => {
        VEHICLES.forEach((vehicle) => {
          const price = plan.prices.find((item) => item.vehicleType === vehicle.id);
          nextPrices[`${plan.id}:${vehicle.id}`] = price ? String(price.price) : "";
        });
        nextDrafts[plan.id] = {
          serviceId: plan.service_id,
          bonusServiceId: plan.bonus_service_id ?? "",
          sortOrder: String(plan.sort_order),
          name: plan.name,
          tagline: plan.tagline,
          description: plan.description,
          washesPerMonth: String(plan.washes_per_month),
          bonusCount: String(plan.bonus_count),
          features: plan.features.join("\n"),
        };
      });
      setPrices(nextPrices);
      setDrafts(nextDrafts);
    } catch (caught) {
      fail(caught, "Could not load plans.");
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  const loadSubs = useCallback(async () => {
    try {
      const query = new URLSearchParams({ page: String(subPage), pageSize: "25" });
      if (status) query.set("status", status);
      if (subQ) query.set("search", subQ);
      if (subCity) query.set("cityId", subCity);
      setSubs(await api<SubscriptionList>(`/api/admin/subscriptions?${query}`));
    } catch (caught) {
      fail(caught, "Could not load subscriptions.");
    }
  }, [status, subPage, subQ, subCity]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCities(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCities]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlans(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPlans]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadSubs(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSubs]);

  async function patchPlan(plan: AdminPlan, body: Record<string, unknown>) {
    setSaving(true);
    setNotice(null);
    try {
      await api(`/api/admin/plans/${plan.id}`, { method: "PATCH", body });
      await loadPlans();
      setNotice({ tone: "ok", text: `${plan.name} updated.` });
    } catch (caught) {
      fail(caught, "Could not update the plan.");
    } finally {
      setSaving(false);
    }
  }

  function saveDraft(plan: AdminPlan) {
    const draft = drafts[plan.id];
    if (!draft) return;
    return patchPlan(plan, fromDraft(draft));
  }

  async function savePrices() {
    setSaving(true);
    setNotice(null);
    try {
      const payload = plans.flatMap((plan) =>
        VEHICLES.flatMap((vehicle) => {
          const value = Number(prices[`${plan.id}:${vehicle.id}`]);
          if (!Number.isInteger(value) || value < 0) throw new Error("Prices must be non-negative whole rupees.");
          const existing = plan.prices.find((p) => p.vehicleType === vehicle.id);
          return value > 0 || existing ? [{ planId: plan.id, vehicleType: vehicle.id, price: value, isActive: existing?.isActive ?? true }] : [];
        }),
      );
      if (!payload.length) throw new Error("Enter at least one price.");
      await api("/api/admin/plans/prices", { method: "PUT", body: { cityId, prices: payload } });
      await loadPlans();
      setNotice({ tone: "ok", text: "Plan prices saved." });
    } catch (caught) {
      fail(caught, "Could not save prices.");
    } finally {
      setSaving(false);
    }
  }

  async function createPlan() {
    setSaving(true); setNotice(null);
    try {
      await api("/api/admin/plans", { method: "POST", body: fromDraft(newDraft) });
      setAdding(false); setNewDraft(emptyDraft); await loadPlans();
      setNotice({ tone: "ok", text: "Plan created. Set its city prices below." });
    } catch (caught) { fail(caught, "Could not create plan."); }
    finally { setSaving(false); }
  }
  async function deletePlan() {
    if (!deleting) return;
    setSaving(true); setNotice(null);
    try {
      await api(`/api/admin/plans/${deleting.id}`, { method: "DELETE" });
      setDeleting(null); await loadPlans();
      setNotice({ tone: "ok", text: "Plan deleted." });
    } catch (caught) { fail(caught, "Could not delete plan."); }
    finally { setSaving(false); }
  }
  async function runScheduler() {
    setSaving(true);
    setNotice(null);
    try {
      const result = await api<{ created: number }>("/api/admin/subscriptions/schedule", { method: "POST" });
      setNotice({ tone: "ok", text: `Scheduler booked ${result.created} plan visit(s).` });
      await loadSubs();
    } catch (caught) {
      fail(caught, "Could not run the scheduler.");
    } finally {
      setSaving(false);
    }
  }

  const updateDraft = (planId: string, patch: Partial<Draft>) =>
    setDrafts((old) => ({ ...old, [planId]: { ...old[planId], ...patch } }));

  return (
    <>
      <PageHeader
        title="Monthly plans"
        description="Plan contents, city-specific monthly prices, and every customer subscription."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAdding(true)} disabled={saving || !cityId || !services.length}><Plus className="size-4" />Add plan</Button>
            <Button variant="secondary" onClick={runScheduler} disabled={saving}>
              <Play className="size-4" /> Book visits now
            </Button>
            <Button onClick={savePrices} disabled={saving || loading || !cityId}>
              <Save className="size-4" /> Save prices
            </Button>
          </div>
        }
      />
      {notice && (
        <div role="status" className={`mb-4 rounded-lg p-3 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {notice.text}
        </div>
      )}

      <div className="mb-5 max-w-sm">
        <Label htmlFor="plan-city">Pricing city</Label>
        <Select id="plan-city" value={cityId} onChange={(event) => setCityId(event.target.value)}>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : !plans.length ? (
        <EmptyState title="No plans yet" description="Add your first monthly plan using the button above." />
      ) : (
        <div className="space-y-5">
          {plans.map((plan) => {
            const draft = drafts[plan.id];
            return (
              <Card key={plan.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{plan.name}</h2>
                      {plan.is_popular && <Badge tone="blue">Popular</Badge>}
                      <Badge tone={plan.is_active ? "green" : "slate"}>{plan.is_active ? "Active" : "Hidden"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.washes_per_month} × {plan.service ?? "service"}
                      {plan.bonusService ? ` + ${plan.bonus_count} × ${plan.bonusService}` : ""} · slug {plan.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button variant="ghost" size="sm" disabled={saving} onClick={() => setDeleting(plan)}><Trash2 className="size-4" />Delete</Button>
                    <label className="flex items-center gap-2 text-sm">
                      Popular
                      <Toggle checked={plan.is_popular} onChange={(value) => patchPlan(plan, { isPopular: value })} label={`Popular ${plan.name}`} />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      Active
                      <Toggle checked={plan.is_active} onChange={(value) => patchPlan(plan, { isActive: value })} label={`Active ${plan.name}`} />
                    </label>
                  </div>
                </div>

                {draft && (
                  <div className="mt-5 grid gap-3">
                    <PlanFields id={plan.id} draft={draft} services={services} onChange={(patch) => updateDraft(plan.id, patch)} />
                    <div className="sm:col-span-2 flex justify-end">
                      <Button variant="secondary" size="sm" disabled={saving} onClick={() => saveDraft(plan)}>
                        <Save className="size-4" /> Save plan details
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {VEHICLES.map((vehicle) => (
                    <div key={vehicle.id}>
                      <Label htmlFor={`${plan.id}-${vehicle.id}`}>{vehicle.label} / month</Label>
                      <Input
                        id={`${plan.id}-${vehicle.id}`}
                        type="number"
                        min="0" placeholder="Not offered"
                        value={prices[`${plan.id}:${vehicle.id}`] ?? ""}
                        onChange={(event) => setPrices({ ...prices, [`${plan.id}:${vehicle.id}`]: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-8 overflow-hidden">
        <CardHeader
          title="Subscriptions"
          description={subs ? `${subs.total} total` : undefined}
          action={
            <div className="scroll-slim flex gap-1 overflow-x-auto">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${status === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
        <FilterBar className="border-b border-slate-200 px-5 py-3">
          <SearchBox value={subSearch} onChange={setSubSearch} label="Search subscriptions" placeholder="Plan code, customer, phone or plate" />
          <Select aria-label="City" className="sm:w-44" value={subCity} onChange={(event) => setSubCity(event.target.value)}>
            <option value="">All cities</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </Select>
        </FilterBar>
        {!subs ? (
          <div className="p-5"><LoadingState rows={2} /></div>
        ) : !subs.items.length ? (
          <div className="p-5"><EmptyState title="No subscriptions" description="Customers who start a monthly plan will appear here." /></div>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Weekly slot</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Washes</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.items.map((item) => {
                  const meta = SUBSCRIPTION_META[item.status];
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-4"><strong>{item.code}</strong><span className="block text-xs text-slate-500">{item.plan.name}</span></td>
                      <td className="px-5 py-4">{item.customer.name}<span className="block text-xs text-slate-500">{item.contact.phone}</span></td>
                      <td className="px-5 py-4">{item.vehicle.makeModel}<span className="block text-xs text-slate-500">{item.vehicle.plate} · {item.area}, {item.city}</span></td>
                      <td className="px-5 py-4">{WEEKDAYS[item.weekday]}<span className="block text-xs text-slate-500">{item.startTime}</span></td>
                      <td className="px-5 py-4 text-xs text-slate-600">{item.period.start && item.period.end ? `${formatDate(item.period.start)} – ${formatDate(item.period.end)}` : "—"}</td>
                      <td className="px-5 py-4 tabular-nums">{item.washes.used}/{item.washes.total}</td>
                      <td className="px-5 py-4"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-5 py-4 text-right font-semibold">{formatMoney(item.price.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {subs && <Pagination page={subPage} pageSize={25} total={subs.total} onChange={setSubPage} className="border-t border-slate-200" />}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add monthly plan" footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={saving || newDraft.name.trim().length < 2 || !newDraft.serviceId} onClick={createPlan}>Create plan</Button></>}>
        <PlanFields id="new-plan" draft={newDraft} services={services} onChange={(patch) => setNewDraft((old) => ({ ...old, ...patch }))} />
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete monthly plan?" footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Keep</Button><Button variant="danger" disabled={saving} onClick={deletePlan}>Delete plan</Button></>}>
        <p>This removes the plan and its prices in every city. Plans with subscription history must be hidden instead.</p>
      </Modal>
      {saving && (
        <div className="fixed right-5 bottom-5 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <Loader2 className="size-4 animate-spin" />Saving…
        </div>
      )}
    </>
  );
}
