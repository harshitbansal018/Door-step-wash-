"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { api } from "@/lib/api";
import type { City } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select, Toggle } from "@/components/ui";

interface Offer {
  id: string;
  code: string;
  title: string;
  discount_type: "flat" | "percent";
  value: number;
  max_discount: number | null;
  min_order: number;
  city_ids: string[];
  service_ids: string[];
  user_type: "all" | "new";
  valid_from: string;
  valid_to: string;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  auto_apply: boolean;
  is_active: boolean;
}

type ServiceOption = { id: string; name: string };
type Draft = {
  code: string;
  title: string;
  discountType: "flat" | "percent";
  value: string;
  maxDiscount: string;
  minOrder: string;
  cityIds: string[];
  serviceIds: string[];
  userType: "all" | "new";
  validFrom: string;
  validTo: string;
  usageLimit: string;
  perUserLimit: string;
  autoApply: boolean;
  isActive: boolean;
};

const localDate = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toLocalDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const emptyDraft = (): Draft => ({
  code: "",
  title: "",
  discountType: "flat",
  value: "",
  maxDiscount: "",
  minOrder: "0",
  cityIds: [],
  serviceIds: [],
  userType: "all",
  validFrom: localDate(0),
  validTo: localDate(30),
  usageLimit: "",
  perUserLimit: "1",
  autoApply: false,
  isActive: true,
});
const toDraft = (offer: Offer): Draft => ({
  code: offer.code,
  title: offer.title,
  discountType: offer.discount_type,
  value: String(offer.value),
  maxDiscount: offer.max_discount === null ? "" : String(offer.max_discount),
  minOrder: String(offer.min_order),
  cityIds: offer.city_ids,
  serviceIds: offer.service_ids,
  userType: offer.user_type,
  validFrom: toLocalDate(offer.valid_from),
  validTo: toLocalDate(offer.valid_to),
  usageLimit: offer.usage_limit === null ? "" : String(offer.usage_limit),
  perUserLimit: String(offer.per_user_limit),
  autoApply: offer.auto_apply,
  isActive: offer.is_active,
});
const toBody = (draft: Draft) => ({
  code: draft.code,
  title: draft.title,
  discountType: draft.discountType,
  value: Number(draft.value),
  maxDiscount: draft.discountType === "percent" && draft.maxDiscount ? Number(draft.maxDiscount) : null,
  minOrder: Number(draft.minOrder),
  cityIds: draft.cityIds,
  serviceIds: draft.serviceIds,
  userType: draft.userType,
  validFrom: new Date(draft.validFrom).toISOString(),
  validTo: new Date(draft.validTo).toISOString(),
  usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
  perUserLimit: Number(draft.perUserLimit),
  autoApply: draft.autoApply,
  isActive: draft.isActive,
});

function ScopeChecks({ title, items, selected, onChange }: { title: string; items: ServiceOption[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return <fieldset className="sm:col-span-2"><legend className="text-sm font-medium text-slate-700">{title}</legend><p className="mb-2 text-xs text-slate-500">Leave all unchecked to allow every {title.toLowerCase()}.</p><div className="grid max-h-32 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">{items.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.name}</label>)}{!items.length && <span className="text-xs text-slate-500">No options available.</span>}</div></fieldset>;
}

