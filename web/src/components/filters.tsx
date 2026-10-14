"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Returns `value` after it has stopped changing for `ms` milliseconds. Use it so typing doesn't fire a request per key. */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Search field with an icon and a clear button. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block h-10 w-full rounded-lg border-0 bg-white pr-9 pl-9 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 transition-[box-shadow] placeholder:text-slate-400 hover:ring-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Row of pill toggles for a small set of mutually exclusive filter values. */
export function FilterPills<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="scroll-slim flex gap-1 overflow-x-auto">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === option.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Lays out a set of filter controls; wraps on small screens. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
}
