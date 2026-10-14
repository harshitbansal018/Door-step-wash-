"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Briefcase, Home, Loader2, LogOut, User, Wallet } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, Logo } from "@/components/ui";
import { api } from "@/lib/api";
import type { WorkerMe } from "@/lib/domain";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/worker", label: "Today", icon: Home },
  { href: "/worker/jobs", label: "Jobs", icon: Briefcase },
  { href: "/worker/earnings", label: "Earnings", icon: Wallet },
  { href: "/worker/profile", label: "Profile", icon: User },
];

/** Fired on window whenever the online state changes, so pages can react without a shared store. */
export const ONLINE_EVENT = "worker:online";

function isActive(href: string, pathname: string) {
  return href === "/worker" ? pathname === "/worker" : pathname === href || pathname.startsWith(`${href}/`);
}

function OnlineSwitch() {
  const [me, setMe] = useState<Pick<WorkerMe, "isOnline" | "status"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api<WorkerMe>("/api/worker/me")
      .then((data) => live && setMe({ isOnline: data.isOnline, status: data.status }))
      .catch(() => undefined);
    const onChange = (event: Event) => {
      const online = (event as CustomEvent<boolean>).detail;
      setMe((old) => (old ? { ...old, isOnline: online } : old));
    };
    window.addEventListener(ONLINE_EVENT, onChange);
    return () => {
      live = false;
      window.removeEventListener(ONLINE_EVENT, onChange);
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!me) return;
    setSaving(true);
    setError("");
    try {
      const result = await api<{ isOnline: boolean }>("/api/worker/status", { method: "POST", body: { online: !me.isOnline } });
      window.dispatchEvent(new CustomEvent(ONLINE_EVENT, { detail: result.isOnline }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change status.");
      window.setTimeout(() => setError(""), 4000);
    } finally {
      setSaving(false);
    }
  }, [me]);

  if (!me) return <span className="h-9 w-28 animate-pulse rounded-full bg-white/10" aria-hidden />;
  const suspended = me.status === "suspended";

  return (
    <div className="relative">
      <button
        type="button"
        role="switch"
        aria-checked={me.isOnline}
        aria-label={me.isOnline ? "You are online. Go offline" : "You are offline. Go online"}
        disabled={saving || suspended}
        onClick={toggle}
        className={cn(
          "flex h-9 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-semibold ring-1 transition-all duration-300 disabled:opacity-60",
          me.isOnline ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40" : "bg-white/10 text-slate-300 ring-white/15",
        )}
      >
        <span className={cn("relative flex h-7 w-12 items-center rounded-full transition-colors duration-300", me.isOnline ? "bg-emerald-500" : "bg-slate-600")}>
          <span
            className={cn(
              "absolute flex size-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-300",
              me.isOnline ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          >
            {saving && <Loader2 className="size-3.5 animate-spin text-slate-500" />}
          </span>
        </span>
        {suspended ? "Suspended" : me.isOnline ? "Online" : "Offline"}
      </button>
      {error && (
        <p role="alert" className="step-enter absolute top-11 right-0 z-50 w-56 rounded-lg bg-red-600 px-3 py-2 text-xs text-white shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}

export function WorkerShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 bg-slate-950 text-white shadow-sm">
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/worker" light suffix="Partner" />
          <div className="flex items-center gap-2">
            <OnlineSwitch />
            <Link href="/worker/profile" aria-label="Partner profile" className="hidden transition-transform duration-300 hover:scale-105 sm:block">
              <Avatar name={name} className="size-8 bg-white/10 text-white ring-1 ring-white/20" />
            </Link>
            <LogoutButton className="hidden rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:block">
              <LogOut className="size-4" aria-label="Log out" />
            </LogoutButton>
          </div>
        </div>
        {/* Tabs on tablets and desktops. */}
        <nav className="relative hidden border-t border-white/10 sm:block" aria-label="Partner sections">
          <div className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
            {tabs.map((t) => {
              const active = isActive(t.href, pathname);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                    active ? "text-white" : "text-slate-400 hover:text-white",
                  )}
                >
                  <t.icon className="size-4" />
                  {t.label}
                  <span
                    aria-hidden
                    className={cn("absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-brand-400 transition-transform duration-300", active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main key={pathname} className="page-enter mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Bottom tab bar on phones: thumb reach, large targets. */}
      <nav
        aria-label="Partner sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.25)] backdrop-blur sm:hidden"
      >
        <div className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = isActive(t.href, pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors", active ? "text-brand-600" : "text-slate-500")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300", active && "bg-brand-50")}>
                  <t.icon className={cn("size-5 transition-transform duration-300", active && "scale-110")} />
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
