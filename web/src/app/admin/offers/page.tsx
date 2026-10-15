"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterPills, SearchBox, useDebounced } from "@/components/filters";
import { api } from "@/lib/api";
import { type City, VEHICLES, type VehicleType, WEEKDAYS } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";
import { EmptyState, LoadingState } from "@/components/data-state";
import { toast } from "@/components/popups";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select, Toggle } from "@/components/ui";

// Action results show as toast alerts.
const setNotice = (notice: { tone: "ok" | "error"; text: string } | null) => notice && (notice.tone === "ok" ? toast.success(notice.text) : toast.error(notice.text));

type DiscountType = "flat" | "percent" | "fixed_price" | "price_match" | "free_area_charge";
type UserType = "all" | "new" | "returning" | "inactive" | "subscribers" | "list";
type AppliesTo = "booking" | "plan" | "both";

interface Offer {
  id: string;
  code: string;
  title: string;
  discount_type: DiscountType;
  value: number;
  max_discount: number | null;
  min_order: number;
  city_ids: string[];
  service_ids: string[];
  user_type: UserType;
  valid_from: string;
  valid_to: string;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  auto_apply: boolean;
  is_active: boolean;
  applies_to?: AppliesTo;
  vehicle_types?: VehicleType[];
  area_ids?: string[];
  plan_ids?: string[];
  weekdays?: number[];
  time_from?: string | null;
  time_to?: string | null;
  inactive_days?: number;
  customer_emails?: string[];
  min_completed?: number;
  every_nth?: number | null;
  price_service_id?: string | null;
  plan_months?: number;
  stackable?: boolean;
  show_popup?: boolean;
  priority?: number;
  budget?: number | null;
  daily_limit?: number | null;
  discount_given?: number;
  terms?: string | null;
}

type ServiceOption = { id: string; name: string };

type Draft = {
  code: string;
  title: string;
  discountType: DiscountType;
  value: string;
  maxDiscount: string;
  minOrder: string;
  appliesTo: AppliesTo;
  cityIds: string[];
  areaIds: string[];
  serviceIds: string[];
  planIds: string[];
  vehicleTypes: VehicleType[];
  priceServiceId: string;
  planMonths: string;
  weekdays: number[];
  timeFrom: string;
  timeTo: string;
  userType: UserType;
  inactiveDays: string;
  customerEmails: string;
  minCompleted: string;
  everyNth: string;
  validFrom: string;
  validTo: string;
  usageLimit: string;
  perUserLimit: string;
  dailyLimit: string;
  budget: string;
  autoApply: boolean;
  stackable: boolean;
  showPopup: boolean;
  priority: string;
  isActive: boolean;
  terms: string;
};

const DISCOUNT_TYPES: { id: DiscountType; label: string; hint: string; valueLabel?: string }[] = [
  { id: "percent", label: "Percentage off", hint: "e.g. 20% off, optionally capped.", valueLabel: "Percent off" },
  { id: "flat", label: "Flat amount off", hint: "e.g. ₹100 off the order.", valueLabel: "Amount off (₹)" },
  { id: "fixed_price", label: "Fixed final price", hint: "Customer pays exactly this, area charge included.", valueLabel: "Final price (₹)" },
  { id: "price_match", label: "Free upgrade", hint: "Customer pays the price of another package." },
  { id: "free_area_charge", label: "Free doorstep fee", hint: "Removes the area charge." },
];

const SEGMENTS: { id: UserType; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "new", label: "New customers (first booking)" },
  { id: "returning", label: "Returning customers (1+ completed wash)" },
  { id: "inactive", label: "Inactive customers (win-back)" },
  { id: "subscribers", label: "Monthly plan members" },
  { id: "list", label: "Only specific customers (email list)" },
];

const localDate = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toLocalDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const numOrNull = (value: string) => (value.trim() ? Number(value) : null);

const emptyDraft = (): Draft => ({
  code: "",
  title: "",
  discountType: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "0",
  appliesTo: "booking",
  cityIds: [],
  areaIds: [],
  serviceIds: [],
  planIds: [],
  vehicleTypes: [],
  priceServiceId: "",
  planMonths: "1",
  weekdays: [],
  timeFrom: "",
  timeTo: "",
  userType: "all",
  inactiveDays: "30",
  customerEmails: "",
  minCompleted: "0",
  everyNth: "",
  validFrom: localDate(0),
  validTo: localDate(30),
  usageLimit: "",
  perUserLimit: "1",
  dailyLimit: "",
  budget: "",
  autoApply: false,
  stackable: false,
  showPopup: false,
  priority: "0",
  isActive: true,
  terms: "",
});

