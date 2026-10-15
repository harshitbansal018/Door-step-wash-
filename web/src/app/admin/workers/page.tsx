"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, ExternalLink, Loader2, Plus, Star, Upload, UserCheck, Users } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { FilterBar, SearchBox, useDebounced } from "@/components/filters";
import { api } from "@/lib/api";
import type { City, Worker, WorkerStatus } from "@/lib/domain";
import { PasswordInput, PasswordRules, passwordIsValid } from "@/components/auth/fields";
import { toast } from "@/components/popups";
import { Avatar, Badge, Button, Card, Input, Label, Modal, PageHeader, Select, StatCard } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-state";

const badge: Record<WorkerStatus, React.ReactNode> = {
  active: <Badge tone="green">Active</Badge>, pending_kyc: <Badge tone="amber">KYC pending</Badge>, suspended: <Badge tone="red">Suspended</Badge>,
};

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]); const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [ready, setReady] = useState(false);
  const [search, setSearch] = useState(""); const [cityFilter, setCityFilter] = useState(""); const [statusFilter, setStatusFilter] = useState(""); const [onlineFilter, setOnlineFilter] = useState("");
  const q = useDebounced(search.trim());
  const filterKey = `${q}|${cityFilter}|${statusFilter}|${onlineFilter}`; const [lastFilter, setLastFilter] = useState(filterKey);
  if (lastFilter !== filterKey) { setLastFilter(filterKey); setPage(1); }
  const filtering = !!(q || cityFilter || statusFilter || onlineFilter); const [counts, setCounts] = useState({ active: 0, online: 0, pendingKyc: 0 });
  const [adding, setAdding] = useState(false); const [uploading, setUploading] = useState<Worker | null>(null); const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<Worker | null>(null); const [editForm, setEditForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", status: "pending_kyc" as WorkerStatus, areaId: "", commissionRate: "", bankLast4: "", phone: "" });
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", phone: "", areaId: "", commissionRate: "40" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [workerRows, cityRows] = await Promise.all([api<{ items: Worker[]; total: number; counts: { active: number; online: number; pendingKyc: number } }>(`/api/admin/workers?${new URLSearchParams({ page: String(page), pageSize: "25", ...(q ? { search: q } : {}), ...(cityFilter ? { cityId: cityFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...(onlineFilter ? { online: onlineFilter } : {}) })}`), api<City[]>("/api/admin/cities")]); setWorkers(workerRows.items); setTotal(workerRows.total); setCounts(workerRows.counts); setCities(cityRows); setForm((old) => ({ ...old, areaId: old.areaId || cityRows.flatMap((city) => city.areas).find((area) => area.is_active)?.id || "" })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load workers."); }
    finally { setLoading(false); setReady(true); }
  }, [page, q, cityFilter, statusFilter, onlineFilter]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function closeAddWorker() {
    setAdding(false);
    setForm((old) => ({ ...old, password: "", confirmPassword: "" }));
  }

  function closeEditWorker() {
    setEditing(null);
    setEditForm((old) => ({ ...old, password: "", confirmPassword: "" }));
  }

  async function createWorker() {
    setSaving(true); setError("");
    try { await api("/api/admin/workers", { method: "POST", body: { fullName: form.fullName, email: form.email, password: form.password, phone: form.phone, areaId: form.areaId, commissionRate: Number(form.commissionRate) / 100 } }); setAdding(false); setForm((old) => ({ ...old, fullName: "", email: "", password: "", confirmPassword: "", phone: "" })); toast.success("Worker created."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create worker."); }
    finally { setSaving(false); }
  }

  async function updateWorker(worker: Worker, status: WorkerStatus) {
    setSaving(true); setError("");
    try { await api(`/api/admin/workers/${worker.id}`, { method: "PATCH", body: { status } }); toast.success(`Worker marked ${status}.`); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update worker."); }
    finally { setSaving(false); }
  }

  async function uploadKyc() {
    if (!uploading || !file) return;
    setSaving(true); setError("");
    try { const body = new FormData(); body.set("file", file); await api(`/api/admin/workers/${uploading.id}/kyc`, { method: "POST", body }); setUploading(null); setFile(null); toast.success("KYC document uploaded."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not upload KYC."); }
    finally { setSaving(false); }
  }

  async function saveWorker() {
    if (!editing) return;
    setSaving(true); setError("");
    try { await api(`/api/admin/workers/${editing.id}`, { method: "PATCH", body: { fullName: editForm.fullName, email: editForm.email, ...(editForm.password ? { password: editForm.password } : {}), status: editForm.status, areaId: editForm.areaId, commissionRate: Number(editForm.commissionRate) / 100, phone: editForm.phone, bankLast4: editForm.bankLast4 || null } }); setEditing(null); setEditForm((old) => ({ ...old, password: "", confirmPassword: "" })); toast.success("Worker updated."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update worker."); }
    finally { setSaving(false); }
  }

  async function viewKyc(worker: Worker) {
    try { const result = await api<{ url: string }>(`/api/admin/workers/${worker.id}/kyc`); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not open KYC."); }
  }

  const areas = cities.flatMap((city) => city.areas.map((area) => ({ ...area, city: city.name })));
  return <>
    <PageHeader title="Workers" description="Create partner accounts, verify KYC and control access." action={<Button onClick={() => setAdding(true)}><Plus className="size-4" />Add worker</Button>} />
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading && !ready ? <LoadingState label="Loading workers…" /> : <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Active workers" value={String(counts.active)} icon={<UserCheck className="size-5" />} /><StatCard label="Online now" value={String(counts.online)} icon={<Users className="size-5" />} /><StatCard label="Awaiting KYC" value={String(counts.pendingKyc)} icon={<Clock className="size-5" />} /></div>
      <FilterBar className="mb-4">
        <SearchBox value={search} onChange={setSearch} label="Search workers" placeholder="Name, email or phone" />
        <Select aria-label="City" className="sm:w-44" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">All cities</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</Select>
        <Select aria-label="Status" className="sm:w-40" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="pending_kyc">KYC pending</option><option value="suspended">Suspended</option></Select>
        <Select aria-label="Availability" className="sm:w-36" value={onlineFilter} onChange={(event) => setOnlineFilter(event.target.value)}><option value="">Any</option><option value="true">Online</option><option value="false">Offline</option></Select>
        {filtering && <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setCityFilter(""); setStatusFilter(""); setOnlineFilter(""); }}>Clear</Button>}
      </FilterBar>
      {!workers.length ? <EmptyState title={filtering ? "No matching workers" : "No workers"} description={filtering ? "Try a different search or clear the filters." : "Add your first service partner to begin assigning bookings."} /> : <Card className="overflow-hidden"><div className="scroll-slim overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Area</th><th className="px-5 py-3">Performance</th><th className="px-5 py-3">KYC</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{workers.map((worker) => <tr key={worker.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><Avatar name={worker.name} /><div><p className="font-medium">{worker.name}</p><p className="text-xs text-slate-500">{worker.email}{worker.phone ? ` · ${worker.phone}` : ""}</p></div></div></td><td className="px-5 py-4">{worker.area}<span className="block text-xs text-slate-500">{worker.city}</span></td><td className="px-5 py-4"><span className="flex gap-1"><Star className="size-4 fill-amber-400 text-amber-400" />{worker.rating || "New"}</span><span className="text-xs text-slate-500">{worker.jobsDone} jobs · {Math.round(worker.commissionRate * 100)}%</span></td><td className="px-5 py-4">{worker.hasKycDocument ? <Button size="sm" variant="ghost" onClick={() => viewKyc(worker)}><ExternalLink className="size-4" />View</Button> : <Button size="sm" variant="secondary" onClick={() => setUploading(worker)}><Upload className="size-4" />Upload</Button>}</td><td className="px-5 py-4">{badge[worker.status]}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => { setEditing(worker); setEditForm({ fullName: worker.name, email: worker.email, password: "", confirmPassword: "", status: worker.status, areaId: worker.areaId, commissionRate: String(Math.round(worker.commissionRate * 100)), bankLast4: worker.bankLast4 ?? "", phone: worker.phone ?? "" }); }}>Edit</Button>{worker.status === "pending_kyc" && <Button size="sm" disabled={saving || !worker.hasKycDocument} onClick={() => updateWorker(worker, "active")}>Activate</Button>}{worker.status === "active" && <Button size="sm" variant="secondary" disabled={saving} onClick={() => updateWorker(worker, "suspended")}>Suspend</Button>}{worker.status === "suspended" && <Button size="sm" variant="secondary" disabled={saving} onClick={() => updateWorker(worker, "active")}>Reactivate</Button>}</div></td></tr>)}</tbody></table></div><Pagination page={page} pageSize={25} total={total} onChange={setPage} disabled={loading} className="border-t border-slate-200" /></Card>}
    </>}
    {!loading && error && !workers.length && <ErrorState message={error} retry={load} />}

    <Modal open={adding} onClose={closeAddWorker} title="Add worker" description="Create the worker's login. Their email and initial password will be sent automatically." footer={<><Button variant="secondary" onClick={closeAddWorker}>Cancel</Button><Button disabled={saving || form.fullName.trim().length < 2 || !form.email.includes("@") || !passwordIsValid(form.password) || form.password !== form.confirmPassword || !/^\d{10}$/.test(form.phone) || !form.areaId} onClick={createWorker}>{saving && <Loader2 className="size-4 animate-spin" />}Create account</Button></>}>
      <div className="space-y-4"><div><Label htmlFor="worker-name">Full name</Label><Input id="worker-name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></div><div><Label htmlFor="worker-email">Email address</Label><Input id="worker-email" type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div><Label htmlFor="worker-password">Initial password</Label><PasswordInput id="worker-password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><PasswordRules password={form.password} /></div><div><Label htmlFor="worker-confirm-password">Confirm password</Label><PasswordInput id="worker-confirm-password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />{form.confirmPassword && form.confirmPassword !== form.password && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}</div><div><Label htmlFor="worker-phone">Mobile number</Label><Input id="worker-phone" inputMode="numeric" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0,10) })} /></div><div><Label htmlFor="worker-area">Service area</Label><Select id="worker-area" value={form.areaId} onChange={(event) => setForm({ ...form, areaId: event.target.value })}>{areas.map((area) => <option key={area.id} value={area.id}>{area.city} · {area.name}</option>)}</Select></div><div><Label htmlFor="commission">Commission percentage</Label><Input id="commission" type="number" min="0" max="100" value={form.commissionRate} onChange={(event) => setForm({ ...form, commissionRate: event.target.value })} /></div></div>
    </Modal>
    <Modal open={!!uploading} onClose={() => setUploading(null)} title={`Upload KYC for ${uploading?.name ?? "worker"}`} footer={<><Button variant="secondary" onClick={() => setUploading(null)}>Cancel</Button><Button disabled={!file || saving} onClick={uploadKyc}>{saving && <Loader2 className="size-4 animate-spin" />}Upload document</Button></>}><Label htmlFor="kyc-file">PDF or image document</Label><Input id="kyc-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Modal>
    <Modal
      open={!!editing}
      onClose={closeEditWorker}
      size="lg"
      title={`Edit ${editing?.name ?? "worker"}`}
      description="Update account access, service area and payout details. Leave the password blank to keep the current one."
      footer={
        <>
          <Button variant="secondary" onClick={closeEditWorker}>Cancel</Button>
          <Button disabled={saving || editForm.fullName.trim().length < 2 || !editForm.email.includes("@") || (!!editForm.password && !passwordIsValid(editForm.password)) || editForm.password !== editForm.confirmPassword || !editForm.areaId || !/^\d{10}$/.test(editForm.phone) || Number(editForm.commissionRate) < 0 || Number(editForm.commissionRate) > 100 || (!!editForm.bankLast4 && !/^\d{4}$/.test(editForm.bankLast4))} onClick={saveWorker}>
            {saving && <Loader2 className="size-4 animate-spin" />}Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <div><Label htmlFor="edit-name">Full name</Label><Input id="edit-name" value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} /></div>
        <div><Label htmlFor="edit-email">Login email</Label><Input id="edit-email" type="email" autoComplete="off" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></div>
        <div><Label htmlFor="edit-password">New password (optional)</Label><PasswordInput id="edit-password" autoComplete="new-password" value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} />{editForm.password && <PasswordRules password={editForm.password} />}</div>
        <div><Label htmlFor="edit-confirm-password">Confirm new password</Label><PasswordInput id="edit-confirm-password" autoComplete="new-password" value={editForm.confirmPassword} onChange={(event) => setEditForm({ ...editForm, confirmPassword: event.target.value })} />{editForm.confirmPassword && editForm.confirmPassword !== editForm.password && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}</div>
        <div><Label htmlFor="edit-status">Status</Label><Select id="edit-status" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as WorkerStatus })}><option value="pending_kyc">KYC pending</option><option value="active" disabled={!editing?.hasKycDocument}>Active</option><option value="suspended">Suspended</option></Select></div>
        <div><Label htmlFor="edit-phone">Mobile number</Label><Input id="edit-phone" inputMode="numeric" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value.replace(/\D/g, "").slice(0,10) })} /></div>
        <div><Label htmlFor="edit-area">Service area</Label><Select id="edit-area" value={editForm.areaId} onChange={(event) => setEditForm({ ...editForm, areaId: event.target.value })}>{areas.map((area) => <option key={area.id} value={area.id}>{area.city} · {area.name}</option>)}</Select></div>
        <div><Label htmlFor="edit-commission">Commission percentage</Label><Input id="edit-commission" type="number" min="0" max="100" value={editForm.commissionRate} onChange={(event) => setEditForm({ ...editForm, commissionRate: event.target.value })} /></div>
        <div><Label htmlFor="bank-last4">Bank account last 4 digits</Label><Input id="bank-last4" inputMode="numeric" maxLength={4} value={editForm.bankLast4} onChange={(event) => setEditForm({ ...editForm, bankLast4: event.target.value.replace(/\D/g, "").slice(0,4) })} /></div>
      </div>
    </Modal>
  </>;
}
