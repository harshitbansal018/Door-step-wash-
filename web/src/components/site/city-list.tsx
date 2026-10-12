"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PublicCity {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  areas: string[];
}

export function CityList() {
  const [cities, setCities] = useState<PublicCity[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<PublicCity[]>("/api/cities")
      .then(setCities)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load cities."));
  }, []);

  if (error) return <p className="text-sm text-red-300">{error}</p>;

  if (!cities) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="skeleton h-5 w-32 bg-white/10" />
            <div className="skeleton mt-4 h-3 w-full bg-white/10" />
            <div className="skeleton mt-2 h-3 w-2/3 bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!cities.length) {
    return (
      <div className="step-enter rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
        <MapPin className="mx-auto size-6 text-brand-300" />
        <p className="mt-3 font-semibold text-white">Cities are being added</p>
        <p className="mt-1 text-sm text-slate-400">Check your pincode above to join the waitlist for your area.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cities.map((city, index) => (
        <div
          key={city.id}
          className="group step-enter relative overflow-hidden rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition-all duration-400 hover:-translate-y-1 hover:bg-white/10 hover:shadow-xl hover:shadow-black/20 hover:ring-brand-400/40"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 size-28 rounded-full bg-brand-500/0 blur-2xl transition-all duration-500 group-hover:bg-brand-500/25"
          />
          <div className="relative flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold transition-colors group-hover:text-brand-300">{city.name}</h3>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                city.isActive
                  ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"
                  : "bg-amber-400/10 text-amber-400 ring-amber-400/20",
              )}
            >
              {city.isActive && (
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                </span>
              )}
              {city.isActive ? "Live" : "Coming soon"}
            </span>
          </div>
          <p className="relative mt-3 text-sm text-slate-400">
            {city.areas.length ? city.areas.join(" · ") : "Areas launching soon"}
          </p>
        </div>
      ))}
    </div>
  );
}
