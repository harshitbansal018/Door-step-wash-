"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { Field, FormAlert, OtpInput, useCooldown } from "./fields";

export function VerifyEmailForm({ initialEmail, next, justSent }: { initialEmail: string; next: string; justSent: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState(justSent ? `We've sent a 6-digit code to ${initialEmail}.` : "");
  const cooldown = useCooldown();

  useEffect(() => {
    if (justSent) cooldown.start(60);
    // Start the resend timer once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ redirectTo: string }>("/api/auth/verify-email", {
        method: "POST",
        body: { email, token: code },
      });
      router.replace(next || res.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err as ApiError);
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api("/api/auth/resend-otp", { method: "POST", body: { email } });
      setNotice(`A new code is on its way to ${email}.`);
      cooldown.start(60);
    } catch (err) {
      setError(err as ApiError);
    }
  }

  return (
    <>
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <MailCheck className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Check your email</h1>
      <p className="mt-2 text-sm text-slate-500">Enter the code we emailed you to verify your account.</p>

      <div className="mt-6 space-y-3">
        {notice && !error && <FormAlert tone="info">{notice}</FormAlert>}
        {error && <FormAlert>{error.message}</FormAlert>}
      </div>

      <form onSubmit={verify} className="mt-6 space-y-5" noValidate>
        {!initialEmail && (
          <Field id="email" label="Email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        )}
        <Field id="otp" label="Verification code">
          <OtpInput value={code} onChange={setCode} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading || code.length < 6 || !email}>
          {loading && <Loader2 className="size-4 animate-spin" />} Verify &amp; continue
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={cooldown.seconds > 0 || !email}
          className="font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {cooldown.seconds > 0 ? `Resend code in ${cooldown.seconds}s` : "Resend code"}
        </button>
        <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900">
          Back to log in
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">Can&apos;t find it? Check your spam or promotions folder.</p>
    </>
  );
}
