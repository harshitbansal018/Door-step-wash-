"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { Field, FormAlert, PasswordInput, PasswordRules, passwordIsValid } from "./fields";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = fullName.trim().length >= 2 && email.includes("@") && passwordIsValid(password) && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/signup", { method: "POST", body: { fullName, email, password } });
      const params = new URLSearchParams({ email, sent: "1", ...(next ? { next } : {}) });
      router.push(`/verify-email?${params}`);
    } catch (err) {
      setError(err as ApiError);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-2 text-sm text-slate-500">Book doorstep washes and track them in one place.</p>

      {error && Object.keys(error.fields).length === 0 && (
        <div className="mt-6">
          <FormAlert>{error.message}</FormAlert>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <Field id="fullName" label="Full name" error={error?.fields.fullName}>
          <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </Field>
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
        <Field id="password" label="Password" error={error?.fields.password}>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordRules password={password} />
        </Field>
        <Field id="confirm" label="Confirm password" error={mismatch ? "Passwords don't match." : undefined}>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading || !canSubmit}>
          {loading && <Loader2 className="size-4 animate-spin" />} Create account
        </Button>
        <p className="text-center text-xs text-slate-500">
          By continuing you agree to our{" "}
          <Link href="#" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}
