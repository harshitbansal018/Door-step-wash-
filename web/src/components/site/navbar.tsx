"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Home, LogOut, Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, Button, Logo } from "@/components/ui";
import { HOME_FOR_ROLE, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/cities", label: "Cities" },
  { href: "/faq", label: "FAQ" },
];

const HOME_LABEL: Record<Role, string> = {
  customer: "My bookings",
  worker: "Partner portal",
  admin: "Admin panel",
};

export function Navbar({ user }: { user: { name: string; role: Role } | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);

  // Close the mobile menu after navigating (state reset during render).
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "site-header sticky top-0 z-40 border-b backdrop-blur-xl",
        scrolled ? "border-slate-200/80 bg-white/90" : "border-transparent bg-white/70",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active ? "text-brand-700" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950",
                )}
              >
                {l.href === "/" ? (
                  <>
                    <span className="sr-only">Home</span>
                    <Home className="size-4.5" aria-hidden />
                  </>
                ) : (
                  l.label
                )}
                <span
                  className={cn(
                    "absolute inset-x-3 bottom-0.5 h-0.5 origin-left rounded-full bg-brand-600 transition-transform duration-300 ease-out",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
          {user && (
            <Link
              href={HOME_FOR_ROLE[user.role]}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-950"
            >
              {HOME_LABEL[user.role]}
            </Link>
          )}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link
                href="/account"
                className="group flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                aria-label="Account settings"
              >
                <Avatar name={user.name} className="size-8 transition-transform duration-300 group-hover:scale-105" />
                <span className="max-w-32 truncate">{user.name}</span>
              </Link>
              <LogoutButton className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <LogOut className="size-4" aria-label="Log out" />
              </LogoutButton>
              {user.role === "customer" && (
                <Button href="/book" className="group">
                  Book a wash <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost">
                Log in
              </Button>
              <Button href="/book" className="group">
                Book a wash <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            </>
          )}
        </div>
        <button
          className="relative rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span className="relative block size-5">
            <Menu className={cn("absolute inset-0 size-5 transition-all duration-300", open ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100")} />
            <X className={cn("absolute inset-0 size-5 transition-all duration-300", open ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0")} />
          </span>
        </button>
      </nav>
      {open && (
        <div className="menu-enter border-t border-slate-200 bg-white/95 px-4 pb-4 shadow-xl backdrop-blur-xl lg:hidden">
          <div className="flex flex-col py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === l.href ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {l.label}
                <ArrowRight className="size-4 opacity-30" />
              </Link>
            ))}
            {user && (
              <Link
                href={HOME_FOR_ROLE[user.role]}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {HOME_LABEL[user.role]}
              </Link>
            )}
          </div>
          {user ? (
            <div className="grid grid-cols-2 gap-3">
              <LogoutButton className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-slate-700 ring-1 ring-slate-300 ring-inset transition-colors hover:bg-slate-50">
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