const toDraft = (offer: Offer): Draft => ({
  code: offer.code,
  title: offer.title,
  discountType: offer.discount_type,
  value: String(offer.value),
  maxDiscount: offer.max_discount === null ? "" : String(offer.max_discount),
  minOrder: String(offer.min_order),
  appliesTo: offer.applies_to ?? "booking",
  cityIds: offer.city_ids,
  areaIds: offer.area_ids ?? [],
  serviceIds: offer.service_ids,
  planIds: offer.plan_ids ?? [],
  vehicleTypes: offer.vehicle_types ?? [],
  priceServiceId: offer.price_service_id ?? "",
  planMonths: String(offer.plan_months ?? 1),
  weekdays: offer.weekdays ?? [],
  timeFrom: offer.time_from?.slice(0, 5) ?? "",
  timeTo: offer.time_to?.slice(0, 5) ?? "",
  userType: offer.user_type,
  inactiveDays: String(offer.inactive_days ?? 30),
  customerEmails: (offer.customer_emails ?? []).join("\n"),
  minCompleted: String(offer.min_completed ?? 0),
  everyNth: offer.every_nth ? String(offer.every_nth) : "",
  validFrom: toLocalDate(offer.valid_from),
  validTo: toLocalDate(offer.valid_to),
  usageLimit: offer.usage_limit === null ? "" : String(offer.usage_limit),
  perUserLimit: String(offer.per_user_limit),
  dailyLimit: offer.daily_limit ? String(offer.daily_limit) : "",
  budget: offer.budget ? String(offer.budget) : "",
  autoApply: offer.auto_apply,
  stackable: offer.stackable ?? false,
  showPopup: offer.show_popup ?? false,
  priority: String(offer.priority ?? 0),
  isActive: offer.is_active,
  terms: offer.terms ?? "",
});

const needsValue = (type: DiscountType) => type === "flat" || type === "percent" || type === "fixed_price";

const toBody = (draft: Draft) => ({
  code: draft.code,
  title: draft.title,
  discountType: draft.discountType,
  // Types without a numeric value still need a positive placeholder in the database.
  value: needsValue(draft.discountType) ? Number(draft.value) : 1,
  maxDiscount: draft.discountType === "percent" && draft.maxDiscount ? Number(draft.maxDiscount) : null,
  minOrder: Number(draft.minOrder) || 0,
  appliesTo: draft.appliesTo,
  cityIds: draft.cityIds,
  areaIds: draft.areaIds,
  serviceIds: draft.appliesTo === "plan" ? [] : draft.serviceIds,
  planIds: draft.appliesTo === "booking" ? [] : draft.planIds,
  vehicleTypes: draft.vehicleTypes,
  priceServiceId: draft.discountType === "price_match" ? draft.priceServiceId || null : null,
  planMonths: Number(draft.planMonths) || 1,
  weekdays: draft.weekdays,
  timeFrom: draft.timeFrom || null,
  timeTo: draft.timeTo || null,
  userType: draft.userType,
  inactiveDays: Number(draft.inactiveDays) || 30,
  customerEmails: draft.userType === "list" ? draft.customerEmails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean) : [],
  minCompleted: Number(draft.minCompleted) || 0,
  everyNth: numOrNull(draft.everyNth),
  validFrom: new Date(draft.validFrom).toISOString(),
  validTo: new Date(draft.validTo).toISOString(),
  usageLimit: numOrNull(draft.usageLimit),
  perUserLimit: Number(draft.perUserLimit) || 1,
  dailyLimit: numOrNull(draft.dailyLimit),
  budget: numOrNull(draft.budget),
  autoApply: draft.autoApply,
  stackable: draft.stackable,
  showPopup: draft.showPopup,
  priority: Number(draft.priority) || 0,
  isActive: draft.isActive,
  terms: draft.terms.trim() || null,
});

