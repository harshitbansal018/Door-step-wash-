"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Briefcase, LogOut, User, Wallet } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/worker", label: "Jobs", icon: Briefcase },
  { href: "/worker/earnings", label: "Earnings", icon: Wallet },
  { href: "/worker/profile", label: "Profile", icon: User },
];

export function WorkerShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 overflow-hidden bg-slate-900 text-white shadow-sm">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo href="/worker" light suffix="Partner" />
          <div className="flex items-center gap-2">
            <Link href="/worker/profile" aria-label="Partner profile" className="transition-transform duration-300 hover:scale-105">
              <Avatar name={name} className="size-8 bg-white/10 text-white ring-1 ring-white/20" />
            </Link>
            <LogoutButton className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" aria-label="Log out" />
            </LogoutButton>
          </div>
        </div>
      </header>

      <nav className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6 lg:px-8">
          {tabs.map((t) => {
            const active =
              t.href === "/worker" ? pathname === "/worker" || pathname.startsWith("/worker/jobs") : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors duration-200",
                  active ? "text-brand-600" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <t.icon className={cn("size-4 transition-transform duration-300 group-hover:scale-110", active && "text-brand-600")} />
                {t.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-brand-600 transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:bg-slate-300",
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>

      <main key={pathname} className="page-enter mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
