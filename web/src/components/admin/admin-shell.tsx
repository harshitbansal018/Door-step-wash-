"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  CalendarCheck,
  Droplets,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Search,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Avatar, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/cities", label: "Cities & areas", icon: MapPinned },
  { href: "/admin/services", label: "Services & pricing", icon: Droplets },
  { href: "/admin/workers", label: "Workers", icon: Users },
  { href: "/admin/offers", label: "Offers", icon: Tag },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-slate-950 px-4 py-5">
      <div className="px-2">
        <Logo href="/admin" light suffix="Admin" />
      </div>
      <nav className="mt-8 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Avatar name="Harshit Admin" className="bg-brand-600 text-white" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Harshit</p>
            <p className="truncate text-xs text-slate-400">Super Admin</p>
          </div>
          <Link href="/login" className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Log out">
            <LogOut className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">
            <SidebarContent onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-5 -right-12 rounded-lg p-2 text-white"
              aria-label="Close menu"
            >
              <X className="size-6" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search bookings, customers, workers…"
              className="h-9 w-full rounded-lg bg-slate-100 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block">
              View site
            </Link>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
