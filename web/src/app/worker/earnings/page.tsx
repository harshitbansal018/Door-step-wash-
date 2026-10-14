"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Badge, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";

type PageInfo = { page: number; pageSize: number; total: number };
interface Earnings {
  unpaid: number;
  paidTotal: number;
  recentPage: PageInfo;
  payoutPage: PageInfo;
  recent: { id: string; amount: number; status: string; bookingCode: string; service: string; date: string }[];
  payouts: { id: string; periodStart: string; periodEnd: string; total: number; status: "pending" | "paid"; reference: string | null }[];
}

const PAGE = 15;

export default function WorkerEarningsPage() {
  const [data, setData] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [payoutPage, setPayoutPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Earnings>(`/api/worker/earnings?page=${page}&pageSize=${PAGE}&payoutPage=${payoutPage}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load earnings.");
    } finally {
      setLoading(false);
    }
  }, [page, payoutPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!data && loading) return <LoadingState label="Loading earnings…" />;
  if (!data) return <ErrorState message={error} retry={load} />;

  return (
    <>
      <PageHeader title="Earnings" description="Commission generated from completed jobs and payout history." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Awaiting payout" value={formatMoney(data.unpaid)} icon={<Wallet className="size-5" />} />
        <StatCard label="Paid to date" value={formatMoney(data.paidTotal)} icon={<Banknote className="size-5" />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Earnings" />
          <div className="divide-y">
            {data.recent.map((item) => (
              <div key={item.id} className="flex justify-between p-4 text-sm">
                <div>
                  <strong>{item.bookingCode} · {item.service}</strong>
                  <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                </div>
                <div className="text-right">
                  <strong>{formatMoney(item.amount)}</strong>
                  <p className="text-xs text-slate-500">{item.status.replaceAll("_", " ")}</p>
                </div>
              </div>
            ))}
            {!data.recent.length && <p className="p-6 text-center text-sm text-slate-500">Complete a job to generate earnings.</p>}
          </div>
          <Pagination {...data.recentPage} onChange={setPage} disabled={loading} className="border-t border-slate-200" />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Payout history" />
          <div className="divide-y">
            {data.payouts.map((item) => (
              <div key={item.id} className="flex justify-between p-4 text-sm">
                <div>
                  <strong>{item.periodStart}–{item.periodEnd}</strong>
                  <p className="text-xs text-slate-500">{item.reference ?? "Reference pending"}</p>
                </div>
                <div className="text-right">
                  <strong>{formatMoney(item.total)}</strong>
                  <div><Badge tone={item.status === "paid" ? "green" : "amber"}>{item.status}</Badge></div>
                </div>
              </div>
            ))}
            {!data.payouts.length && <p className="p-6 text-center text-sm text-slate-500">No payouts yet.</p>}
          </div>
          <Pagination {...data.payoutPage} onChange={setPayoutPage} disabled={loading} className="border-t border-slate-200" />
        </Card>
      </div>
    </>
  );
}
