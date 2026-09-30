"use client";

import { useState, type ComponentProps } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  error,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[a-z]/i.test(p), label: "A letter" },
  { test: (p: string) => /\d/.test(p), label: "A number" },
];

export const passwordIsValid = (p: string) => RULES.every((r) => r.test(p)) && p.length <= 72;

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
      {RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={cn("flex items-center gap-1", ok ? "text-emerald-600" : "text-slate-400")}>
            <CheckCircle2 className="size-3.5 shrink-0" /> {r.label}
          </li>
        );
      })}
    </ul>
  );
}

export function OtpInput({ value, onChange, id = "otp" }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
      placeholder="••••••"
      className="h-12 text-center font-mono text-xl tracking-[0.5em]"
      aria-label="Verification code"
    />
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "bg-red-50 text-red-800 ring-red-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    info: "bg-brand-50 text-brand-800 ring-brand-200",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2 rounded-lg p-3 text-sm ring-1", styles)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Seconds remaining before an action (like resending a code) is allowed again. */
export function useCooldown(initial = 0) {
  const [seconds, setSeconds] = useState(initial);
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  function start(from = 60) {
    if (timer) clearInterval(timer);
    setSeconds(from);
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    setTimer(t);
  }
  return { seconds, start };
}
