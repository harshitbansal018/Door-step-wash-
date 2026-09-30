"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Star } from "lucide-react";
import { Button, Input, Label, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "customer", label: "Customer", home: "/bookings" },
  { id: "worker", label: "Worker", home: "/worker" },
  { id: "admin", label: "Admin", home: "/admin" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<(typeof ROLES)[number]["id"]>("customer");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {otpSent ? "Enter the code" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {otpSent ? `We sent a 6-digit code to +91 ${phone}.` : "Log in with your mobile number. No password needed."}
          </p>

          {!otpSent ? (
            <form
              className="mt-8 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                setOtpSent(true);
              }}
            >
              <div>
                <Label>I am a</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={cn(
                        "rounded-md py-2 text-sm font-semibold transition",
                        role === r.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Mobile number</Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-lg bg-slate-50 px-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-300">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={phone.length !== 10}>
                Send OTP
              </Button>
            </form>
          ) : (
            <form
              className="mt-8 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(ROLES.find((r) => r.id === role)!.home);
              }}
            >
              <div>
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="h-12 text-center font-mono text-xl tracking-[0.5em]"
                />
                <p className="mt-2 text-xs text-slate-500">Demo: enter any 6 digits.</p>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={otp.length !== 6}>
                Verify &amp; continue
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="size-4" /> Change number
              </button>
            </form>
          )}

          <p className="mt-10 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-emerald-600" /> Your number is only used to log in and send booking
            updates.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-600 lg:block">
        <div aria-hidden className="absolute -top-32 -right-32 size-[32rem] rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-brand-900/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-16 text-white">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-amber-300 text-amber-300" />
            ))}
          </div>
          <blockquote className="mt-6 text-2xl leading-9 font-medium">
            “I haven&apos;t been to a car wash in six months. The washer shows up on time, every time, and my car looks
            brand new.”
          </blockquote>
          <p className="mt-6 text-brand-100">Karan Malhotra · Gurugram</p>
        </div>
      </div>
    </div>
  );
}
