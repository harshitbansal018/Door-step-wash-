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
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Logo href="/worker" light suffix="Partner" />
            <div className="flex items-center gap-2">
              <Link href="/worker/profile" aria-label="Partner profile"><Avatar name={name} className="size-8 bg-white/10 text-white" /></Link>
              <LogoutButton className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><LogOut className="size-4" aria-label="Log out" /></LogoutButton>
            </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 px-4 sm:px-6 lg:px-8">
            {tabs.map((t) => {
              const active = t.href === "/worker" ? pathname === "/worker" || pathname.startsWith("/worker/jobs") : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium",
                    active ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                  )}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </Link>
              );
            })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
