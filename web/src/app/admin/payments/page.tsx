"use client";

import { useState } from "react";
import { Banknote, CheckCircle2, Landmark, RotateCcw, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, Modal, PageHeader, StatCard } from "@/components/ui";
import { BOOKINGS, PAYOUTS, WORKERS, workerById } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [paid, setPaid] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const transactions = BOOKINGS.filter((b) => b.status !== "pending_payment");
  const collected = transactions.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.amount, 0);
  const refunded = transactions.filter((b) => b.status === "cancelled").reduce((s, b) => s + b.amount, 0);
  const due = WORKERS.filter((w) => w.pendingEarnings > 0);
  const totalDue = due.reduce((s, w) => s + w.pendingEarnings, 0);

  return (
    <>
      <PageHeader title="Payments" description="Money collected into your account, refunds, and weekly worker payouts." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected (this week)" value={formatMoney(collected)} icon={<Wallet className="size-5" />} />
        <StatCard label="Next settlement" value={formatMoney(26730)} icon={<Landmark className="size-5" />} />
        <StatCard label="Refunded" value={formatMoney(refunded)} icon={<RotateCcw className="size-5" />} />
        <StatCard label="Due to workers" value={paid ? formatMoney(0) : formatMoney(totalDue)} icon={<Banknote className="size-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader title="Transactions" description="Customer payments via the payment gateway" />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{b.id}</p>
                      <p className="text-xs text-slate-500">{formatDate(b.date)}</p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">{b.customer}</td>
                    <td className="px-5 py-3.5 text-slate-700">{b.payment}</td>
                    <td className="px-5 py-3.5">
                      {b.status === "cancelled" ? (
                        <Badge tone="amber">Refunded</Badge>
                      ) : b.payment === "Cash" ? (
                        <Badge tone="slate">Cash collected</Badge>
                      ) : (
                        <Badge tone="green">Captured</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap text-slate-900">
                      {b.status === "cancelled" ? "−" : ""}
                      {formatMoney(b.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Worker payouts"
              description="Week of 22–28 Sep 2026"
              action={
                <Button size="sm" disabled={paid} onClick={() => setConfirming(true)}>
                  {paid ? "Paid" : "Pay all"}
                </Button>
              }
            />
            <div className="divide-y divide-slate-100">
              {due.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={w.name} className="size-8" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{w.name}</p>
                    <p className="text-xs text-slate-500">{w.jobsDone} lifetime washes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(w.pendingEarnings)}</p>
                    {paid ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">Due</Badge>}
                  </div>
                </div>
              ))}
            </div>
            {paid && (
              <p className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" /> {formatMoney(totalDue)} sent to {due.length} workers.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Payout history" />
            <div className="divide-y divide-slate-100">
              {PAYOUTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{workerById(p.workerId)?.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.period} · {p.reference}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatMoney(p.total)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirm payouts"
        description={`Send ${formatMoney(totalDue)} to ${due.length} workers' bank accounts?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPaid(true);
                setConfirming(false);
              }}
            >
              Send {formatMoney(totalDue)}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Payouts are sent by bank transfer. Each worker gets an SMS with the reference number. This can&apos;t be undone.
        </p>
      </Modal>
    </>
  );
}