/** One-line plain-English summary of an offer, for the list cards. */
function describe(offer: Offer, services: ServiceOption[]) {
  const what = {
    flat: `${formatMoney(offer.value)} off`,
    percent: `${offer.value}% off${offer.max_discount ? ` up to ${formatMoney(offer.max_discount)}` : ""}`,
    fixed_price: `Pay ${formatMoney(offer.value)}`,
    free_area_charge: "Free doorstep fee",
    price_match: `Upgrade at ${services.find((s) => s.id === offer.price_service_id)?.name ?? "another package"} price`,
  }[offer.discount_type];
  const on = { booking: "bookings", plan: "monthly plans", both: "bookings and plans" }[offer.applies_to ?? "booking"];
  return `${what} on ${on}`;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-slate-900">{title}</legend>
      {hint && <p className="-mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function ScopeChecks({ title, items, selected, onChange, all }: { title: string; items: ServiceOption[]; selected: string[]; onChange: (ids: string[]) => void; all: string }) {
  return (
    <div className="sm:col-span-2">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mb-2 text-xs text-slate-500">Leave all unchecked for {all}.</p>
      <div className="scroll-slim grid max-h-36 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
            {item.name}
          </label>
        ))}
        {!items.length && <span className="text-xs text-slate-500">No options available.</span>}
      </div>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

