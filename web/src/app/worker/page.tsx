import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { JobRequest } from "@/components/worker/job-request";
import { Card, StatusBadge } from "@/components/ui";
import { serviceName } from "@/lib/data";
import { formatMoney } from "@/lib/utils";
import { COMMISSION_RATE, DEMO_WORKER, JOB_REQUEST, WORKER_JOBS } from "@/lib/worker-demo";

export default function WorkerJobsPage() {
  const active = WORKER_JOBS.filter((b) => !["completed", "cancelled"].includes(b.status));
  const done = WORKER_JOBS.filter((b) => b.status === "completed");
  const earnedToday = done.reduce((sum, b) => sum + Math.round(b.amount * COMMISSION_RATE), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Good morning,</p>
        <h1 className="text-xl font-bold text-slate-900">{DEMO_WORKER.name.split(" ")[0]}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Jobs today", String(active.length + done.length)],
          ["Completed", String(done.length)],
          ["Earned", formatMoney(earnedToday)],
        ].map(([label, value]) => (
          <Card key={label} className="p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </Card>
        ))}
      </div>

      <JobRequest
        job={JOB_REQUEST}
        serviceLabel={serviceName(JOB_REQUEST.serviceId)}
        earning={Math.round(JOB_REQUEST.amount * COMMISSION_RATE)}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Up next</h2>
        <div className="space-y-3">
          {active.map((b) => (
            <Link key={b.id} href={`/worker/jobs/${b.id}`} className="block">
              <Card className="p-4 transition hover:ring-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{serviceName(b.serviceId)}</p>
                    <p className="text-sm text-slate-500">
                      {b.vehicle} · {b.plate}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2">
                      <Clock className="size-4 text-slate-400" /> {b.slot}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="size-4 text-slate-400" /> {b.address}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-slate-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Completed</h2>
        <Card className="divide-y divide-slate-100">
          {done.map((b) => (
            <Link key={b.id} href={`/worker/jobs/${b.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {serviceName(b.serviceId)} · {b.vehicle}
                </p>
                <p className="text-xs text-slate-500">
                  {b.id} · {b.slot}
                </p>
              </div>
              <p className="text-sm font-semibold text-emerald-600">+{formatMoney(Math.round(b.amount * COMMISSION_RATE))}</p>
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
