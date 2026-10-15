"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-state";
import { confirmDialog, toast } from "@/components/popups";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { VEHICLES, type VehicleType } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_min: number;
  vehicle_types: VehicleType[];
  sort_order: number;
  is_active: boolean;
}

interface Draft {
  name: string;
  description: string;
  price: string;
  durationMin: string;
  vehicleTypes: VehicleType[];
  sortOrder: string;
  isActive: boolean;
}

const emptyDraft: Draft = { name: "", description: "", price: "", durationMin: "10", vehicleTypes: [], sortOrder: "0", isActive: true };

const toDraft = (a: Addon): Draft => ({
  name: a.name,
  description: a.description,
  price: String(a.price),
  durationMin: String(a.duration_min),
  vehicleTypes: a.vehicle_types,
  sortOrder: String(a.sort_order),
  isActive: a.is_active,
});

const vehicleLabel = (types: VehicleType[]) =>
  types.length ? types.map((t) => VEHICLES.find((v) => v.id === t)?.label ?? t).join(", ") : "All vehicles";

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Addon | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAddons(await api<Addon[]>("/api/admin/addons"));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load add-ons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api<Addon[]>("/api/admin/addons")
      .then((data) => active && setAddons(data))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load add-ons."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function open(target: Addon | "new") {
    setDraft(target === "new" ? emptyDraft : toDraft(target));
    setEditing(target);
  }

  const valid = draft.name.trim().length >= 2 && Number(draft.price) >= 1;

  async function save() {
    if (!editing || !valid) return;
    setSaving(true);
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: Math.round(Number(draft.price)),
      durationMin: Math.round(Number(draft.durationMin) || 0),
      vehicleTypes: draft.vehicleTypes,
      sortOrder: Math.round(Number(draft.sortOrder) || 0),
      isActive: draft.isActive,
    };
    try {
      if (editing === "new") await api("/api/admin/addons", { method: "POST", body });
      else await api(`/api/admin/addons/${editing.id}`, { method: "PATCH", body });
      toast.success(editing === "new" ? "Add-on created." : "Add-on updated.");
      setEditing(null);
      await load();
    } catch (caught) {
      toast.error("Could not save add-on", caught instanceof Error ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(addon: Addon, isActive: boolean) {
    try {
      await api(`/api/admin/addons/${addon.id}`, { method: "PATCH", body: { isActive } });
      toast.success(`${addon.name} ${isActive ? "is now shown at checkout" : "is hidden"}.`);
      await load();
    } catch (caught) {
      toast.error("Could not update add-on", caught instanceof Error ? caught.message : undefined);
    }
  }

  async function remove(addon: Addon) {
    const ok = await confirmDialog({
      title: `Delete ${addon.name}?`,
      message: "Customers will no longer see it at checkout. Past bookings keep their add-on details.",
      confirmLabel: "Delete add-on",
    });
    if (!ok) return;
    try {
      await api(`/api/admin/addons/${addon.id}`, { method: "DELETE" });
      toast.success(`${addon.name} deleted.`);
      await load();
    } catch (caught) {
      toast.error("Could not delete add-on", caught instanceof Error ? caught.message : undefined);
    }
  }

  const toggleVehicle = (type: VehicleType) =>
    setDraft((d) => ({ ...d, vehicleTypes: d.vehicleTypes.includes(type) ? d.vehicleTypes.filter((t) => t !== type) : [...d.vehicleTypes, type] }));

  return (
    <>
      <PageHeader
        title="Add-ons"
        description="Optional extras customers can add to a one-time booking at checkout. Partners earn their commission on them too."
        action={<Button onClick={() => open("new")}><Plus className="size-4" />New add-on</Button>}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : !addons.length ? (
        <EmptyState title="No add-ons yet" description="Create extras like interior vacuum or tyre shine to raise the order value." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addons.map((addon) => (
            <Card key={addon.id} className={cn("p-5", !addon.is_active && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{addon.name}</h3>
                  {addon.description && <p className="mt-1 text-sm text-slate-500">{addon.description}</p>}
                </div>
                <strong className="shrink-0 tabular-nums text-slate-900">{formatMoney(addon.price)}</strong>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={addon.is_active ? "green" : "slate"}>{addon.is_active ? "Live" : "Hidden"}</Badge>
                <Badge>{vehicleLabel(addon.vehicle_types)}</Badge>
                {addon.duration_min > 0 && <Badge>+{addon.duration_min} min</Badge>}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Toggle checked={addon.is_active} onChange={(value) => setActive(addon, value)} label="Show at checkout" />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => open(addon)}><Pencil className="size-4" />Edit</Button>
                  <Button variant="secondary" size="sm" onClick={() => remove(addon)} aria-label={`Delete ${addon.name}`}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New add-on" : "Edit add-on"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saving || !valid} onClick={save}>{saving && <Loader2 className="size-4 animate-spin" />}Save add-on</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="addon-name">Name</Label><Input id="addon-name" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Interior vacuum" /></div>
          <div className="sm:col-span-2"><Label htmlFor="addon-desc">Short description (optional)</Label><Input id="addon-desc" maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Seats, mats and boot vacuumed" /></div>
          <div><Label htmlFor="addon-price">Price ₹</Label><Input id="addon-price" type="number" min="1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
          <div><Label htmlFor="addon-time">Extra time (minutes)</Label><Input id="addon-time" type="number" min="0" max="240" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Label>Vehicle types (none selected = all)</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLES.map((v) => {
                const on = draft.vehicleTypes.includes(v.id);
                return (
                  <button key={v.id} type="button" aria-pressed={on} onClick={() => toggleVehicle(v.id)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition", on ? "bg-brand-50 text-brand-700 ring-2 ring-brand-600" : "text-slate-600 ring-slate-200 hover:ring-slate-300")}>
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div><Label htmlFor="addon-sort">Display order</Label><Input id="addon-sort" type="number" min="0" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} /></div>
          <div className="flex items-end pb-2"><Toggle checked={draft.isActive} onChange={(isActive) => setDraft({ ...draft, isActive })} label="Show at checkout" /></div>
        </div>
      </Modal>
    </>
  );
}
