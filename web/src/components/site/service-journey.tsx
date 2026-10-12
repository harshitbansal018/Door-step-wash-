"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Camera, Check, MapPin, Navigation, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const journey = [
  {
    title: "Choose your wash",
    short: "Book",
    icon: CalendarCheck,
    body: "Enter your pincode, choose your vehicle and package, then select an available time slot.",
    note: "Your price and availability are confirmed before payment.",
  },
  {
    title: "Prepare your parking spot",
    short: "Prepare",
    icon: MapPin,
    body: "Make sure the vehicle is accessible and a nearby water source is available at the scheduled time.",
    note: "The car stays exactly where it is parked.",
  },
  {
    title: "Your partner arrives",
    short: "Arrival",
    icon: Navigation,
    body: "A verified service partner brings the pressure washer, microfiber cloths and required cleaning equipment.",
    note: "Follow assignment and job progress from your account.",
  },
  {
    title: "Review the result",
    short: "Complete",
    icon: Camera,
    body: "Before-and-after photos are added to the job record when the service is completed.",
    note: "Review your wash and rebook whenever you are ready.",
  },
] as const;

const AUTO_MS = 5200;

export function ServiceJourney() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const current = journey[active];
  const CurrentIcon = current.icon;
  const running = playing && !hovered;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % journey.length), AUTO_MS);
    return () => window.clearInterval(timer);
  }, [running, active]);

  return (
    <div
      className="grid overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl shadow-blue-950/20 lg:grid-cols-[.8fr_1.2fr]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="border-b border-white/10 p-4 lg:border-r lg:border-b-0 lg:p-6">
        <div className="flex items-center justify-between px-3 pt-2 pb-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-brand-300 uppercase">Your journey</p>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause auto-play" : "Resume auto-play"}
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {journey.map((stage, index) => {
            const Icon = stage.icon;
            const selected = active === index;
            return (
              <button
                key={stage.title}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-brand-400",
                  selected ? "bg-white text-slate-950 shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                    selected ? "bg-brand-600 text-white shadow-md shadow-brand-600/30" : "bg-white/10 group-hover:scale-105",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span>
                  <span className="block text-[10px] font-semibold tracking-wider opacity-60">0{index + 1}</span>
                  <span className="block text-sm font-semibold">{stage.short}</span>
                </span>
                {selected && running && (
                  <span
                    key={`bar-${active}`}
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand-500"
                    style={{ animation: `bar-in ${AUTO_MS}ms linear both` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative overflow-hidden p-8 text-white sm:p-12">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-60" />
        <div aria-hidden className="drift absolute -top-24 -right-24 size-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div key={active} className="step-enter relative">
          <span className="check-pop flex size-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
            <CurrentIcon className="size-6" />
          </span>
          <p className="mt-8 text-sm font-semibold text-brand-300">STEP {active + 1} OF {journey.length}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{current.title}</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">{current.body}</p>
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <Check className="mt-0.5 size-5 shrink-0 text-emerald-400" />
            <p className="text-sm leading-6 text-slate-300">{current.note}</p>
          </div>
        </div>
        <div className="relative mt-8 flex gap-2">
          {journey.map((stage, index) => (
            <button
              key={stage.title}
              type="button"
              aria-label={`Show step ${index + 1}: ${stage.title}`}
              onClick={() => setActive(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                active === index ? "w-12 bg-brand-400" : "w-6 bg-white/20 hover:bg-white/40",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
