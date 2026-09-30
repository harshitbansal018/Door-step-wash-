"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MapPin, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { checkCoverage, type CoverageResult } from "@/lib/data";

export function CoverageChecker() {
  const router = useRouter();
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<CoverageResult | null>(null);
  const [notified, setNotified] = useState(false);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) return;
    setNotified(false);
    const r = checkCoverage(pincode);
    setResult(r);
    if (r.status === "served") router.push(`/book?pincode=${pincode}`);
  }

  return (
    <div className="w-full max-w-lg">
      <form
        onSubmit={check}
        className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200 sm:flex-row"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <MapPin className="size-5 shrink-0 text-slate-400" />
          <input
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setResult(null);
            }}
            inputMode="numeric"
            placeholder="Enter your 6-digit pincode"
            aria-label="Pincode"
            className="h-11 w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <Button type="submit" size="lg" disabled={pincode.length !== 6}>
          Check &amp; book
        </Button>
      </form>

      {result && result.status !== "served" && (
        <div className="mt-3 rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            {result.status === "city_inactive" ? (
              <Clock className="mt-0.5 size-5 shrink-0 text-amber-500" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {result.status === "city_inactive" && `Coming soon to ${result.city.name}`}
                {result.status === "area_not_served" && `We don't serve this part of ${result.city.name} yet`}
                {result.status === "unknown" && "We're not in your area yet"}
              </p>
              <p className="mt-0.5 text-slate-500">Leave your number and we&apos;ll message you the day we launch.</p>
              {notified ? (
                <p className="mt-3 flex items-center gap-1.5 font-medium text-emerald-600">
                  <CheckCircle2 className="size-4" /> You&apos;re on the list.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotified(true);
                  }}
                  className="mt-3 flex gap-2"
                >
                  <input
                    required
                    type="tel"
                    placeholder="Mobile number"
                    className="h-9 flex-1 rounded-lg px-3 ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                  <Button size="sm" variant="dark" type="submit">
                    Notify me
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Try <span className="font-mono font-medium text-slate-700">122002</span> (served) or{" "}
        <span className="font-mono font-medium text-slate-700">411045</span> (coming soon).
      </p>
    </div>
  );
}
