import type { ReactNode } from "react";

export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p><div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">{children}</div></article>;
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-lg font-semibold text-slate-900">{title}</h2><div className="mt-2 space-y-2">{children}</div></section>;
}
