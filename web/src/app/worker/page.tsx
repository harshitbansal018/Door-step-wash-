"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, Loader2, MapPin, Navigation, Phone, Repeat, Star, Wallet, X } from "lucide-react";
import { api } from "@/lib/api";
import type { WorkerJob, WorkerMe, WorkerToday } from "@/lib/domain";
import { mapsLink } from "@/lib/image";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { ErrorState } from "@/components/data-state";
import { toast } from "@/components/popups";
import { Badge, Button, Card, Skeleton, StatusBadge } from "@/components/ui";
import { ONLINE_EVENT } from "@/components/worker/worker-shell";

const todayIso = () => new Date().toLocaleDateString("en-CA");

function minutesAgo(iso: string | null | undefined, now: number) {
  if (!iso) return null;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

function dayLabel(date: string) {
  const today = todayIso();
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA");
  return date === today ? "Today" : date === tomorrow ? "Tomorrow" : formatDate(date);
}

function fullAddress(job: WorkerJob) {
  return [job.address.line, job.address.landmark, job.area, job.city, job.address.pincode].filter(Boolean).join(", ");
}

function RequestCard({ job, now, busy, onRespond }: { job: WorkerJob; now: number; busy: boolean; onRespond: (job: WorkerJob, accept: boolean) => void }) {
  const waited = minutesAgo(job.assignedAt, now);
  const urgent = waited !== null && waited >= 10;
  return (
    <Card className={cn("step-enter overflow-hidden ring-2", urgent ? "ring-amber-400" : "ring-brand-500")}>
      <div className={cn("flex items-center justify-between px-4 py-2 text-xs font-semibold", urgent ? "bg-amber-50 text-amber-800" : "bg-brand-50 text-brand-800")}>
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", urgent ? "bg-amber-500" : "bg-brand-500")} />
            <span className={cn("relative inline-flex size-2 rounded-full", urgent ? "bg-amber-500" : "bg-brand-600")} />
          </span>
          New job request
        </span>
        {waited !== null && <span>{waited < 1 ? "Just now" : `Waiting ${waited} min`}</span>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">{job.service.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <Clock className="size-4" /> {dayLabel(job.slot.date)}, {job.slot.start}–{job.slot.end}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="size-4" /> {job.area}, {job.city}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">You earn</p>
            <p className="text-xl font-bold text-emerald-600">{formatMoney(job.earning)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" disabled={busy} onClick={() => onRespond(job, false)}>
            <X className="size-4" /> Decline
          </Button>
          <Button size="lg" disabled={busy} onClick={() => onRespond(job, true)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Accept
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NextJobCard({ job }: { job: WorkerJob }) {
  return (
    <section className="step-enter relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/20">
      <div aria-hidden className="dot-grid absolute inset-0 opacity-40" />
      <div aria-hidden className="drift absolute -top-20 -right-16 size-56 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand-300 uppercase">Next job</p>
          <StatusBadge status={job.status} />
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">
          {dayLabel(job.slot.date)} · {job.slot.start}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          {job.service.name} · {job.vehicle.makeModel} ({job.vehicle.plate})
          {job.subscriptionId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-200">
              <Repeat className="size-3" /> Plan customer
            </span>
          )}
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-200">
          <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" /> {fullAddress(job)}
        </p>
        {job.hasOpenIssue && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-200">
            <AlertTriangle className="size-4" /> Problem reported. Waiting for the team to respond.
          </p>
        )}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <a
            href={mapsLink(fullAddress(job))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 text-xs font-semibold ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <Navigation className="size-4" /> Navigate
          </a>
          {job.contact.phone ? (
            <a
              href={`tel:${job.contact.phone}`}
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 text-xs font-semibold ring-1 ring-white/15 transition hover:bg-white/20"
            >
              <Phone className="size-4" /> Call
            </a>
          ) : (
            <span className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-white/5 text-xs text-slate-500">
              <Phone className="size-4" /> No phone
            </span>
          )}
          <Link
            href={`/worker/jobs/${job.id}`}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-brand-600 text-xs font-semibold shadow-lg shadow-brand-600/30 transition hover:bg-brand-500"
          >
            <ArrowRight className="size-4" /> Open job
          </Link>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({ job, last }: { job: WorkerJob; last: boolean }) {
  const done = job.status === "completed";
  return (
    <Link href={`/worker/jobs/${job.id}`} className="group flex gap-3">
      <div className="flex flex-col items-center">
        <span className={cn("mt-1 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-slate-100", done ? "bg-emerald-500 text-white" : "bg-white text-brand-600 ring-brand-100")}>
          {done ? <Check className="size-4" /> : <Clock className="size-3.5" />}
        </span>
        {!last && <span className="w-0.5 flex-1 bg-slate-200" />}
      </div>
      <div className="mb-3 flex flex-1 items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200 transition group-hover:ring-brand-300">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {job.slot.start} · {job.service.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {job.area} · {job.vehicle.plate}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={job.status} />
          <p className="mt-1 text-xs font-semibold text-emerald-700">{formatMoney(job.earning)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function WorkerToday() {
  const [data, setData] = useState<WorkerToday | null>(null);
  const [me, setMe] = useState<WorkerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setError("");
    try {
      const [jobs, profile] = await Promise.all([api<WorkerToday>("/api/worker/jobs"), api<WorkerMe>("/api/worker/me")]);
      setData(jobs);
      setMe(profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    // Refresh every minute so new requests and waiting times stay current.
    const refresh = window.setInterval(() => {
      setNow(Date.now());
      void load();
    }, 60_000);
    const onOnline = () => void load();
    window.addEventListener(ONLINE_EVENT, onOnline);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(refresh);
      window.removeEventListener(ONLINE_EVENT, onOnline);
    };
  }, [load]);

  async function respond(job: WorkerJob, accept: boolean) {
    setBusyId(job.id);
    setError("");
    try {
      await api(`/api/worker/jobs/${job.id}/respond`, { method: "POST", body: { accept } });
      toast.success(accept ? "Job accepted" : "Job declined");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not respond to the job.");
      toast.error("Could not respond", caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-56 rounded-3xl" />
      </div>
    );
  }
  if (!data || !me) return <ErrorState message={error || "Partner profile is unavailable."} retry={load} />;

  const today = todayIso();
  const next = data.upcoming[0] ?? null;
  const todaysJobs = [...data.completedToday, ...data.upcoming.filter((job) => job.slot.date === today)].sort((a, b) =>
    a.slot.start.localeCompare(b.slot.start),
  );
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {me.status === "pending_kyc" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Complete your KYC verification</p>
            <p className="mt-1 text-amber-800">{me.hasKycDocument ? "Your document is with the team for review." : "Upload your ID document to get verified."}</p>
          </div>
          {!me.hasKycDocument && <Button href="/worker/profile" size="sm">Upload KYC</Button>}
        </div>
      )}
      {error && <div role="alert" className="step-enter rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>}

      <div>
        <p className="text-sm text-slate-500">{greeting},</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{me.name.split(" ")[0]}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="size-4" /> {me.area ?? "No area"}, {me.city ?? ""}
        </p>
      </div>

      {!data.stats.isOnline && me.status === "active" && (
        <div className="step-enter flex items-center gap-3 rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
          <span className="size-2.5 shrink-0 rounded-full bg-slate-500" />
          You are offline. Turn on <strong className="text-white">Online</strong> at the top to receive new jobs.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Earned today", value: formatMoney(data.stats.earnedToday), icon: Wallet, tone: "text-emerald-600 bg-emerald-50" },
          { label: "Done today", value: String(data.stats.completedToday), icon: CheckCircle2, tone: "text-brand-600 bg-brand-50" },
          { label: "Rating", value: data.stats.rating ? data.stats.rating.toFixed(1) : "New", icon: Star, tone: "text-amber-600 bg-amber-50" },
        ].map((stat, index) => (
          <Card key={stat.label} className="step-enter p-3 sm:p-4" style={{ animationDelay: `${index * 60}ms` }}>
            <span className={cn("flex size-8 items-center justify-center rounded-lg", stat.tone)}>
              <stat.icon className="size-4" />
            </span>
            <p className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{stat.value}</p>
            <p className="text-[11px] text-slate-500 sm:text-xs">{stat.label}</p>
          </Card>
        ))}
      </div>

      {data.requests.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            New requests <Badge tone="blue">{data.requests.length}</Badge>
          </h2>
          {data.requests.map((job) => (
            <RequestCard key={job.id} job={job} now={now} busy={busyId === job.id} onRespond={respond} />
          ))}
        </section>
      )}

      {next ? (
        <NextJobCard job={next} />
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">No upcoming jobs</p>
          <p className="mt-1 text-sm text-slate-500">{data.stats.isOnline ? "New jobs appear here as soon as they are assigned." : "Go online to start receiving jobs."}</p>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Today&apos;s schedule</h2>
          <Link href="/worker/jobs" className="text-sm font-medium text-brand-700">All jobs</Link>
        </div>
        {todaysJobs.length ? (
          <div>
            {todaysJobs.map((job, index) => (
              <TimelineRow key={job.id} job={job} last={index === todaysJobs.length - 1} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-white p-5 text-center text-sm text-slate-500 ring-1 ring-slate-200">Nothing scheduled for today.</p>
        )}
      </section>
    </div>
  );
}