function OfferFields({ draft, cities, services, onChange }: { draft: Draft; cities: City[]; services: ServiceOption[]; onChange: (patch: Partial<Draft>) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><Label htmlFor="offer-code">Code</Label><Input id="offer-code" value={draft.code} onChange={(event) => onChange({ code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} /></div>
    <div><Label htmlFor="offer-title">Title</Label><Input id="offer-title" value={draft.title} onChange={(event) => onChange({ title: event.target.value })} /></div>
    <div><Label htmlFor="discount-type">Discount type</Label><Select id="discount-type" value={draft.discountType} onChange={(event) => onChange({ discountType: event.target.value as Draft["discountType"], ...(event.target.value === "flat" ? { maxDiscount: "" } : {}) })}><option value="flat">Flat amount</option><option value="percent">Percentage</option></Select></div>
    <div><Label htmlFor="offer-value">Discount value</Label><Input id="offer-value" type="number" min="1" max={draft.discountType === "percent" ? 100 : 100000} value={draft.value} onChange={(event) => onChange({ value: event.target.value })} /></div>
    {draft.discountType === "percent" && <div><Label htmlFor="max-discount">Maximum discount (optional)</Label><Input id="max-discount" type="number" min="1" value={draft.maxDiscount} onChange={(event) => onChange({ maxDiscount: event.target.value })} /></div>}
    <div><Label htmlFor="min-order">Minimum order</Label><Input id="min-order" type="number" min="0" value={draft.minOrder} onChange={(event) => onChange({ minOrder: event.target.value })} /></div>
    <div><Label htmlFor="offer-user-type">Eligible customers</Label><Select id="offer-user-type" value={draft.userType} onChange={(event) => onChange({ userType: event.target.value as Draft["userType"] })}><option value="all">All customers</option><option value="new">New customers only</option></Select></div>
    <div><Label htmlFor="per-user-limit">Per-customer limit</Label><Input id="per-user-limit" type="number" min="1" max="100" value={draft.perUserLimit} onChange={(event) => onChange({ perUserLimit: event.target.value })} /></div>
    <div><Label htmlFor="valid-from">Starts</Label><Input id="valid-from" type="datetime-local" value={draft.validFrom} onChange={(event) => onChange({ validFrom: event.target.value })} /></div>
    <div><Label htmlFor="valid-to">Ends</Label><Input id="valid-to" type="datetime-local" value={draft.validTo} onChange={(event) => onChange({ validTo: event.target.value })} /></div>
    <div><Label htmlFor="usage-limit">Total usage limit (optional)</Label><Input id="usage-limit" type="number" min="1" value={draft.usageLimit} onChange={(event) => onChange({ usageLimit: event.target.value })} /></div>
    <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.autoApply} onChange={(event) => onChange({ autoApply: event.target.checked })} />Apply automatically when eligible</label></div>
    <ScopeChecks title="Cities" items={cities} selected={draft.cityIds} onChange={(cityIds) => onChange({ cityIds })} />
    <ScopeChecks title="Services" items={services} selected={draft.serviceIds} onChange={(serviceIds) => onChange({ serviceIds })} />
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2"><input type="checkbox" checked={draft.isActive} onChange={(event) => onChange({ isActive: event.target.checked })} />Offer is active</label>
  </div>;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const fail = (caught: unknown, fallback: string) => setNotice({ tone: "error", text: caught instanceof Error ? caught.message : fallback });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [offerRows, cityRows] = await Promise.all([api<{ items: Offer[]; total: number }>(`/api/admin/offers?page=${page}&pageSize=20`), api<City[]>("/api/admin/cities")]);
      const serviceLists = await Promise.all(cityRows.map((city) => api<ServiceOption[]>(`/api/admin/services?cityId=${city.id}`)));
      const uniqueServices = new Map<string, ServiceOption>();
      serviceLists.flat().forEach((service) => uniqueServices.set(service.id, { id: service.id, name: service.name }));
      setOffers(offerRows.items);
      setTotal(offerRows.total);
      setCities(cityRows);
      setServices([...uniqueServices.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (caught) {
      fail(caught, "Could not load offers.");
    } finally {
      setLoading(false);
    }
  }, [page]);

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

  const valid = draft.code.length >= 3 && draft.title.trim().length >= 2 && Number(draft.value) >= 1 && Number(draft.perUserLimit) >= 1 && !!draft.validFrom && !!draft.validTo && new Date(draft.validTo) > new Date(draft.validFrom);

  return <>
    <PageHeader title="Offers" description="Add, edit, target, activate or remove checkout promotions." action={<Button onClick={openCreate}><Plus className="size-4" />Add offer</Button>} />
    {notice && <div role="status" className={`mb-4 rounded-lg p-3 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
    {loading ? <LoadingState /> : !offers.length ? <EmptyState title="No offers" description="Create a coupon or automatic promotion." /> : <div className="grid gap-4 lg:grid-cols-2">{offers.map((offer) => {
      const expired = new Date(offer.valid_to) < new Date();
      return <Card key={offer.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Tag className="size-4 text-brand-600" /><strong>{offer.code}</strong><Badge tone={offer.is_active && !expired ? "green" : "slate"}>{expired ? "Expired" : offer.is_active ? "Active" : "Inactive"}</Badge>{offer.auto_apply && <Badge tone="blue">Automatic</Badge>}</div><p className="mt-2 font-medium text-slate-900">{offer.title}</p><p className="mt-1 text-sm text-slate-500">{offer.discount_type === "flat" ? formatMoney(offer.value) : `${offer.value}%${offer.max_discount ? ` up to ${formatMoney(offer.max_discount)}` : ""}`} off · minimum {formatMoney(offer.min_order)}</p><p className="mt-2 text-xs text-slate-500">Used {offer.used_count}{offer.usage_limit ? ` of ${offer.usage_limit}` : " times"} · {new Date(offer.valid_from).toLocaleDateString("en-IN")}–{new Date(offer.valid_to).toLocaleDateString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">{offer.city_ids.length ? `${offer.city_ids.length} selected cit${offer.city_ids.length === 1 ? "y" : "ies"}` : "All cities"} · {offer.service_ids.length ? `${offer.service_ids.length} selected service${offer.service_ids.length === 1 ? "" : "s"}` : "All services"}</p></div><div className="flex shrink-0 flex-wrap items-center gap-2"><Toggle checked={offer.is_active} onChange={(value) => void toggle(offer, value)} label={`Toggle ${offer.code}`} /><Button size="sm" variant="secondary" disabled={saving} onClick={() => openEdit(offer)}><Pencil className="size-4" />Edit</Button><Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={saving} onClick={() => setDeleting(offer)}><Trash2 className="size-4" />Delete</Button></div></div></Card>;
    })}</div>}
    <Pagination page={page} pageSize={20} total={total} onChange={setPage} disabled={loading} className="mt-4 px-0" />

    <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === "new" ? "Add offer" : `Edit ${editing?.code ?? "offer"}`} description="Control eligibility, discount rules and availability." footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving || !valid} onClick={saveOffer}>{saving && <Loader2 className="size-4 animate-spin" />}{editing === "new" ? "Create offer" : "Save changes"}</Button></>}><OfferFields draft={draft} cities={cities} services={services} onChange={(patch) => setDraft((old) => ({ ...old, ...patch }))} /></Modal>

    <Modal open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.code ?? "offer"}?`} description={deleting?.used_count ? "This offer has usage history and must be deactivated instead." : "This permanently removes the offer. This action cannot be undone."} footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Keep offer</Button><Button variant="danger" disabled={saving || !!deleting?.used_count} onClick={deleteOffer}>{saving && <Loader2 className="size-4 animate-spin" />}Delete offer</Button></>}><p className="text-sm text-slate-600">{deleting?.used_count ? `Used ${deleting.used_count} time${deleting.used_count === 1 ? "" : "s"}. Turn off Active to stop future use.` : "Unused offers can be safely deleted."}</p></Modal>
  </>;
}
