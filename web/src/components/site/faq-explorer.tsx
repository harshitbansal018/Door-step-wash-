"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { SiteContent } from "@/lib/cms";

export function FaqExplorer({ items }: { items: SiteContent["faq"]["items"] }) {
  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = items.filter((item) =>
    (category === "All" || item.category === category) &&
    (!normalized || `${item.question} ${item.answer}`.toLowerCase().includes(normalized)),
  );

  return (
    <div>
      <Reveal variant="scale" className="mx-auto max-w-xl">
        <label className="group flex items-center gap-3 rounded-2xl bg-white px-4 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:shadow-xl focus-within:shadow-brand-600/10 focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="size-5 text-slate-400 transition-colors group-focus-within:text-brand-600" />
          <span className="sr-only">Search questions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a question…"
            className="h-14 w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="check-pop flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </Reveal>

      <Reveal variant="up" delay={120} className="mt-6 flex flex-wrap justify-center gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
              category === item
                ? "scale-105 bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-md",
            )}
          >
            {item}
          </button>
        ))}
      </Reveal>

      <Reveal variant="up" delay={220} className="mx-auto mt-10 max-w-3xl divide-y divide-slate-200 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
        {visible.map((item, index) => (
          <details
            key={item.question}
            className="group step-enter p-6 transition-colors duration-300 open:bg-brand-50/50 hover:bg-slate-50"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-slate-950">
              <span>
                <span className="mb-1 block text-[10px] font-bold tracking-[0.14em] text-brand-600 uppercase">{item.category}</span>
                {item.question}
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-300 group-hover:bg-slate-200 group-open:rotate-180 group-open:bg-brand-600 group-open:text-white">
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{item.answer}</p>
          </details>
        ))}
        {!visible.length && (
          <div className="step-enter p-10 text-center">
            <p className="font-semibold text-slate-900">No matching questions</p>
            <p className="mt-1 text-sm text-slate-500">Try a shorter search or choose another category.</p>
          </div>
        )}
      </Reveal>
    </div>
  );
}
