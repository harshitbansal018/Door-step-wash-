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
import { CountUp, Parallax, Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { CoverageChecker } from "@/components/site/coverage-checker";
import { CityList } from "@/components/site/city-list";
import { HeroBackground } from "@/components/site/hero-background";
import { HomePreview } from "@/components/site/home-preview";
import { Pricing } from "@/components/site/pricing";
import { ServiceShowcase } from "@/components/site/service-showcase";
import { Badge, Button } from "@/components/ui";
import { BRAND } from "@/lib/config";

const steps = [
  {
    icon: CalendarCheck,
    title: "Book in 60 seconds",
    body: "Pick your car, package and a time slot that suits you. Pay securely online.",
  },
  {
    icon: Navigation,
    title: "We come to you",
    body: "A verified washer arrives with a pressure washer, microfiber cloths and the equipment needed for the job. You provide access to water.",
  },
  {
    icon: Sparkles,
    title: "Your car, spotless",
    body: "Your car never leaves your parking. See before and after photos, rate the wash, and rebook in one tap.",
  },
];

const features = [
  { icon: ShieldCheck, title: "Verified professionals", body: "Partners are activated only after their identity document has been reviewed by an administrator." },
  { icon: Leaf, title: "Doorstep convenience", body: "The service is completed where your vehicle is parked, based on the access details you provide." },
  { icon: Timer, title: "Scheduled slots", body: "Choose from current availability in your service area and reschedule eligible bookings online." },
  { icon: CreditCard, title: "Secure payments", body: "Payments and eligible refunds are processed through Razorpay." },
  { icon: MapPin, title: "Live job status", body: "Follow assignment and job progress from confirmed through completed in your account." },
  { icon: BadgeCheck, title: "Photo proof", body: "Workers upload required before and after photos as part of the job workflow." },
];

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

const faqs = [
  {
    q: "Do you take my car away?",
    a: "No. This is a doorstep service: the washer comes to where your car is parked and washes it right there. Your car never leaves your home or office.",
  },
  {
    q: "Do I need to be present during the wash?",
    a: "Not for an Express Wash, as long as the washer can reach the car. For interior cleaning, someone needs to unlock the car or leave the key with security. You'll get before and after photos either way.",
  },
  {
    q: "Do I need to provide water?",
    a: "Yes. Please provide access to a nearby water source. Your service partner brings the pressure washer, microfiber cloths and the other cleaning equipment needed to make your car shine.",
  },
  {
    q: "Can you wash my car in a basement or society parking?",
    a: "Yes. Most of our washes happen in residential parking. Please make sure the washer can get past the gate at your slot time.",
  },
  {
    q: "What if I need to cancel or reschedule?",
    a: "You can reschedule for free up to 2 hours before your slot. Cancellations made 2+ hours before get a full refund to the original payment method.",
  },
  {
    q: "How do I pay?",
    a: "You pay online at booking through Razorpay using the methods enabled for the merchant account.",
  },
  {
    q: "Which cities do you serve?",
    a: "Enter your pincode above to check current service coverage directly from the booking system.",
  },
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

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <HeroBackground />
        <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-14 px-4 py-16 pb-28 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20 lg:pb-32">
          <div className="hero-stagger">
            <Badge tone="blue" className="px-3 py-1.5 shadow-sm shadow-blue-900/5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-600" />
              </span>
              Doorstep car care, reimagined
            </Badge>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[0.96] font-bold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              Your car, cared for
              <span className="text-gradient block pb-1">right where it’s parked.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Pick a time and provide access to water. We bring the pressure washer, microfiber cloths and cleaning
              equipment—then keep you updated from booking to before-and-after proof.
            </p>
            <div className="mt-10">
              <CoverageChecker />
            </div>
            <dl className="mt-9 grid max-w-xl grid-cols-3 divide-x divide-slate-200">
              <div className="pr-4">
                <dt className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                  <CountUp value={14} suffix=" days" />
                </dt>
                <dd className="mt-0.5 text-xs text-slate-500 sm:text-sm">Booking window</dd>
              </div>
              <div className="px-4">
                <dt className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Online</dt>
                <dd className="mt-0.5 text-xs text-slate-500 sm:text-sm">Secure payment</dd>
              </div>
              <div className="pl-4">
                <dt className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Photo proof</dt>
                <dd className="mt-0.5 text-xs text-slate-500 sm:text-sm">Before &amp; after</dd>
              </div>
            </dl>
          </div>

          <div className="hero-enter-delayed relative mx-auto w-full max-w-lg lg:max-w-none">
            <HomePreview />
          </div>
        </div>
      </section>

      {/* Trust ticker */}
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

      {/* How it works */}
      <section id="how-it-works" className="relative scroll-mt-16 overflow-hidden py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" title="Three steps to a cleaner car" />
          <div className="relative mt-14">
            <Reveal
              variant="fade"
              delay={300}
              duration={1200}
              className="absolute top-14 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block"
            />
            <Stagger className="grid gap-5 md:grid-cols-3" step={140} variant="up">
              {steps.map((s, i) => (
                <SpotlightCard
                  key={s.title}
                  className="interactive-card group relative h-full overflow-hidden rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200/60"
                >
                  <span className="absolute top-6 right-7 text-5xl font-black text-slate-200/80 transition-all duration-500 group-hover:scale-110 group-hover:text-brand-100">
                    0{i + 1}
                  </span>
                  <span className="icon-tile flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                    <s.icon className="size-6" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{s.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                    Simple by design <ArrowRight className="size-4" />
                  </span>
                </SpotlightCard>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Packages slider */}
      <section id="packages" className="scroll-mt-16 bg-slate-50 pt-24 pb-4 sm:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <SectionHeading
              eyebrow="Packages"
              title="Pick the wash your car needs"
              body="From a quick exterior refresh to a full detail. Swipe through the packages, then check your pincode for the exact local price."
            />
          </div>
          <Reveal variant="scale" duration={900}>
            <ServiceShowcase />
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative scroll-mt-16 overflow-hidden bg-slate-50 py-24">
        <Parallax speed={0.1} className="absolute -top-32 -left-32 -z-0 opacity-70">
          <div className="size-[28rem] rounded-full bg-brand-200/30 blur-3xl" />
        </Parallax>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <SectionHeading
              eyebrow="Pricing"
              title="Simple, transparent packages"
              body="Cleaning equipment and materials are included; you only provide access to water. No hidden charges."
            />
          </div>
          <Pricing />
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={`Why ${BRAND.name}`} title="Built for people who value their time" />
          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={80}>
            {features.map((f) => (
              <SpotlightCard
                key={f.title}
                className="interactive-card group flex h-full gap-4 rounded-2xl border border-slate-200/70 bg-white p-5"
              >
                <span className="icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-600/25">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{f.body}</p>
                </div>
              </SpotlightCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Cities */}
      <section id="cities" className="relative scroll-mt-16 overflow-hidden bg-slate-950 py-24 text-white">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-50" />
        <Parallax speed={-0.15} className="absolute -top-40 right-0">
          <div className="drift size-[30rem] rounded-full bg-brand-500/15 blur-3xl" />
        </Parallax>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal variant="left">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">Cities</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Expanding across India</h2>
              <p className="mt-4 max-w-md text-slate-400">
                We launch area by area so every booking gets an on-time washer. Don&apos;t see your city? Enter your
                pincode above and we&apos;ll tell you the day we arrive.
              </p>
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

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <Reveal variant="up" delay={160} className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5 transition-colors duration-300 open:bg-brand-50/40 hover:bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                  {f.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-slate-500 transition-all duration-300 group-hover:bg-slate-200 group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{f.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="scale" duration={900}>
            <div className="cta-panel relative overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-16 text-center shadow-2xl shadow-blue-950/20 sm:px-16 sm:py-20">
              <div aria-hidden className="dot-grid absolute inset-0 opacity-60" />
              <div aria-hidden className="drift absolute -top-24 -right-24 size-80 rounded-full bg-brand-500/30 blur-2xl" />
              <div aria-hidden className="float-slow absolute -bottom-32 -left-20 size-80 rounded-full bg-cyan-400/20 blur-3xl" />
              <Reveal variant="up" delay={200}>
                <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your car deserves better than a dusty Sunday.
                </h2>
              </Reveal>
              <Reveal variant="up" delay={300}>
                <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
                  Check your pincode for current packages, prices and available time slots.
                </p>
              </Reveal>
              <Reveal variant="up" delay={400} className="relative mt-8 flex justify-center">
                <Button href="/book" size="lg" variant="secondary" className="group rounded-xl px-7">
                  Book your wash <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
