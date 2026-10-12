import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { Reveal, Stagger } from "@/components/motion";
import { Logo } from "@/components/ui";
import type { SiteContent } from "@/lib/cms";

export function Footer({ content }: { content: SiteContent["general"] }) {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-400">
      <div aria-hidden className="dot-grid absolute inset-0 opacity-60" />
      <div aria-hidden className="drift absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <Reveal variant="up" className="lg:col-span-2">
            <Logo light name={content.brandName} />
            <p className="mt-4 max-w-sm text-sm leading-6">
              {content.footerDescription}
            </p>
            <div className="mt-6 space-y-2 text-sm">
              {content.supportPhone && (
                <p className="flex items-center gap-2">
                  <Phone className="size-4" /> {content.supportPhone}
                </p>
              )}
              {content.supportEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4" /> {content.supportEmail}
                </p>
              )}
            </div>
          </Reveal>
          <Stagger as="div" className="contents" step={100} start={80}>
            {content.footerLinks.map((col) => (
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
          <p>© {new Date().getFullYear()} {content.brandName}. All rights reserved.</p>
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
