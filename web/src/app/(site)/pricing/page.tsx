import { BadgeCheck, CreditCard, Droplets, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { Pricing } from "@/components/site/pricing";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { siteContentService } from "@/server/services/site-content.service";

const icons = [ReceiptText, CreditCard, BadgeCheck, Droplets];

export async function generateMetadata(): Promise<Metadata> {
  const { pricing } = await siteContentService.get();
  return { title: pricing.seoTitle, description: pricing.seoDescription };
}

export default async function PricingPage() {
  const { pricing: content } = await siteContentService.get();
  return (
    <>
      <PublicPageHero {...content.hero} />
      <section id="live-pricing" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Reveal variant="fade">
              <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">{content.sectionEyebrow}</p>
            </Reveal>
            <Reveal variant="blur" delay={80}>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{content.sectionTitle}</h2>
            </Reveal>
          </div>
          <Pricing />
        </div>
      </section>
      <section className="py-20 sm:py-24">
        <Stagger className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8" step={100}>
          {content.promises.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
            <SpotlightCard
              key={item.title}
              as="article"
              className="interactive-card group h-full rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-600/25">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </SpotlightCard>
            );
          })}
        </Stagger>
      </section>
    </>
  );
}
