import { BellRing, MapPinned, Navigation, Waves } from "lucide-react";
import type { Metadata } from "next";
import { Parallax, Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { CityList } from "@/components/site/city-list";
import { CoverageChecker } from "@/components/site/coverage-checker";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { siteContentService } from "@/server/services/site-content.service";

const icons = [MapPinned, Navigation, Waves, BellRing];

export async function generateMetadata(): Promise<Metadata> {
  const { cities } = await siteContentService.get();
  return { title: cities.seoTitle, description: cities.seoDescription };
}

export default async function CitiesPage() {
  const { cities: content } = await siteContentService.get();
  return (
    <>
      <PublicPageHero {...content.hero} />
      <section id="coverage" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
          <Reveal variant="left">
            <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">{content.checkerEyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{content.checkerTitle}</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-600">{content.checkerDescription}</p>
            <div className="mt-8">
              <CoverageChecker />
            </div>
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-2" step={110} start={120} variant="right">
            {content.benefits.map((item, index) => {
              const Icon = icons[index % icons.length];
              return (
              <SpotlightCard
                key={item.title}
                as="article"
                className="interactive-card group h-full rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70"
              >
                <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </SpotlightCard>
              );
            })}
          </Stagger>
        </div>
      </section>
      <section className="relative overflow-hidden bg-slate-950 py-20 text-white sm:py-24">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-50" />
        <Parallax speed={-0.15} className="absolute -top-32 right-0">
          <div className="drift size-96 rounded-full bg-brand-500/15 blur-3xl" />
        </Parallax>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <Reveal variant="fade">
              <p className="text-sm font-semibold tracking-wider text-brand-300 uppercase">{content.mapEyebrow}</p>
            </Reveal>
            <Reveal variant="blur" delay={80}>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{content.mapTitle}</h2>
            </Reveal>
          </div>
          <Reveal variant="up" delay={160}>
            <CityList />
          </Reveal>
        </div>
      </section>
    </>
  );
}
