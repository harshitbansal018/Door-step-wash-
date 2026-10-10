"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, MapPin, Power, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { WorkerJob, WorkerMe } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-state";
import { Badge, Button, Card, StatusBadge } from "@/components/ui";

type Jobs = { requests: WorkerJob[]; upcoming: WorkerJob[]; completedToday: WorkerJob[] };
export default function WorkerDashboard() {
  const [me, setMe] = useState<WorkerMe|null>(null); const [jobs, setJobs] = useState<Jobs|null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [profile, jobRows] = await Promise.all([api<WorkerMe>("/api/worker/me"), api<Jobs>("/api/worker/jobs")]); setMe(profile); setJobs(jobRows); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your jobs."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let current = true;
    void Promise.all([api<WorkerMe>("/api/worker/me"), api<Jobs>("/api/worker/jobs")])
      .then(([profile, jobRows]) => { if (current) { setMe(profile); setJobs(jobRows); } })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : "Could not load your jobs."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  async function setOnline(online: boolean) { setSaving(true); try { await api("/api/worker/status", { method: "POST", body: { online } }); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update status."); } finally { setSaving(false); } }
  async function respond(job: WorkerJob, accept: boolean) { setSaving(true); try { await api(`/api/worker/jobs/${job.id}/respond`, { method: "POST", body: { accept } }); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not respond to job."); } finally { setSaving(false); } }
  if (loading) return <LoadingState label="Loading partner dashboard…" />;
  if (!me || !jobs) return <ErrorState message={error || "Partner profile is unavailable."} retry={load} />;
  return <div className="space-y-6">
    {me.status === "pending_kyc" && <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Complete your KYC verification</p><p className="mt-1 text-amber-800">You can use the portal while verification is pending. Upload your document from your profile.</p></div><Link href="/worker/profile" className="font-semibold text-brand-700 hover:text-brand-800">Upload KYC →</Link></div>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500">Welcome back</p><h1 className="text-2xl font-bold">{me.name}</h1><p className="mt-1 text-sm text-slate-500">{me.area}, {me.city}</p></div><Button variant={me.isOnline ? "primary" : "secondary"} disabled={saving} onClick={() => setOnline(!me.isOnline)}><Power className="size-4" />{me.isOnline ? "Online — go offline" : "Go online"}</Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-sm text-slate-500">Job requests</p><p className="mt-2 text-2xl font-bold">{jobs.requests.length}</p></Card><Card className="p-5"><p className="text-sm text-slate-500">Upcoming jobs</p><p className="mt-2 text-2xl font-bold">{jobs.upcoming.length}</p></Card><Card className="p-5"><p className="text-sm text-slate-500">Completed today</p><p className="mt-2 text-2xl font-bold">{jobs.completedToday.length}</p></Card></div>
    <section><h2 className="mb-3 text-lg font-semibold">New requests</h2>{jobs.requests.length ? <div className="space-y-3">{jobs.requests.map((job) => <Card key={job.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><div className="flex items-center gap-2"><strong>{job.code} · {job.service.name}</strong><Badge tone="amber">Action required</Badge></div><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="size-4" />{formatDate(job.slot.date)}, {job.slot.start}–{job.slot.end}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4" />{job.area}, {job.city}</p><p className="mt-1 flex items-center gap-2 text-sm font-medium text-emerald-700"><Wallet className="size-4" />Earn {formatMoney(job.earning)}</p></div><div className="flex gap-2 sm:items-end"><Button variant="secondary" disabled={saving} onClick={() => respond(job, false)}>Decline</Button><Button disabled={saving} onClick={() => respond(job, true)}>{saving && <Loader2 className="size-4 animate-spin" />}Accept</Button></div></div></Card>)}</div> : <EmptyState title="No job requests" description={me.isOnline ? "New assignments will appear here." : "Go online when you are ready to receive work."} />}</section>
    <section><h2 className="mb-3 text-lg font-semibold">Upcoming jobs</h2>{jobs.upcoming.length ? <div className="space-y-3">{jobs.upcoming.map((job) => <Link key={job.id} href={`/worker/jobs/${job.id}`} className="block"><Card className="flex items-center justify-between p-5 transition hover:ring-brand-300"><div><strong>{job.code} · {job.service.name}</strong><p className="mt-1 text-sm text-slate-500">{formatDate(job.slot.date)}, {job.slot.start} · {job.area}</p></div><div className="text-right"><StatusBadge status={job.status} /><p className="mt-1 text-sm font-semibold text-emerald-700">{formatMoney(job.earning)}</p></div></Card></Link>)}</div> : <EmptyState title="No upcoming jobs" description="Accepted jobs appear here." />}</section>
  </div>;
}
