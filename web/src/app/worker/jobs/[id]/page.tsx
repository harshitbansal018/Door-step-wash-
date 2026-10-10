"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Camera, Loader2, MapPin, Phone, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { BookingStatus, WorkerJob } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Button, Card, Input, Label, StatusBadge } from "@/components/ui";

const nextStep: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  accepted: { status: "on_the_way", label: "Start travel" }, on_the_way: { status: "in_progress", label: "Start wash" }, in_progress: { status: "completed", label: "Complete job" },
};

export default function WorkerJobPage() {
  const params = useParams<{ id: string }>(); const id = params.id;
  const [job, setJob] = useState<WorkerJob|null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [kind, setKind] = useState<"before"|"after">("before"); const [file, setFile] = useState<File|null>(null);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setJob(await api<WorkerJob>(`/api/worker/jobs/${id}`)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load job."); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  async function advance() { if (!job) return; const step = nextStep[job.status]; if (!step) return; setSaving(true); try { await api(`/api/worker/jobs/${job.id}/progress`, { method: "POST", body: { status: step.status } }); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update job."); } finally { setSaving(false); } }
  async function upload() { if (!job || !file) return; setSaving(true); try { const body = new FormData(); body.set("kind", kind); body.set("file", file); await api(`/api/worker/jobs/${job.id}/photos`, { method: "POST", body }); setFile(null); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not upload photo."); } finally { setSaving(false); } }
  if (loading) return <LoadingState label="Loading job…" />;
  if (!job) return <ErrorState message={error || "Job not found."} retry={load} />;
  const allowedPhoto = job.status === "on_the_way" ? "before" : job.status === "in_progress" ? "after" : null;
  return <div className="space-y-5"><Link href="/worker" className="inline-flex items-center gap-1 text-sm text-slate-600"><ArrowLeft className="size-4" />Back to jobs</Link>{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Card className="p-6"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><div className="flex items-center gap-2"><h1 className="text-xl font-bold">{job.code}</h1><StatusBadge status={job.status} /></div><p className="mt-2 text-lg font-semibold">{job.service.name}</p><p className="mt-1 text-sm text-slate-500">{formatDate(job.slot.date)}, {job.slot.start}–{job.slot.end}</p></div><div className="sm:text-right"><p className="flex items-center gap-2 font-semibold text-emerald-700"><Wallet className="size-4" />{formatMoney(job.earning)}</p>{nextStep[job.status] && <Button className="mt-3" disabled={saving} onClick={advance}>{saving && <Loader2 className="size-4 animate-spin" />}{nextStep[job.status]?.label}</Button>}</div></div></Card><div className="grid gap-5 lg:grid-cols-2"><Card className="p-6"><h2 className="font-semibold">Customer & location</h2><p className="mt-4 font-medium">{job.contact.name}</p>{job.contact.phone && <a className="mt-1 flex items-center gap-2 text-sm text-brand-700" href={`tel:${job.contact.phone}`}><Phone className="size-4" />{job.contact.phone}</a>}<p className="mt-4 flex gap-2 text-sm text-slate-700"><MapPin className="size-4 shrink-0" />{job.address.line}, {job.area}, {job.city} {job.address.pincode}</p>{job.address.parkingSpot && <p className="mt-2 text-sm text-slate-500">Parking: {job.address.parkingSpot}</p>}</Card><Card className="p-6"><h2 className="font-semibold">Service checklist</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">{job.checklist.map((item) => <li key={item}>{item}</li>)}</ul></Card></div>{allowedPhoto && <Card className="p-6"><h2 className="font-semibold">Job photos</h2><p className="mt-1 text-sm text-slate-500">Upload at least one {allowedPhoto} photo before moving to the next stage.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="job-photo">{allowedPhoto === "before" ? "Before photo" : "After photo"}</Label><Input id="job-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setKind(allowedPhoto); }} /></div><Button disabled={!file || saving} onClick={upload}><Camera className="size-4" />Upload</Button></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{job.photos?.map((photo) => photo.url && <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`${photo.kind} wash`} className="aspect-square w-full rounded-lg object-cover" /></a>)}</div></Card>}</div>;
}
