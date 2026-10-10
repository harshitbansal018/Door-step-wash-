"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CalendarCheck, CalendarClock, Droplets, LayoutDashboard, LogOut, MapPinned, Menu, Tag, UserCog, Users, Wallet, X } from "lucide-react";
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

function Sidebar({ user, close }: { user: ShellUser; close?: () => void }) {
  const pathname = usePathname();
  return <div className="flex h-full flex-col bg-slate-950 px-4 py-5"><div className="px-2"><Logo href="/admin" light suffix="Admin" /></div><nav className="mt-8 flex-1 space-y-1">{NAV.map((item) => { const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={close} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}><item.icon className="size-5" />{item.label}</Link>; })}</nav><div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"><div className="flex items-center gap-3"><Link href="/account"><Avatar name={user.name} className="bg-brand-600 text-white" /></Link><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div><LogoutButton className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut className="size-4" aria-label="Log out" /></LogoutButton></div></div></div>;
}

export function AdminShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><Sidebar user={user} /></aside>{open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} aria-label="Close menu overlay" /><aside className="absolute inset-y-0 left-0 w-72"><Sidebar user={user} close={() => setOpen(false)} /><button onClick={() => setOpen(false)} className="absolute top-5 -right-12 rounded-lg p-2 text-white" aria-label="Close menu"><X className="size-6" /></button></aside></div>}<div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8"><button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button><p className="text-sm font-medium text-slate-600">Operations console</p><Link href="/" className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">View site</Link></header><main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main></div></div>;
}
