"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { Field, FormAlert, OtpInput, PasswordInput, PasswordRules, passwordIsValid, useCooldown } from "./fields";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const cooldown = useCooldown();

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: { email } });
      setStep("reset");
      cooldown.start(60);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // A successful reset also signs the user in.
      const res = await api<{ redirectTo: string }>("/api/auth/reset-password", {
        method: "POST",
        body: { email, token: code, password },
      });
      router.replace(res.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err as ApiError);
      setLoading(false);
    }
  }

  const canReset = code.length >= 6 && passwordIsValid(password) && confirm === password;

  return (
    <>
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <KeyRound className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
        {step === "email" ? "Forgot your password?" : "Set a new password"}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {step === "email"
          ? "Enter your email and we'll send you a code to reset it."
          : `If an account exists for ${email}, we've sent it a 6-digit code.`}
      </p>

      {error && Object.keys(error.fields).length === 0 && (
        <div className="mt-6">
          <FormAlert>{error.message}</FormAlert>
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-6 space-y-5" noValidate>
          <Field id="email" label="Email" error={error?.fields.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading || !email.includes("@")}>
            {loading && <Loader2 className="size-4 animate-spin" />} Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} className="mt-6 space-y-5" noValidate>
          <Field id="otp" label="Reset code" error={error?.fields.token}>
            <OtpInput value={code} onChange={setCode} />
          </Field>
          <Field id="password" label="New password" error={error?.fields.password}>
            <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordRules password={password} />
          </Field>
          <Field id="confirm" label="Confirm new password" error={confirm && confirm !== password ? "Passwords don't match." : undefined}>
            <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading || !canReset}>
            {loading && <Loader2 className="size-4 animate-spin" />} Update password
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={cooldown.seconds > 0}
              className="font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {cooldown.seconds > 0 ? `Resend code in ${cooldown.seconds}s` : "Resend code"}
            </button>
            <button type="button" onClick={() => setStep("email")} className="font-medium text-slate-600 hover:text-slate-900">
              Use a different email
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-slate-600">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}
