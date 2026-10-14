"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Previous / Next bar with a "Showing 1–25 of 340" summary. Renders nothing
 * when everything fits on one page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  disabled = false,
  className,
  dark = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  dark?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const button = cn(
    "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition disabled:cursor-not-allowed disabled:opacity-40",
    dark ? "text-slate-200 ring-white/15 enabled:hover:bg-white/10" : "bg-white text-slate-700 ring-slate-300 enabled:hover:bg-slate-50",
  );

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col gap-3 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", dark ? "text-slate-400" : "text-slate-500", className)}
    >
      <p>
        Showing <span className={cn("font-semibold tabular-nums", dark ? "text-white" : "text-slate-900")}>{first}–{last}</span> of{" "}
        <span className={cn("font-semibold tabular-nums", dark ? "text-white" : "text-slate-900")}>{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={button} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="size-4" /> Previous
        </button>
        <span className="px-1 tabular-nums">
          Page {page} of {pages}
        </span>
        <button type="button" className={button} disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
