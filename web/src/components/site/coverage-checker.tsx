"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Loader2, MapPin, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Coverage } from "@/lib/domain";
import { Button, Input } from "@/components/ui";

export function CoverageChecker() {
  const router = useRouter();
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<Coverage | null>(null);
  const [email, setEmail] = useState("");
  const [notified, setNotified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(pincode)) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<Coverage>(`/api/coverage?pincode=${pincode}`);
      setResult(data);
      if (data.status === "served") router.push(`/book?pincode=${pincode}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check coverage.");
    } finally {
      setLoading(false);
    }
  }

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await api("/api/waitlist", { method: "POST", body: { email, pincode } });
      setNotified(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join the waitlist.");
    } finally {
      setLoading(false);
    }
  }

  const served = result?.status === "served";

  return (
    <div className="w-full max-w-lg">
      <form
        onSubmit={check}
        className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl shadow-blue-950/10 ring-1 ring-slate-200 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:shadow-2xl focus-within:shadow-brand-600/15 focus-within:ring-2 focus-within:ring-brand-500/50 sm:flex-row"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <MapPin className="size-5 shrink-0 text-brand-500" />
          <input
            value={pincode}
            onChange={(event) => {
              setPincode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setResult(null);
            }}
            inputMode="numeric"
            placeholder="Enter your 6-digit pincode"
            aria-label="Pincode"
            className="h-11 w-full bg-transparent font-medium tracking-wide focus:outline-none"
          />
          <span className="hidden text-xs font-medium tabular-nums text-slate-400 sm:block" aria-hidden>
            {pincode.length}/6
          </span>
        </div>
        <Button type="submit" size="lg" className="group rounded-xl" disabled={pincode.length !== 6 || loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : served ? (
            <CheckCircle2 className="check-pop size-4" />
          ) : null}
          Check &amp; book
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </form>
      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
        <CheckCircle2 className="size-3.5 text-emerald-500" />
        Instant availability · No calls required
      </p>
      {error && (
        <p role="alert" className="step-enter mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {result && result.status !== "served" && (
        <div className="step-enter mt-3 rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            {result.status === "city_inactive" ? (
              <Clock className="check-pop mt-0.5 size-5 shrink-0 text-amber-500" />
            ) : (
              <XCircle className="check-pop mt-0.5 size-5 shrink-0 text-red-500" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {result.status === "city_inactive"
                  ? `Coming soon to ${result.city?.name}`
                  : result.status === "area_not_served"
                    ? `We don't serve this part of ${result.city?.name} yet`
                    : "We're not in your area yet"}
              </p>
              <p className="mt-1 text-slate-500">Join the email waitlist and we’ll notify you when booking opens.</p>
              {notified ? (
                <p className="step-enter mt-3 flex items-center gap-2 font-medium text-emerald-700">
                  <CheckCircle2 className="check-pop size-4" />
                  You’re on the list.
                </p>
              ) : (
                <form onSubmit={join} className="mt-3 flex gap-2">
                  <Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
                  <Button size="sm" variant="dark" type="submit" disabled={loading}>
                    Notify me
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
