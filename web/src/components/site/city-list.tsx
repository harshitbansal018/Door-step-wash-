"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PublicCity { id: string; name: string; state: string; isActive: boolean; areas: string[] }
export function CityList() {
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api<PublicCity[]>("/api/cities").then(setCities).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load cities.")); }, []);
  if (error) return <p className="text-sm text-red-300">{error}</p>;
  return <div className="grid gap-4 sm:grid-cols-2">{cities.map((city) => <div key={city.id} className="group rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-xl hover:shadow-black/20 hover:ring-brand-400/40"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold transition-colors group-hover:text-brand-300">{city.name}</h3><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${city.isActive ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" : "bg-amber-400/10 text-amber-400 ring-amber-400/20"}`}>{city.isActive ? "Live" : "Coming soon"}</span></div><p className="mt-3 text-sm text-slate-400">{city.areas.length ? city.areas.join(" · ") : "Areas launching soon"}</p></div>)}</div>;
}
