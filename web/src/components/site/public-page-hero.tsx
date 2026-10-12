import { ArrowRight, Sparkles } from "lucide-react";
import { HeroBackground } from "@/components/site/hero-background";
import { Button } from "@/components/ui";

export function PublicPageHero({
  eyebrow,
  title,
  accent,
  description,
  primaryLabel = "Book a wash",
  primaryHref = "/book",
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <HeroBackground />
      <div className="mx-auto max-w-7xl px-4 py-20 pb-32 sm:px-6 sm:py-24 sm:pb-36 lg:px-8 lg:py-28 lg:pb-40">
        <div className="hero-stagger max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-200 backdrop-blur">
            <Sparkles className="size-3.5" /> {eyebrow}
          </p>
          <h1 className="mt-6 text-5xl leading-[1] font-bold tracking-[-0.05em] text-slate-950 sm:text-6xl">
            {title} <span className="text-gradient">{accent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">{description}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href={primaryHref} size="lg" className="group rounded-xl">
              {primaryLabel} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="/pricing" size="lg" variant="secondary" className="rounded-xl">
              See live pricing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
