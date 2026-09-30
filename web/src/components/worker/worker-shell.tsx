"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Briefcase, User, Wallet } from "lucide-react";
import { Avatar, Logo, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/worker", label: "Jobs", icon: Briefcase },
  { href: "/worker/earnings", label: "Earnings", icon: Wallet },
  { href: "/worker/profile", label: "Profile", icon: User },
];

export function WorkerShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 shadow-xl ring-1 ring-slate-200">
        <header className="sticky top-0 z-30 bg-slate-900 px-4 pt-4 pb-5 text-white">
          <div className="flex items-center justify-between">
            <Logo href="/worker" light suffix="Partner" />
            <Avatar name={name} className="size-8 bg-white/10 text-white" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <div>
              <p className="text-sm font-semibold">{online ? "You're online" : "You're offline"}</p>
              <p className="text-xs text-slate-400">
                {online ? "New jobs near you will be sent here" : "Go online to receive jobs"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", online ? "bg-emerald-400" : "bg-slate-500")} />
              <Toggle checked={online} onChange={setOnline} label="Online status" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-5 pb-28">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="grid grid-cols-3">
            {tabs.map((t) => {
              const active = t.href === "/worker" ? pathname === "/worker" || pathname.startsWith("/worker/jobs") : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 text-xs font-medium",
                    active ? "text-brand-600" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <t.icon className="size-5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
