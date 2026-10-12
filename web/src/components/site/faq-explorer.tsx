"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

const faqs = [
  { category: "Service", q: "Do you take my car away?", a: "No. The service is completed where your car is parked, so your vehicle never needs to leave your home or office." },
  { category: "Service", q: "Do I need to be present?", a: "Not for an exterior wash if the partner can access your vehicle. For interior cleaning, someone must unlock the car or arrange key access." },
  { category: "Preparation", q: "Do I need to provide water?", a: "Yes. Please provide access to a nearby water source. The service partner brings the pressure washer, microfiber cloths and other required cleaning equipment." },
  { category: "Preparation", q: "Can you wash in basement or society parking?", a: "Yes, provided the partner can enter the property, reach the vehicle and access the water source safely." },
  { category: "Booking", q: "Can I reschedule my booking?", a: "Eligible bookings can be rescheduled online from your account, subject to the available slots and the displayed rescheduling window." },
  { category: "Booking", q: "What happens if I cancel?", a: "Eligible cancellations are refunded according to the cancellation window and refund policy shown during booking." },
  { category: "Payment", q: "How do I pay?", a: "Payment is completed online during booking through Razorpay using the payment methods enabled for the merchant account." },
  { category: "Payment", q: "Are there hidden charges?", a: "No. Your local package price and any applicable area charge are shown before you confirm payment." },
  { category: "Coverage", q: "Which cities do you serve?", a: "Coverage is managed area by area. Use the pincode checker on the Cities or booking page for the latest availability." },
] as const;

const categories = ["All", "Service", "Preparation", "Booking", "Payment", "Coverage"] as const;

export function FaqExplorer() {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = faqs.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      (!normalized || `${item.q} ${item.a}`.toLowerCase().includes(normalized)),
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
            key={item.q}
            className="group step-enter p-6 transition-colors duration-300 open:bg-brand-50/50 hover:bg-slate-50"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-slate-950">
              <span>
                <span className="mb-1 block text-[10px] font-bold tracking-[0.14em] text-brand-600 uppercase">{item.category}</span>
                {item.q}
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-300 group-hover:bg-slate-200 group-open:rotate-180 group-open:bg-brand-600 group-open:text-white">
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{item.a}</p>
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
