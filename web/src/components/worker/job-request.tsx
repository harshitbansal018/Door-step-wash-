"use client";

import { useEffect, useState } from "react";
import { Bell, Clock, MapPin } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { Booking } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export function JobRequest({ job, serviceLabel, earning }: { job: Booking; serviceLabel: string; earning: number }) {
  const [state, setState] = useState<"open" | "accepted" | "declined">("open");
  const [seconds, setSeconds] = useState(300);

  useEffect(() => {
    if (state !== "open") return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (state === "declined") return null;

  if (state === "accepted") {
    return (
      <Card className="border-l-4 border-emerald-500 p-4">
        <p className="text-sm font-semibold text-emerald-700">Job accepted</p>
        <p className="mt-0.5 text-sm text-slate-600">
          {job.id} has been added to your schedule for {job.slot}.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden ring-2 ring-brand-600">
      <div className="flex items-center justify-between bg-brand-600 px-4 py-2.5 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4" /> New job request
        </p>
        <p className="font-mono text-sm tabular-nums">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-900">{serviceLabel}</p>
            <p className="text-sm text-slate-500">{job.vehicle}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600">{formatMoney(earning)}</p>
            <p className="text-xs text-slate-500">You earn</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" /> Today, {job.slot}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-slate-400" /> {job.area} · 3.2 km away
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setState("declined")}>
            Decline
          </Button>
          <Button onClick={() => setState("accepted")}>Accept</Button>
        </div>
      </div>
    </Card>
  );
}