function OfferFields({
  draft,
  cities,
  services,
  plans,
  onChange,
}: {
  draft: Draft;
  cities: City[];
  services: ServiceOption[];
  plans: ServiceOption[];
  onChange: (patch: Partial<Draft>) => void;
}) {
  const type = DISCOUNT_TYPES.find((t) => t.id === draft.discountType)!;
  const areas = cities
    .filter((city) => !draft.cityIds.length || draft.cityIds.includes(city.id))
    .flatMap((city) => city.areas.map((area) => ({ id: area.id, name: `${area.name}, ${city.name}` })));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="offer-code">Code</Label><Input id="offer-code" value={draft.code} onChange={(event) => onChange({ code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} /></div>
      <div><Label htmlFor="offer-title">Title shown to customers</Label><Input id="offer-title" value={draft.title} onChange={(event) => onChange({ title: event.target.value })} /></div>

      <Section title="Discount" hint={type.hint}>
        <div>
          <Label htmlFor="discount-type">Type</Label>
          <Select id="discount-type" value={draft.discountType} onChange={(event) => onChange({ discountType: event.target.value as DiscountType })}>
            {DISCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </div>
        {type.valueLabel && (
          <div>
            <Label htmlFor="offer-value">{type.valueLabel}</Label>
            <Input id="offer-value" type="number" min="1" max={draft.discountType === "percent" ? 100 : 100000} value={draft.value} onChange={(event) => onChange({ value: event.target.value })} />
          </div>
        )}
        {draft.discountType === "price_match" && (
          <div>
            <Label htmlFor="price-service">Customer pays the price of</Label>
            <Select id="price-service" value={draft.priceServiceId} onChange={(event) => onChange({ priceServiceId: event.target.value })}>
              <option value="">Choose a package</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        )}
        {draft.discountType === "percent" && (
          <div><Label htmlFor="max-discount">Maximum discount ₹ (optional)</Label><Input id="max-discount" type="number" min="1" value={draft.maxDiscount} onChange={(event) => onChange({ maxDiscount: event.target.value })} /></div>
        )}
        <div><Label htmlFor="min-order">Minimum order ₹</Label><Input id="min-order" type="number" min="0" value={draft.minOrder} onChange={(event) => onChange({ minOrder: event.target.value })} /></div>
      </Section>

      <Section title="Applies to">
        <div className="sm:col-span-2">
          <FilterPills
            label="Applies to"
            value={draft.appliesTo}
            onChange={(appliesTo) => onChange({ appliesTo })}
            options={[
              { id: "booking", label: "Single bookings" },
              { id: "plan", label: "Monthly plans" },
              { id: "both", label: "Both" },
            ]}
          />
        </div>
        {draft.appliesTo !== "plan" && <ScopeChecks title="Packages" all="every package" items={services} selected={draft.serviceIds} onChange={(serviceIds) => onChange({ serviceIds })} />}
        {draft.appliesTo !== "booking" && (
          <>
            <ScopeChecks title="Plans" all="every plan" items={plans} selected={draft.planIds} onChange={(planIds) => onChange({ planIds })} />
            <div><Label htmlFor="plan-months">Discount the first N paid months</Label><Input id="plan-months" type="number" min="1" max="12" value={draft.planMonths} onChange={(event) => onChange({ planMonths: event.target.value })} /></div>
          </>
        )}
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Vehicle types</p>
          <p className="mb-2 text-xs text-slate-500">Leave all unchecked for every vehicle.</p>
          <div className="flex flex-wrap gap-4">
            {VEHICLES.map((v) => (
              <Check key={v.id} checked={draft.vehicleTypes.includes(v.id)} onChange={(on) => onChange({ vehicleTypes: on ? [...draft.vehicleTypes, v.id] : draft.vehicleTypes.filter((x) => x !== v.id) })}>
                {v.label}
              </Check>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Where">
        <ScopeChecks title="Cities" all="every city" items={cities} selected={draft.cityIds} onChange={(cityIds) => onChange({ cityIds, areaIds: draft.areaIds.filter((id) => cities.some((c) => (!cityIds.length || cityIds.includes(c.id)) && c.areas.some((a) => a.id === id))) })} />
        <ScopeChecks title="Areas" all="every area in the chosen cities" items={areas} selected={draft.areaIds} onChange={(areaIds) => onChange({ areaIds })} />
      </Section>

      <Section title="When the wash happens" hint="Matched against the wash slot, so you can fill quiet days and hours. Leave empty for any time.">
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day, index) => {
            const on = draft.weekdays.includes(index);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ weekdays: on ? draft.weekdays.filter((d) => d !== index) : [...draft.weekdays, index] })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${on ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-300 hover:bg-slate-50"}`}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <div><Label htmlFor="time-from">Slot starts from</Label><Input id="time-from" type="time" value={draft.timeFrom} onChange={(event) => onChange({ timeFrom: event.target.value })} /></div>
        <div><Label htmlFor="time-to">Slot starts before</Label><Input id="time-to" type="time" value={draft.timeTo} onChange={(event) => onChange({ timeTo: event.target.value })} /></div>
        <div><Label htmlFor="valid-from">Offer starts</Label><Input id="valid-from" type="datetime-local" value={draft.validFrom} onChange={(event) => onChange({ validFrom: event.target.value })} /></div>
        <div><Label htmlFor="valid-to">Offer ends</Label><Input id="valid-to" type="datetime-local" value={draft.validTo} onChange={(event) => onChange({ validTo: event.target.value })} /></div>
      </Section>

      <Section title="Who">
        <div className="sm:col-span-2">
          <Label htmlFor="offer-user-type">Eligible customers</Label>
          <Select id="offer-user-type" value={draft.userType} onChange={(event) => onChange({ userType: event.target.value as UserType })}>
            {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
        {draft.userType === "inactive" && (
          <div><Label htmlFor="inactive-days">No wash in the last (days)</Label><Input id="inactive-days" type="number" min="1" max="365" value={draft.inactiveDays} onChange={(event) => onChange({ inactiveDays: event.target.value })} /></div>
        )}
        {draft.userType === "list" && (
          <div className="sm:col-span-2">
            <Label htmlFor="customer-emails">Customer emails (one per line, or comma separated)</Label>
            <textarea id="customer-emails" rows={4} value={draft.customerEmails} onChange={(event) => onChange({ customerEmails: event.target.value })} className="block w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none" />
          </div>
        )}
        <div><Label htmlFor="min-completed">Unlocks after N completed washes</Label><Input id="min-completed" type="number" min="0" value={draft.minCompleted} onChange={(event) => onChange({ minCompleted: event.target.value })} /></div>
        <div><Label htmlFor="every-nth">Every Nth wash (loyalty, optional)</Label><Input id="every-nth" type="number" min="2" max="50" placeholder="e.g. 5 for every 5th wash" value={draft.everyNth} onChange={(event) => onChange({ everyNth: event.target.value })} /></div>
      </Section>

      <Section title="Limits and budget" hint="Leave a field empty for no limit.">
        <div><Label htmlFor="per-user-limit">Uses per customer</Label><Input id="per-user-limit" type="number" min="1" max="100" value={draft.perUserLimit} onChange={(event) => onChange({ perUserLimit: event.target.value })} /></div>
        <div><Label htmlFor="usage-limit">Total uses</Label><Input id="usage-limit" type="number" min="1" value={draft.usageLimit} onChange={(event) => onChange({ usageLimit: event.target.value })} /></div>
        <div><Label htmlFor="daily-limit">Uses per day</Label><Input id="daily-limit" type="number" min="1" value={draft.dailyLimit} onChange={(event) => onChange({ dailyLimit: event.target.value })} /></div>
        <div><Label htmlFor="budget">Total discount budget ₹</Label><Input id="budget" type="number" min="1" value={draft.budget} onChange={(event) => onChange({ budget: event.target.value })} /></div>
      </Section>

      <Section title="How it applies">
        <Check checked={draft.autoApply} onChange={(autoApply) => onChange({ autoApply })}>Apply automatically when the customer qualifies (no code needed)</Check>
        <Check checked={draft.stackable} onChange={(stackable) => onChange({ stackable })}>Can combine with other combinable offers</Check>
        <Check checked={draft.showPopup} onChange={(showPopup) => onChange({ showPopup })}>Show as a popup on the homepage</Check>
        <div><Label htmlFor="priority">Priority (higher applies first when combined)</Label><Input id="priority" type="number" min="-100" max="100" value={draft.priority} onChange={(event) => onChange({ priority: event.target.value })} /></div>
        <div className="sm:col-span-2"><Label htmlFor="terms">Terms shown to customers (optional)</Label><Input id="terms" maxLength={300} value={draft.terms} onChange={(event) => onChange({ terms: event.target.value })} /></div>
        <Check checked={draft.isActive} onChange={(isActive) => onChange({ isActive })}>Offer is active</Check>
      </Section>
    </div>
  );
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(""); const [state, setState] = useState<"" | "active" | "scheduled" | "expired" | "inactive">("");
  const q = useDebounced(search.trim());
  const filterKey = `${q}|${state}`; const [lastFilter, setLastFilter] = useState(filterKey);
  if (lastFilter !== filterKey) { setLastFilter(filterKey); setPage(1); }
  const [cities, setCities] = useState<City[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [plans, setPlans] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const fail = (caught: unknown, fallback: string) => setNotice({ tone: "error", text: caught instanceof Error ? caught.message : fallback });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [offerRows, cityRows] = await Promise.all([api<{ items: Offer[]; total: number }>(`/api/admin/offers?${new URLSearchParams({ page: String(page), pageSize: "20", ...(q ? { search: q } : {}), ...(state ? { state } : {}) })}`), api<City[]>("/api/admin/cities")]);
      const serviceLists = await Promise.all(cityRows.map((city) => api<ServiceOption[]>(`/api/admin/services?cityId=${city.id}`)));
      const uniqueServices = new Map<string, ServiceOption>();
      serviceLists.flat().forEach((service) => uniqueServices.set(service.id, { id: service.id, name: service.name }));
      setOffers(offerRows.items);
      setTotal(offerRows.total);
      setCities(cityRows);
      setServices([...uniqueServices.values()].sort((a, b) => a.name.localeCompare(b.name)));
      setPlans((await api<ServiceOption[]>("/api/plans").catch(() => [])).map((plan) => ({ id: plan.id, name: plan.name })));
    } catch (caught) {
      fail(caught, "Could not load offers.");
    } finally {
      setLoading(false);
    }
  }, [page, q, state]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => { setDraft(emptyDraft()); setEditing("new"); setNotice(null); };
  const openEdit = (offer: Offer) => { setDraft(toDraft(offer)); setEditing(offer); setNotice(null); };

  async function saveOffer() {
    if (!editing) return;
    setSaving(true); setNotice(null);
    try {
      if (editing === "new") await api("/api/admin/offers", { method: "POST", body: toBody(draft) });
      else await api(`/api/admin/offers/${editing.id}`, { method: "PATCH", body: toBody(draft) });
      const action = editing === "new" ? "created" : "updated";
      setEditing(null);
      await load();
      setNotice({ tone: "ok", text: `${draft.code} ${action}.` });
    } catch (caught) {
      fail(caught, "Could not save the offer.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(offer: Offer, value: boolean) {
    setSaving(true); setNotice(null);
    try {
      await api(`/api/admin/offers/${offer.id}`, { method: "PATCH", body: { isActive: value } });
      await load();
      setNotice({ tone: "ok", text: `${offer.code} ${value ? "activated" : "deactivated"}.` });
    } catch (caught) { fail(caught, "Could not update the offer."); }
    finally { setSaving(false); }
  }

  async function deleteOffer() {
    if (!deleting) return;
    setSaving(true); setNotice(null);
    try {
      await api(`/api/admin/offers/${deleting.id}`, { method: "DELETE" });
      const code = deleting.code;
      setDeleting(null);
      await load();
      setNotice({ tone: "ok", text: `${code} deleted.` });
    } catch (caught) { fail(caught, "Could not delete the offer."); }
    finally { setSaving(false); }
  }

  const valid =
    draft.code.length >= 3 &&
    draft.title.trim().length >= 2 &&
    (!needsValue(draft.discountType) || Number(draft.value) >= 1) &&
    (draft.discountType !== "percent" || Number(draft.value) <= 100) &&
    (draft.discountType !== "price_match" || !!draft.priceServiceId) &&
    (draft.userType !== "list" || draft.customerEmails.trim().length > 3) &&
    !draft.timeFrom === !draft.timeTo &&
    (!draft.timeFrom || draft.timeTo > draft.timeFrom) &&
    Number(draft.perUserLimit) >= 1 &&
    !!draft.validFrom &&
    !!draft.validTo &&
    new Date(draft.validTo) > new Date(draft.validFrom);

  return <>
    <PageHeader title="Offers" description="Add, edit, target, activate or remove checkout promotions." action={<Button onClick={openCreate}><Plus className="size-4" />Add offer</Button>} />
    <FilterBar className="mb-5">
      <SearchBox value={search} onChange={setSearch} label="Search offers" placeholder="Code or title" className="sm:max-w-xs" />
      <FilterPills label="Offer state" value={state} onChange={setState} options={[{ id: "", label: "All" }, { id: "active", label: "Live" }, { id: "scheduled", label: "Scheduled" }, { id: "expired", label: "Expired" }, { id: "inactive", label: "Turned off" }]} />
    </FilterBar>
    {loading ? <LoadingState /> : !offers.length ? <EmptyState title="No offers" description="Create a coupon or automatic promotion." /> : <div className="grid gap-4 lg:grid-cols-2">{offers.map((offer) => {
      const expired = new Date(offer.valid_to) < new Date();
      return <Card key={offer.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Tag className="size-4 text-brand-600" /><strong>{offer.code}</strong><Badge tone={offer.is_active && !expired ? "green" : "slate"}>{expired ? "Expired" : offer.is_active ? "Active" : "Inactive"}</Badge>{offer.auto_apply && <Badge tone="blue">Automatic</Badge>}{offer.stackable && <Badge tone="violet">Combinable</Badge>}</div><p className="mt-2 font-medium text-slate-900">{offer.title}</p><p className="mt-1 text-sm text-slate-500">{describe(offer, services)}{offer.min_order ? ` · minimum ${formatMoney(offer.min_order)}` : ""}</p><p className="mt-2 text-xs text-slate-500">Used {offer.used_count}{offer.usage_limit ? ` of ${offer.usage_limit}` : " times"} · {formatMoney(offer.discount_given ?? 0)} given{offer.budget ? ` of ${formatMoney(offer.budget)}` : ""} · {new Date(offer.valid_from).toLocaleDateString("en-IN")}–{new Date(offer.valid_to).toLocaleDateString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">{offer.city_ids.length ? `${offer.city_ids.length} selected cit${offer.city_ids.length === 1 ? "y" : "ies"}` : "All cities"} · {offer.service_ids.length ? `${offer.service_ids.length} selected service${offer.service_ids.length === 1 ? "" : "s"}` : "All services"}</p></div><div className="flex shrink-0 flex-wrap items-center gap-2"><Toggle checked={offer.is_active} onChange={(value) => void toggle(offer, value)} label={`Toggle ${offer.code}`} /><Button size="sm" variant="secondary" disabled={saving} onClick={() => openEdit(offer)}><Pencil className="size-4" />Edit</Button><Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={saving} onClick={() => setDeleting(offer)}><Trash2 className="size-4" />Delete</Button></div></div></Card>;
    })}</div>}
    <Pagination page={page} pageSize={20} total={total} onChange={setPage} disabled={loading} className="mt-4 px-0" />

    <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === "new" ? "Add offer" : `Edit ${editing?.code ?? "offer"}`} description="Control eligibility, discount rules and availability." footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving || !valid} onClick={saveOffer}>{saving && <Loader2 className="size-4 animate-spin" />}{editing === "new" ? "Create offer" : "Save changes"}</Button></>}><OfferFields draft={draft} cities={cities} services={services} plans={plans} onChange={(patch) => setDraft((old) => ({ ...old, ...patch }))} /></Modal>

    <Modal open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.code ?? "offer"}?`} description={deleting?.used_count ? "This offer has usage history and must be deactivated instead." : "This permanently removes the offer. This action cannot be undone."} footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Keep offer</Button><Button variant="danger" disabled={saving || !!deleting?.used_count} onClick={deleteOffer}>{saving && <Loader2 className="size-4 animate-spin" />}Delete offer</Button></>}><p className="text-sm text-slate-600">{deleting?.used_count ? `Used ${deleting.used_count} time${deleting.used_count === 1 ? "" : "s"}. Turn off Active to stop future use.` : "Unused offers can be safely deleted."}</p></Modal>
  </>;
}
