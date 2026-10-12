import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { Reveal, Stagger } from "@/components/motion";
import { Logo } from "@/components/ui";
import { BRAND } from "@/lib/config";

const columns = [
  {
    title: "Services",
    links: [
      { label: "Express Wash", href: "/pricing" },
      { label: "Premium Wash", href: "/pricing" },
      { label: "Deluxe Detailing", href: "/pricing" },
      { label: "Book now", href: "/book" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Cities", href: "/cities" },
      { label: "FAQ", href: "/faq" },
      { label: "Become a partner", href: "/worker" },
      { label: "Admin", href: "/admin" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Refund policy", href: "/refund-policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-400">
      <div aria-hidden className="dot-grid absolute inset-0 opacity-60" />
      <div aria-hidden className="drift absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <Reveal variant="up" className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-6">
              Professional car wash and detailing at your doorstep. Trained, verified washers. Pay securely online.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              {BRAND.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="size-4" /> {BRAND.phone}
                </p>
              )}
              {BRAND.email && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4" /> {BRAND.email}
                </p>
              )}
            </div>
          </Reveal>
          <Stagger as="div" className="contents" step={100} start={80}>
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-white">{col.title}</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-1 transition-colors duration-200 hover:text-white"
                      >
                        <span className="link-underline">{l.label}</span>
                        <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Stagger>
        </div>
        <Reveal variant="fade" className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Booking system online
          </p>
        </Reveal>
      </div>
    </footer>
  );
}
