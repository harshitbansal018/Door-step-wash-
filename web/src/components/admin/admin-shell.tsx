"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Droplets,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Tag,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/cities", label: "Cities & areas", icon: MapPinned },
  { href: "/admin/services", label: "Services & pricing", icon: Droplets },
  { href: "/admin/slots", label: "Time slots", icon: CalendarClock },
  { href: "/admin/workers", label: "Workers", icon: Users },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/offers", label: "Offers", icon: Tag },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
];
type ShellUser = { name: string; email: string };

function isActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Sidebar({ user, close }: { user: ShellUser; close?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="scroll-dark relative flex h-full flex-col overflow-x-hidden overflow-y-auto bg-slate-950 px-4 py-5">
      <div aria-hidden className="dot-grid absolute inset-0 opacity-40" />
      <div aria-hidden className="drift absolute -top-24 -left-24 size-64 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="relative px-2">
        <Logo href="/admin" light suffix="Admin" />
      </div>
      <nav className="relative mt-8 flex-1 space-y-1">
        {NAV.map((item, index) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${index * 35}ms` }}
              className={cn(
                "group hero-enter relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active ? "bg-white/10 text-white shadow-inner shadow-white/5" : "text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-400 transition-all duration-300",
                  active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                )}
              />
              <item.icon className={cn("size-5 transition-transform duration-300 group-hover:scale-110", active && "text-brand-300")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="relative rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition-colors hover:bg-white/10">
        <div className="flex items-center gap-3">
          <Link href="/account" className="transition-transform duration-300 hover:scale-105">
            <Avatar name={user.name} className="bg-brand-600 text-white" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <LogoutButton className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" aria-label="Log out" />
          </LogoutButton>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = NAV.find((item) => isActive(item.href, pathname));
  const [menuPath, setMenuPath] = useState(pathname);

  // Close the drawer after navigating (state reset during render).
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar user={user} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="modal-backdrop absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close menu overlay" />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl" style={{ animation: "step-in-back 360ms var(--ease-out-expo) both" }}>
            <Sidebar user={user} close={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute top-5 -right-12 rounded-lg p-2 text-white transition hover:bg-white/10" aria-label="Close menu">
              <X className="size-6" />
            </button>
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="hidden sm:inline">Operations console</span>
            {current && (
              <>
                <span className="hidden text-slate-300 sm:inline">/</span>
                <span key={current.href} className="step-enter font-semibold text-slate-900">{current.label}</span>
              </>
            )}
          </p>
          <Link href="/" className="group ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            View site <ExternalLink className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </header>
        <main key={pathname} className="page-enter px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
