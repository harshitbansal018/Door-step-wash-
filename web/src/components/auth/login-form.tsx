"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { Field, FormAlert, PasswordInput } from "./fields";

type AuthResult = { redirectTo: string };

export function LoginForm({ next, notConfigured }: { next: string; notConfigured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<AuthResult>("/api/auth/login", { method: "POST", body: { email, password } });
      router.replace(next || res.redirectTo);
      router.refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
        return;
      }
      setError(apiErr);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">Log in with your email and password.</p>

      <div className="mt-6 space-y-3">
        {notConfigured && (
          <FormAlert>Login isn&apos;t available yet: the server hasn&apos;t been connected to Supabase.</FormAlert>
        )}
        {error && !error.fields.email && !error.fields.password && <FormAlert>{error.message}</FormAlert>}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <Field id="email" label="Email" error={error?.fields.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field
          id="password"
          label="Password"
          error={error?.fields.password}
          action={
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading || !email || !password}>
          {loading && <Loader2 className="size-4 animate-spin" />} Log in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-semibold text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </>
  );
}
