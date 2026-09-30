"use client";

import { useState } from "react";
import { Camera, Car, CheckCircle2, Clock, MapPin, Navigation, Phone, StickyNote } from "lucide-react";
import { Button, Card, StatusBadge } from "@/components/ui";
import type { Booking, BookingStatus, Service } from "@/lib/data";
import { cn, formatMoney } from "@/lib/utils";

const FLOW: { status: BookingStatus; label: string }[] = [
  { status: "accepted", label: "Accepted" },
  { status: "on_the_way", label: "On the way" },
  { status: "in_progress", label: "Washing" },
  { status: "completed", label: "Done" },
];

function PhotoSlots({
  title,
  photos,
  onAdd,
  disabled,
}: {
  title: string;
  photos: string[];
  onAdd: (url: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">
        {title} <span className="text-slate-400">({photos.length}/4)</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" className="aspect-square rounded-lg object-cover ring-1 ring-slate-200" />
        ))}
        {photos.length < 4 && !disabled && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600">
            <Camera className="size-5" />
            <span className="mt-1 text-[10px] font-medium">Add</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAdd(URL.createObjectURL(file));
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function JobDetail({ job, service, earning }: { job: Booking; service: Service; earning: number }) {
  const initial: BookingStatus = FLOW.some((f) => f.status === job.status) ? job.status : "accepted";
  const [status, setStatus] = useState<BookingStatus>(initial);
  const [before, setBefore] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const stepIndex = FLOW.findIndex((f) => f.status === status);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.address}, ${job.area}`)}`;

  const action = {
    accepted: { label: "Start trip", next: "on_the_way" as const, ready: true, hint: "" },
    on_the_way: {
      label: "Arrived — start wash",
      next: "in_progress" as const,
      ready: before.length > 0,
      hint: "Add at least one before photo to start.",
    },
    in_progress: {
      label: "Mark as completed",
      next: "completed" as const,
      ready: after.length > 0 && checked.length === service.features.length,
      hint: "Tick every checklist item and add an after photo.",
    },
  }[status as "accepted" | "on_the_way" | "in_progress"];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">{job.id}</p>
            <h1 className="text-lg font-bold text-slate-900">{service.name}</h1>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Progress */}
        <ol className="mt-5 grid grid-cols-4 gap-1">
          {FLOW.map((f, i) => (
            <li key={f.status} className="text-center">
              <div className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-brand-600" : "bg-slate-200")} />
              <p className={cn("mt-1.5 text-[11px] font-medium", i <= stepIndex ? "text-brand-700" : "text-slate-400")}>
                {f.label}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="divide-y divide-slate-100">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold text-slate-900">{job.customer}</p>
            <p className="text-sm text-slate-500">+91 {job.phone.slice(0, 2)}••• ••{job.phone.slice(-3)}</p>
          </div>
          <Button variant="secondary" size="sm">
            <Phone className="size-4" /> Call
          </Button>
        </div>
        <div className="space-y-2 p-4 text-sm text-slate-600">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" /> {job.address}, {job.area}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" /> {job.slot}
          </p>
          <p className="flex items-center gap-2">
            <Car className="size-4 text-slate-400" /> {job.vehicle} · {job.plate}
          </p>
          <p className="flex items-center gap-2">
            <StickyNote className="size-4 text-slate-400" /> Payment: {job.payment === "Cash" ? "Collect cash" : "Prepaid"}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700"
          >
            <Navigation className="size-4" /> Open in Google Maps
          </a>
        </div>
      </Card>

      {(status === "on_the_way" || status === "in_progress" || status === "completed") && (
        <Card className="space-y-5 p-4">
          <PhotoSlots title="Before photos" photos={before} onAdd={(u) => setBefore((p) => [...p, u])} disabled={status !== "on_the_way"} />
          {(status === "in_progress" || status === "completed") && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Checklist</p>
                <div className="space-y-2">
                  {service.features.map((f) => (
                    <label key={f} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        disabled={status === "completed"}
                        checked={status === "completed" || checked.includes(f)}
                        onChange={(e) => setChecked((c) => (e.target.checked ? [...c, f] : c.filter((x) => x !== f)))}
                        className="size-4 rounded border-slate-300 accent-brand-600"
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
              <PhotoSlots title="After photos" photos={after} onAdd={(u) => setAfter((p) => [...p, u])} disabled={status === "completed"} />
            </>
          )}
        </Card>
      )}

      {status === "completed" ? (
        <Card className="flex items-center gap-3 bg-emerald-50 p-4 ring-emerald-200">
          <CheckCircle2 className="size-6 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Job completed</p>
            <p className="text-sm text-emerald-700">{formatMoney(earning)} added to this week&apos;s payout.</p>
          </div>
        </Card>
      ) : (
        <div className="sticky bottom-20 z-10">
          <Button size="lg" className="w-full shadow-lg" disabled={!action.ready} onClick={() => setStatus(action.next)}>
            {action.label}
          </Button>
          {!action.ready && action.hint && <p className="mt-2 text-center text-xs text-slate-500">{action.hint}</p>}
        </div>
      )}
    </div>
  );
}
