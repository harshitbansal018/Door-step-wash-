import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CreditCard,
  Leaf,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { CoverageChecker } from "@/components/site/coverage-checker";
import { CityList } from "@/components/site/city-list";
import { HomePreview } from "@/components/site/home-preview";
import { Pricing } from "@/components/site/pricing";
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

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#ecfeff_100%)]">
        <div aria-hidden className="hero-grid absolute inset-0 -z-10 opacity-60" />
        <div
          aria-hidden
          className="float-slow absolute -top-40 right-0 -z-0 size-[40rem] rounded-full bg-brand-300/30 blur-3xl"
        />
        <div aria-hidden className="float-slow-reverse absolute -bottom-40 left-1/3 -z-0 size-96 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
          <div className="hero-enter">
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
              {[
                ["14 days", "Booking window"],
                ["Online", "Secure payment"],
                ["Photo proof", "Before & after"],
              ].map(([value, label]) => (
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

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Three steps to a cleaner car
            </h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="interactive-card group relative overflow-hidden rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200/60">
                <span className="absolute top-6 right-7 text-5xl font-black text-slate-200/80 transition-all duration-500 group-hover:scale-110 group-hover:text-brand-100">0{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <s.icon className="size-6" />
                </span>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{s.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                  Simple by design <ArrowRight className="size-4" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Simple, transparent packages
            </h2>
            <p className="mt-4 text-slate-600">
              Cleaning equipment and materials are included; you only provide access to water. No hidden charges.
            </p>
          </div>
          <Pricing />
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Why {BRAND.name}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for people who value their time
            </h2>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="interactive-card group flex gap-4 rounded-2xl border border-slate-200/70 bg-white p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section id="cities" className="scroll-mt-16 bg-slate-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">Cities</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Expanding across India</h2>
              <p className="mt-4 max-w-md text-slate-400">
                We launch area by area so every booking gets an on-time washer. Don&apos;t see your city? Enter your
                pincode above and we&apos;ll tell you the day we arrive.
              </p>
            </div>
            <CityList />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5 transition-colors open:bg-brand-50/40 hover:bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                  {f.q}
                  <span className="text-xl leading-none text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="cta-panel relative overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-16 text-center shadow-2xl shadow-blue-950/20 sm:px-16 sm:py-20">
            <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-brand-500/30 blur-2xl" />
            <div aria-hidden className="absolute -bottom-32 -left-20 size-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your car deserves better than a dusty Sunday.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
              Check your pincode for current packages, prices and available time slots.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Button href="/book" size="lg" variant="secondary" className="group rounded-xl px-7">
                Book your wash <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
