"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, Button, Logo } from "@/components/ui";
import { HOME_FOR_ROLE, type Role } from "@/lib/roles";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#cities", label: "Cities" },
  { href: "/#faq", label: "FAQ" },
];

const HOME_LABEL: Record<Role, string> = {
  customer: "My bookings",
  worker: "Partner app",
  admin: "Admin panel",
};

export function Navbar({ user }: { user: { name: string; role: Role } | null }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              {l.label}
            </Link>
          ))}
          {user && (
            <Link href={HOME_FOR_ROLE[user.role]} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              {HOME_LABEL[user.role]}
            </Link>
          )}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Avatar name={user.name} className="size-8" />
                <span className="max-w-32 truncate">{user.name}</span>
              </span>
              <LogoutButton className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <LogOut className="size-4" aria-label="Log out" />
              </LogoutButton>
              {user.role === "customer" && <Button href="/book">Book a wash</Button>}
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost">
                Log in
              </Button>
              <Button href="/book">Book a wash</Button>
            </>
          )}
        </div>
        <button
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <Link
                href={HOME_FOR_ROLE[user.role]}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {HOME_LABEL[user.role]}
              </Link>
            )}
          </div>
          {user ? (
            <div className="grid grid-cols-2 gap-3">
              <LogoutButton className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-slate-700 ring-1 ring-slate-300 ring-inset">
                Log out
              </LogoutButton>
              <Button href="/book">Book a wash</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button href="/login" variant="secondary">
                Log in
              </Button>
              <Button href="/book">Book a wash</Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
