"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronRight, MapPin, Repeat } from "lucide-react";
import { api } from "@/lib/api";
import type { WorkerJob } from "@/lib/domain";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, ErrorState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Card, PageHeader, Skeleton, StatusBadge } from "@/components/ui";

type Scope = "upcoming" | "completed" | "problem";
type Page = { items: WorkerJob[]; total: number; page: number; pageSize: number };

const SCOPES: { id: Scope; label: string; empty: string }[] = [
  { id: "upcoming", label: "Upcoming", empty: "Accepted jobs will appear here." },
  { id: "completed", label: "Completed", empty: "Finished jobs will appear here." },
  { id: "problem", label: "Problems", empty: "Jobs where you reported a problem appear here until the team resolves them." },
];
const PAGE_SIZE = 10;

export default function WorkerJobsPage() {
  const [scope, setScope] = useState<Scope>("upcoming");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<Page>(`/api/worker/jobs/history?scope=${scope}&page=${page}&pageSize=${PAGE_SIZE}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [scope, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function pickScope(next: Scope) {
    setScope(next);
    setPage(1);
  }

  const current = SCOPES.find((s) => s.id === scope)!;

  return (
    <>
      <PageHeader title="Jobs" description="Your accepted, finished and flagged jobs." />
      <div role="tablist" aria-label="Job lists" className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={scope === s.id}
            onClick={() => pickScope(s.id)}
            className={cn(
              "min-h-10 rounded-lg text-sm font-semibold transition-all duration-300",
              scope === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} retry={load} />
      ) : loading && !data ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : !data?.items.length ? (
        <EmptyState title={`No ${current.label.toLowerCase()} jobs`} description={current.empty} />
      ) : (
        <div key={`${scope}-${page}`} className="space-y-3">
          {data.items.map((job, index) => (
            <Link key={job.id} href={`/worker/jobs/${job.id}`} className="step-enter block" style={{ animationDelay: `${index * 40}ms` }}>
              <Card hover className="flex items-center gap-4 p-4">
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <span className="text-[10px] font-semibold uppercase">
                    {new Date(`${job.slot.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                  <span className="text-lg leading-none font-bold">{Number(job.slot.date.slice(8, 10))}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{job.service.name}</p>
                    {job.subscriptionId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        <Repeat className="size-3" /> Plan
                      </span>
                    )}
                    {job.hasOpenIssue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <AlertTriangle className="size-3" /> Problem
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays className="size-3.5" /> {formatDate(job.slot.date)}, {job.slot.start}–{job.slot.end}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <MapPin className="size-3.5" /> {job.area} · {job.vehicle.plate}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={job.status} />
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{formatMoney(job.earning)}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-slate-300" />
              </Card>
            </Link>
          ))}
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={(next) => {
              setPage(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={loading}
            className="rounded-xl bg-white px-4 ring-1 ring-slate-200"
          />
        </div>
      )}
    </>
  );
}
