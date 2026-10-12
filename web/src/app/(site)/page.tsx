import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  CreditCard,
  Droplets,
  Leaf,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Timer,
  Waves,
} from "lucide-react";
import type { Metadata } from "next";
import { Parallax, Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { CoverageChecker } from "@/components/site/coverage-checker";
import { CityList } from "@/components/site/city-list";
import { HeroBackground } from "@/components/site/hero-background";
import { HomePreview } from "@/components/site/home-preview";
import { Pricing } from "@/components/site/pricing";
import { ServiceShowcase } from "@/components/site/service-showcase";
import { Badge, Button } from "@/components/ui";
import { siteContentService } from "@/server/services/site-content.service";

const stepIcons = [CalendarCheck, Navigation, Sparkles];
const featureIcons = [ShieldCheck, Leaf, Timer, CreditCard, MapPin, BadgeCheck];

const ticker = [
  { icon: SprayCan, label: "Pressure washer included" },
  { icon: Droplets, label: "You provide water access" },
  { icon: ShieldCheck, label: "KYC-verified partners" },
  { icon: Camera, label: "Before & after photos" },
  { icon: CreditCard, label: "Razorpay secure checkout" },
  { icon: Timer, label: "Reschedule up to 2 hours before" },
  { icon: Waves, label: "Microfiber cloths & cleaning materials" },
  { icon: MapPin, label: "Washed right where it's parked" },
];

function SectionHeading({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Reveal variant="fade">
        <p className={`text-sm font-semibold uppercase tracking-wide ${light ? "text-brand-400" : "text-brand-600"}`}>{eyebrow}</p>
      </Reveal>
      <Reveal variant="blur" delay={80}>
        <h2 className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${light ? "text-white" : "text-slate-900"}`}>{title}</h2>
      </Reveal>
      {body && (
        <Reveal variant="up" delay={160}>
          <p className={`mt-4 ${light ? "text-slate-400" : "text-slate-600"}`}>{body}</p>
        </Reveal>
      )}
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { home } = await siteContentService.get();
  return { title: home.seoTitle, description: home.seoDescription };
}

export default async function HomePage() {
  const { home } = await siteContentService.get();

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <HeroBackground />
        <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-14 px-4 py-16 pb-28 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20 lg:pb-32">
          <div className="hero-stagger">
            <Badge tone="blue" className="px-3 py-1.5 shadow-sm shadow-blue-900/5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-600" />
              </span>
              {home.heroBadge}
            </Badge>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[0.96] font-bold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              {home.heroTitle}
              <span className="text-gradient block pb-1">{home.heroAccent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">{home.heroDescription}</p>
            <div className="mt-10">
              <CoverageChecker />
            </div>
            <dl className="mt-9 grid max-w-xl grid-cols-3 divide-x divide-slate-200">
              {home.stats.map(({ value, label }) => (
                <div key={label} className="px-4 first:pl-0 last:pr-0">
                  <dt className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{value}</dt>
                  <dd className="mt-0.5 text-xs text-slate-500 sm:text-sm">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="hero-enter-delayed relative mx-auto w-full max-w-lg lg:max-w-none">
            <HomePreview />
          </div>
        </div>
      </section>

      <section aria-label="What is included" className="border-y border-slate-200/70 bg-white py-5">
        <div className="marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="marquee-track items-center">
              {ticker.map((item) => (
                <li key={item.label} className="flex shrink-0 items-center gap-2.5 text-sm font-medium text-slate-600">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <item.icon className="size-4" />
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="relative scroll-mt-16 overflow-hidden py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={home.stepsEyebrow} title={home.stepsTitle} />
          <div className="relative mt-14">
            <Reveal variant="fade" delay={300} duration={1200} className="absolute top-14 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block" />
            <Stagger className="grid gap-5 md:grid-cols-3" step={140} variant="up">
              {home.steps.map((step, index) => {
                const Icon = stepIcons[index % stepIcons.length];
                return (
                  <SpotlightCard key={step.title} className="interactive-card group relative h-full overflow-hidden rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200/60">
                    <span className="absolute top-6 right-7 text-5xl font-black text-slate-200/80 transition-all duration-500 group-hover:scale-110 group-hover:text-brand-100">0{index + 1}</span>
                    <span className="icon-tile flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="mt-6 text-lg font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                      Simple by design <ArrowRight className="size-4" />
                    </span>
                  </SpotlightCard>
                );
              })}
            </Stagger>
          </div>
        </div>
      </section>

      <section id="packages" className="scroll-mt-16 bg-slate-50 pt-24 pb-4 sm:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <SectionHeading eyebrow="Packages" title="Pick the wash your car needs" body="From a quick exterior refresh to a full detail. Swipe through the packages, then check your pincode for the exact local price." />
          </div>
          <Reveal variant="scale" duration={900}>
            <ServiceShowcase />
          </Reveal>
        </div>
      </section>

      <section id="pricing" className="relative scroll-mt-16 overflow-hidden bg-slate-50 py-24">
        <Parallax speed={0.1} className="absolute -top-32 -left-32 -z-0 opacity-70">
          <div className="size-[28rem] rounded-full bg-brand-200/30 blur-3xl" />
        </Parallax>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <SectionHeading eyebrow={home.pricingEyebrow} title={home.pricingTitle} body={home.pricingDescription} />
          </div>
          <Pricing />
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={home.featuresEyebrow} title={home.featuresTitle} />
          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={80}>
            {home.features.map((feature, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <SpotlightCard key={feature.title} className="interactive-card group flex h-full gap-4 rounded-2xl border border-slate-200/70 bg-white p-5">
                  <span className="icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-600/25">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{feature.body}</p>
                  </div>
                </SpotlightCard>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section id="cities" className="relative scroll-mt-16 overflow-hidden bg-slate-950 py-24 text-white">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-50" />
        <Parallax speed={-0.15} className="absolute -top-40 right-0">
          <div className="drift size-[30rem] rounded-full bg-brand-500/15 blur-3xl" />
        </Parallax>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal variant="left">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{home.citiesEyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{home.citiesTitle}</h2>
              <p className="mt-4 max-w-md text-slate-400">{home.citiesDescription}</p>
              <Button href="/cities" variant="secondary" className="group mt-8 rounded-xl">
                Explore coverage <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Reveal>
            <Reveal variant="right" delay={120}>
              <CityList />
            </Reveal>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title={home.faqTitle} />
          <Reveal variant="up" delay={160} className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {home.faqs.map((faq) => (
              <details key={faq.question} className="group px-6 py-5 transition-colors duration-300 open:bg-brand-50/40 hover:bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                  {faq.question}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-slate-500 transition-all duration-300 group-hover:bg-slate-200 group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="scale" duration={900}>
            <div className="cta-panel relative overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-16 text-center shadow-2xl shadow-blue-950/20 sm:px-16 sm:py-20">
              <div aria-hidden className="dot-grid absolute inset-0 opacity-60" />
              <div aria-hidden className="drift absolute -top-24 -right-24 size-80 rounded-full bg-brand-500/30 blur-2xl" />
              <div aria-hidden className="float-slow absolute -bottom-32 -left-20 size-80 rounded-full bg-cyan-400/20 blur-3xl" />
              <Reveal variant="up" delay={200}>
                <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">{home.ctaTitle}</h2>
              </Reveal>
              <Reveal variant="up" delay={300}>
                <p className="relative mx-auto mt-4 max-w-xl text-slate-300">{home.ctaDescription}</p>
              </Reveal>
              <Reveal variant="up" delay={400} className="relative mt-8 flex justify-center">
                <Button href="/book" size="lg" variant="secondary" className="group rounded-xl px-7">
                  {home.ctaButton} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
