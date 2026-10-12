"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Droplets, MapPin, Navigation, ShieldCheck, Sparkles } from "lucide-react";
import { Tilt } from "@/components/motion";
import { cn } from "@/lib/utils";

const stages = [
  { label: "Confirmed", detail: "Slot reserved", icon: Check },
  { label: "Assigned", detail: "Partner verified", icon: ShieldCheck },
  { label: "En route", detail: "Live status", icon: Navigation },
  { label: "Washing", detail: "At your parking", icon: Droplets },
  { label: "Complete", detail: "Photo proof ready", icon: Sparkles },
] as const;

export function HomePreview() {
  const [active, setActive] = useState(2);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % stages.length), 3200);
    return () => window.clearInterval(timer);
  }, [paused]);

  const current = stages[active];
  const CurrentIcon = current.icon;

  return (
    <Tilt max={5}>
    <div
      className="hero-console relative overflow-hidden rounded-[2rem] bg-slate-950 p-3 shadow-2xl shadow-blue-950/25 ring-1 ring-white/10 sm:p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div aria-hidden className="dot-grid absolute inset-0 opacity-70" />
      <div aria-hidden className="drift absolute -top-24 -right-20 size-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div aria-hidden className="float-slow-reverse absolute -bottom-28 -left-20 size-64 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative flex items-center justify-between px-2 py-2 text-white">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
            <span className="absolute size-2 animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative size-2 rounded-full bg-emerald-400" />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Live booking</p>
            <p className="text-sm font-semibold">Wash #DW-2048</p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/10">
          Tap a stage
        </span>
      </div>

      <div className="relative mt-3 rounded-[1.4rem] bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div key={active} className="step-enter">
            <p className="text-xs font-semibold text-brand-600">CURRENT STATUS</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{current.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{current.detail}</p>
          </div>
          <span key={`icon-${active}`} className="check-pop flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <CurrentIcon className="size-5" />
          </span>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-[width] duration-700 ease-out"
            style={{ width: `${((active + 1) / stages.length) * 100}%` }}
          />
        </div>

        <div className="mt-5 grid grid-cols-5 gap-1.5" role="tablist" aria-label="Booking progress preview">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const selected = active === index;
            const complete = index < active;
            return (
              <button
                key={stage.label}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`${stage.label}: ${stage.detail}`}
                onClick={() => setActive(index)}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-2 rounded-xl px-1 py-3 text-center transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  selected ? "bg-brand-50 text-brand-700" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition duration-300",
                    selected
                      ? "scale-110 bg-brand-600 text-white shadow-md shadow-brand-600/25"
                      : complete
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-400 group-hover:bg-white",
                  )}
                >
                  {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <span className="hidden text-[10px] font-semibold sm:block">{stage.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock3 className="size-3.5" /> Your slot
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">Today, 10:30 AM</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="size-3.5" /> Service at
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">Your parking spot</p>
          </div>
        </div>
      </div>

      <p className="relative px-3 pt-4 pb-1 text-center text-xs text-slate-400">
        Status updates, progress, and proof—together in your account.
      </p>
    </div>
    </Tilt>
  );
}
