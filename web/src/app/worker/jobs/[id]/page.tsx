"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Car,
  Check,
  CheckCircle2,
  Clock,
  ImagePlus,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  ParkingSquare,
  Phone,
  Repeat,
  StickyNote,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { JOB_ISSUE_OPTIONS, type JobIssueReason, type WorkerJob } from "@/lib/domain";
import { compressImage, mapsLink, whatsappLink } from "@/lib/image";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { ErrorState } from "@/components/data-state";
import { toast } from "@/components/popups";
import { Button, Card, Label, Modal, Skeleton, StatusBadge } from "@/components/ui";

const PARKING: Record<string, string> = { basement: "Basement", open: "Open parking", covered: "Covered garage", street: "Street" };
const ACCESS: Record<string, string> = {
  customer_present: "Customer will be present",
  key_with_security: "Key is with security",
  no_access: "No interior access needed",
};
const STEPS = ["Accepted", "On the way", "Arrived", "Washing", "Done"];

function stepIndex(job: WorkerJob) {
  switch (job.status) {
    case "accepted":
      return 0;
    case "on_the_way":
      return job.arrivedAt ? 2 : 1;
    case "in_progress":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

function fullAddress(job: WorkerJob) {
  return [job.address.line, job.address.landmark, job.area, job.city, job.address.pincode].filter(Boolean).join(", ");
}

/** Checklist ticks are kept on the device per job, so a refresh or bad signal does not lose them. */
function useChecklist(jobId: string, items: string[]) {
  const key = `fv-checklist-${jobId}`;
  const [done, setDone] = useState<string[]>([]);
  const itemsKey = items.join("␞");
  useEffect(() => {
    const allowed = itemsKey ? itemsKey.split("␞") : [];
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) ?? "[]");
        if (Array.isArray(saved)) setDone(saved.filter((x) => allowed.includes(x)));
      } catch {
        // Storage unavailable: start empty.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, itemsKey]);
  const toggle = (item: string) =>
    setDone((old) => {
      const next = old.includes(item) ? old.filter((x) => x !== item) : [...old, item];
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore: ticks still work for this session.
      }
      return next;
    });
  return { done, toggle };
}

function Stepper({ index }: { index: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Job progress">
      {STEPS.map((label, i) => {
        const complete = i < index || index === 4;
        const current = i === index && index !== 4;
        return (
          <li key={label} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                complete ? "bg-emerald-500 text-white" : current ? "pulse-soft bg-brand-600 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {complete ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-[10px] leading-tight font-semibold sm:text-xs", current ? "text-brand-700" : complete ? "text-slate-700" : "text-slate-400")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PhotoSection({
  job,
  kind,
  enabled,
  busy,
  onUpload,
}: {
  job: WorkerJob;
  kind: "before" | "after";
  enabled: boolean;
  busy: boolean;
  onUpload: (kind: "before" | "after", files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = (job.photos ?? []).filter((p) => p.kind === kind);
  const max = job.maxPhotosPerKind ?? 4;
  const canAdd = enabled && photos.length < max;
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-slate-900">
          {kind} photos <span className="font-normal text-slate-500">({photos.length}/{max})</span>
        </p>
        {photos.length > 0 && <CheckCircle2 className="size-4 text-emerald-500" />}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) =>
          photo.url ? (
            <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="check-pop block aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL */}
              <img src={photo.url} alt={`${kind} photo`} className="size-full object-cover" />
            </a>
          ) : null,
        )}
        {canAdd && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            {busy ? "Uploading" : "Add photo"}
          </button>
        )}
        {!enabled && photos.length === 0 && (
          <div className="col-span-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-200">
            <ImagePlus className="size-4" /> {kind === "before" ? "Available once you start travel." : "Available once the wash has started."}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="sr-only"
        aria-label={`Add ${kind} photos`}
        onChange={(event) => {
          if (event.target.files?.length) onUpload(kind, event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function WorkerJobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<WorkerJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<JobIssueReason>("customer_unavailable");
  const [note, setNote] = useState("");
  const checklistItems = job?.checklist ?? [];
  const { done, toggle } = useChecklist(id, checklistItems);

  const load = useCallback(async () => {
    setError("");
    try {
      setJob(await api<WorkerJob>(`/api/worker/jobs/${id}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load job.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function run(work: () => Promise<unknown>, fallback: string, success?: string) {
    setSaving(true);
    setError("");
    try {
      await work();
      if (success) toast.success(success);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback);
      toast.error(fallback, caught instanceof Error ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const respond = (accept: boolean) => run(() => api(`/api/worker/jobs/${id}/respond`, { method: "POST", body: { accept } }), "Could not respond.", accept ? "Job accepted" : "Job declined");
  const progress = (status: "on_the_way" | "in_progress" | "completed") =>
    run(() => api(`/api/worker/jobs/${id}/progress`, { method: "POST", body: { status } }), "Could not update the job.", { on_the_way: "Marked on the way", in_progress: "Wash started", completed: "Job completed" }[status]);
  const arrive = () => run(() => api(`/api/worker/jobs/${id}/arrive`, { method: "POST" }), "Could not mark arrival.", "Arrival marked");

  async function upload(kind: "before" | "after", files: FileList) {
    setUploading(kind);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("kind", kind);
        body.set("file", await compressImage(file));
        await api(`/api/worker/jobs/${id}/photos`, { method: "POST", body });
      }
      toast.success(files.length > 1 ? "Photos uploaded" : "Photo uploaded");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload the photo.");
      toast.error("Upload failed", caught instanceof Error ? caught.message : undefined);
    } finally {
      setUploading(null);
      await load();
    }
  }

  async function report() {
    await run(() => api(`/api/worker/jobs/${id}/issues`, { method: "POST", body: { reason, note: note.trim() || undefined } }), "Could not report the problem.");
    setReporting(false);
    setNote("");
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (!job) return <ErrorState message={error || "Job not found."} retry={load} />;

  const index = stepIndex(job);
  const beforeCount = (job.photos ?? []).filter((p) => p.kind === "before").length;
  const afterCount = (job.photos ?? []).filter((p) => p.kind === "after").length;
  const checklistDone = checklistItems.every((item) => done.includes(item));
  const accepted = job.status !== "assigned";
  const active = ["accepted", "on_the_way", "in_progress"].includes(job.status);
  const address = fullAddress(job);

  // The one big action for the current step, plus why it may be blocked.
  let action: { label: string; onClick: () => void; blocked?: string } | null = null;
  if (job.status === "accepted") action = { label: "Start travel", onClick: () => progress("on_the_way") };
  else if (job.status === "on_the_way" && !job.arrivedAt) action = { label: "I've arrived", onClick: arrive };
  else if (job.status === "on_the_way")
    action = { label: "Start wash", onClick: () => progress("in_progress"), blocked: beforeCount ? undefined : "Add at least one before photo first." };
  else if (job.status === "in_progress")
    action = {
      label: "Complete job",
      onClick: () => progress("completed"),
      blocked: !afterCount ? "Add at least one after photo first." : !checklistDone ? "Tick every checklist item first." : undefined,
    };

  return (
    <div className="space-y-5 pb-24 sm:pb-0">
      <Link href="/worker/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> All jobs
      </Link>
      {error && <div role="alert" className="step-enter rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>}

      {/* Summary */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/20">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-40" />
        <div aria-hidden className="drift absolute -top-20 -right-16 size-56 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">{job.code}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{job.service.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                <Clock className="size-4" /> {formatDate(job.slot.date)}, {job.slot.start}–{job.slot.end}
                {job.durationMin ? ` · about ${job.durationMin} min` : ""}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={job.status} />
              <p className="mt-2 flex items-center justify-end gap-1 text-lg font-bold text-emerald-300">
                <Wallet className="size-4" /> {formatMoney(job.earning)}
              </p>
            </div>
          </div>
          {job.subscriptionId && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200">
              <Repeat className="size-3.5" /> Monthly plan customer
            </p>
          )}
          {index >= 0 && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-slate-900">
              <Stepper index={index} />
            </div>
          )}
        </div>
      </section>

      {job.hasOpenIssue && (
        <div className="step-enter flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Problem reported</p>
            <p className="mt-0.5 text-amber-800">
              {job.issues?.find((i) => !i.resolved)?.label}. The team has been told and will contact the customer. Wait for their call before leaving.
            </p>
          </div>
        </div>
      )}

      {/* Request: accept or decline */}
      {job.status === "assigned" && (
        <Card className="p-5 ring-2 ring-brand-500">
          <p className="font-semibold">Do you want this job?</p>
          <p className="mt-1 text-sm text-slate-500">The exact address and customer phone are shown after you accept.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="lg" variant="secondary" disabled={saving} onClick={() => respond(false)}>
              <X className="size-4" /> Decline
            </Button>
            <Button size="lg" disabled={saving} onClick={() => respond(true)}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Accept
            </Button>
          </div>
        </Card>
      )}

      {/* Customer and location */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Customer & location</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{job.contact.name}</p>
            <p className="text-sm text-slate-500">{job.contact.phone ?? "Phone shown after you accept"}</p>
          </div>
        </div>
        {accepted && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <a href={mapsLink(address)} target="_blank" rel="noopener noreferrer" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-brand-600 text-xs font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700">
              <Navigation className="size-4" /> Navigate
            </a>
            {job.contact.phone ? (
              <>
                <a href={`tel:${job.contact.phone}`} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50">
                  <Phone className="size-4" /> Call
                </a>
                <a
                  href={whatsappLink(job.contact.phone, `Hi ${job.contact.name}, this is your FoamValet partner for booking ${job.code}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white text-xs font-semibold text-emerald-700 ring-1 ring-slate-300 transition hover:bg-emerald-50"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </>
            ) : (
              <span className="col-span-2 flex items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500">No phone on this booking</span>
            )}
          </div>
        )}
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="sr-only">Address</dt>
            <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <dd>
              {job.address.line}
              {job.address.landmark && <span className="block text-slate-500">Near {job.address.landmark}</span>}
              <span className="block text-slate-500">{job.area}, {job.city} {job.address.pincode}</span>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="sr-only">Parking</dt>
            <ParkingSquare className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <dd>
              {PARKING[job.address.parkingType] ?? job.address.parkingType}
              {job.address.parkingSpot && <span className="text-slate-500"> · Spot {job.address.parkingSpot}</span>}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="sr-only">Car access</dt>
            <KeyRound className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <dd>{ACCESS[job.address.carAccess] ?? job.address.carAccess}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="sr-only">Vehicle</dt>
            <Car className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <dd>
              {job.vehicle.makeModel} · <span className="font-mono font-semibold">{job.vehicle.plate}</span>
            </dd>
          </div>
          {job.notes && (
            <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-amber-900">
              <dt className="sr-only">Customer note</dt>
              <StickyNote className="mt-0.5 size-4 shrink-0" />
              <dd>{job.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Checklist */}
      {checklistItems.length > 0 && accepted && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Service checklist</h2>
            <span className="text-xs font-semibold text-slate-500">
              {done.length}/{checklistItems.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(done.length / checklistItems.length) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-2">
            {checklistItems.map((item) => {
              const checked = done.includes(item) || job.status === "completed";
              const editable = job.status === "in_progress";
              return (
                <li key={item}>
                  <button
                    type="button"
                    disabled={!editable}
                    aria-pressed={checked}
                    onClick={() => toggle(item)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ring-1 transition-all duration-200",
                      checked ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-white ring-slate-200",
                      editable ? "active:scale-[.99]" : "cursor-default",
                    )}
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition", checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>
                      {checked && <Check className="check-pop size-4" />}
                    </span>
                    {item}
                  </button>
                </li>
              );
            })}
          </ul>
          {job.status !== "in_progress" && job.status !== "completed" && <p className="mt-3 text-xs text-slate-500">Tick items once the wash has started.</p>}
        </Card>
      )}

      {/* Photos */}
      {accepted && (
        <Card className="space-y-5 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Photo proof</h2>
            <p className="mt-0.5 text-xs text-slate-500">Photos are compressed on your phone before upload, so they work on mobile data.</p>
          </div>
          <PhotoSection job={job} kind="before" enabled={["on_the_way", "in_progress"].includes(job.status)} busy={uploading === "before"} onUpload={upload} />
          <PhotoSection job={job} kind="after" enabled={job.status === "in_progress"} busy={uploading === "after"} onUpload={upload} />
        </Card>
      )}

      {/* Problem report */}
      {active && (
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-50"
        >
          <AlertTriangle className="size-4" /> Report a problem
        </button>
      )}

      {job.status === "completed" && (
        <Card className="page-enter p-6 text-center">
          <span className="check-pop mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-8" />
          </span>
          <p className="mt-3 text-lg font-bold">Job completed</p>
          <p className="mt-1 text-sm text-slate-500">{formatMoney(job.earning)} has been added to your earnings.</p>
          <Button href="/worker" className="mt-4">Back to today</Button>
        </Card>
      )}

      {/* Sticky main action, within thumb reach on phones */}
      {action && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:rounded-2xl sm:border-0 sm:bg-transparent sm:p-0">
          {action.blocked && <p className="mb-2 text-center text-xs font-medium text-amber-700">{action.blocked}</p>}
          <Button size="lg" className="w-full rounded-xl" disabled={saving || !!action.blocked} onClick={action.onClick}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {action.label}
          </Button>
        </div>
      )}

      <Modal
        open={reporting}
        onClose={() => setReporting(false)}
        title="Report a problem"
        description="The team is notified straight away and will contact the customer. The job stays open until they resolve it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReporting(false)}>Cancel</Button>
            <Button disabled={saving || (reason === "other" && note.trim().length < 3)} onClick={report}>
              {saving && <Loader2 className="size-4 animate-spin" />} Send report
            </Button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">What happened?</legend>
          {JOB_ISSUE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition", reason === option.id ? "bg-amber-50 ring-2 ring-amber-400" : "ring-slate-200 hover:bg-slate-50")}
            >
              <input type="radio" name="issue" className="mt-1 accent-amber-600" checked={reason === option.id} onChange={() => setReason(option.id)} />
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <Label htmlFor="issue-note">Note {reason === "other" ? "(required)" : "(optional)"}</Label>
          <textarea
            id="issue-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="block w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </div>
      </Modal>
    </div>
  );
}
