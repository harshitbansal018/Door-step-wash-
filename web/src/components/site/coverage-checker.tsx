"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Loader2, MapPin, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Coverage } from "@/lib/domain";
import { Button, Input, Modal } from "@/components/ui";
import { toast } from "@/components/popups";

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
    setError("");
    try {
      await api("/api/waitlist", { method: "POST", body: { email, pincode } });
      setNotified(true);
      toast.success("You are on the list", "We will email you when we reach your area.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join the waitlist.");
    } finally {
      setLoading(false);
    }
  }

  const served = result?.status === "served";
  const unavailable = result && result.status !== "served" ? result : null;
  const unavailableTitle = unavailable?.status === "city_inactive"
    ? `Coming soon to ${unavailable.city?.name}`
    : unavailable?.status === "area_not_served"
      ? `We don't serve this part of ${unavailable.city?.name} yet`
      : "We're not in your area yet";

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
              setNotified(false);
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
      <Modal
        open={!!unavailable}
        onClose={() => setResult(null)}
        title={unavailableTitle}
        description="Join the email waitlist and we’ll notify you when booking opens."
      >
        <div className="text-center">
          <span className={`mx-auto grid size-12 place-items-center rounded-full ${unavailable?.status === "city_inactive" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
            {unavailable?.status === "city_inactive" ? <Clock className="size-6" /> : <XCircle className="size-6" />}
          </span>
          <p className="mt-3 text-sm text-slate-500">Service is not available for pincode <strong className="text-slate-700">{pincode}</strong> yet.</p>
          {notified ? (
            <div className="step-enter mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="check-pop mx-auto mb-2 size-6" />
              You’re on the list. We’ll email you when service opens in your area.
            </div>
          ) : (
            <form onSubmit={join} className="mt-5 space-y-3 text-left">
              <Input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                aria-label="Email address for service notification"
              />
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" variant="dark" type="submit" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Notify me
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
