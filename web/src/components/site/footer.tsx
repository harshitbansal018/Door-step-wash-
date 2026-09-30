import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/ui";
import { BRAND } from "@/lib/config";

const columns = [
  {
    title: "Services",
    links: [
      { label: "Express Wash", href: "/#pricing" },
      { label: "Premium Wash", href: "/#pricing" },
      { label: "Deluxe Detailing", href: "/#pricing" },
      { label: "Book now", href: "/book" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Cities", href: "/#cities" },
      { label: "Become a partner", href: "/worker" },
      { label: "Admin", href: "/admin" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "#" },
      { label: "Privacy policy", href: "#" },
      { label: "Refund policy", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-6">
              Professional car wash and detailing at your doorstep. Trained, verified washers. Pay securely online.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Phone className="size-4" /> {BRAND.phone}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4" /> {BRAND.email}
              </p>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-xs">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
