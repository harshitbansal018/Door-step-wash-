import { ArrowDownLeft, Banknote } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { PAYOUTS, serviceName } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/utils";
import { COMMISSION_RATE, DEMO_WORKER, WORKER_JOBS } from "@/lib/worker-demo";

const WEEK = [
  { day: "M", amount: 620 },
  { day: "T", amount: 880 },
  { day: "W", amount: 540 },
  { day: "T", amount: 960 },
  { day: "F", amount: 720 },
  { day: "S", amount: 0 },
  { day: "S", amount: 0 },
];

export default function WorkerEarningsPage() {
  const max = Math.max(...WEEK.map((d) => d.amount));
  const payouts = PAYOUTS.filter((p) => p.workerId === DEMO_WORKER.id);
  const completed = WORKER_JOBS.filter((b) => b.status === "completed");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Earnings</h1>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
          <p className="text-sm text-brand-100">This week (unpaid)</p>
          <p className="mt-1 text-3xl font-bold">{formatMoney(DEMO_WORKER.pendingEarnings)}</p>
          <p className="mt-1 text-xs text-brand-100">Paid to your bank every Monday</p>
        </div>
        <div className="p-5">
          <div className="flex h-28 items-end justify-between gap-2">
            {WEEK.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-brand-500"
                  style={{ height: `${max ? (d.amount / max) * 88 : 0}px`, minHeight: d.amount ? 4 : 2, opacity: d.amount ? 1 : 0.2 }}
                  title={formatMoney(d.amount)}
                />
                <span className="text-xs text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent jobs</h2>
        <Card className="divide-y divide-slate-100">
          {completed.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ArrowDownLeft className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{serviceName(b.serviceId)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(b.date)} · {b.id}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-emerald-600">+{formatMoney(Math.round(b.amount * COMMISSION_RATE))}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Payouts</h2>
        <Card className="divide-y divide-slate-100">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Banknote className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.period}</p>
                  <p className="text-xs text-slate-500">{p.reference}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{formatMoney(p.total)}</p>
                <Badge tone="green">Paid</Badge>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
