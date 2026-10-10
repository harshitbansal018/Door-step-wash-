"use client";

import { useState } from "react";
import { CalendarCheck, Camera, Check, MapPin, Navigation } from "lucide-react";
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

export function ServiceJourney() {
  const [active, setActive] = useState(0);
  const current = journey[active];
  const CurrentIcon = current.icon;

  return (
    <div className="grid overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl shadow-blue-950/20 lg:grid-cols-[.8fr_1.2fr]">
      <div className="border-b border-white/10 p-4 lg:border-r lg:border-b-0 lg:p-6">
        <p className="px-3 pt-2 pb-4 text-xs font-semibold tracking-[0.16em] text-brand-300 uppercase">Your journey</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {journey.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <button
                key={stage.title}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl p-3 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-brand-400",
                  active === index ? "bg-white text-slate-950 shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", active === index ? "bg-brand-600 text-white" : "bg-white/10")}>
                  <Icon className="size-4.5" />
                </span>
                <span>
                  <span className="block text-[10px] font-semibold tracking-wider opacity-60">0{index + 1}</span>
                  <span className="block text-sm font-semibold">{stage.short}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative overflow-hidden p-8 text-white sm:p-12">
        <div aria-hidden className="absolute -top-24 -right-24 size-64 rounded-full bg-brand-500/20 blur-3xl" />
        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
          <CurrentIcon className="size-6" />
        </span>
        <p className="relative mt-8 text-sm font-semibold text-brand-300">STEP {active + 1} OF {journey.length}</p>
        <h2 className="relative mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{current.title}</h2>
        <p className="relative mt-4 max-w-xl text-lg leading-8 text-slate-300">{current.body}</p>
        <div className="relative mt-8 flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <Check className="mt-0.5 size-5 shrink-0 text-emerald-400" />
          <p className="text-sm leading-6 text-slate-300">{current.note}</p>
        </div>
        <div className="relative mt-8 flex gap-2">
          {journey.map((stage, index) => (
            <button
              key={stage.title}
              type="button"
              aria-label={`Show step ${index + 1}: ${stage.title}`}
              onClick={() => setActive(index)}
              className={cn("h-1.5 rounded-full transition-all duration-300", active === index ? "w-12 bg-brand-400" : "w-6 bg-white/20 hover:bg-white/40")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
