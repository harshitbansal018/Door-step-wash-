import {
  BadgeCheck,
  CalendarCheck,
  CreditCard,
  Droplets,
  Leaf,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import { CoverageChecker } from "@/components/site/coverage-checker";
import { Pricing } from "@/components/site/pricing";
import { Avatar, Badge, Button } from "@/components/ui";
import { BRAND } from "@/lib/config";
import { CITIES } from "@/lib/data";

const steps = [
  {
    icon: CalendarCheck,
    title: "Book in 60 seconds",
    body: "Pick your car, package and a time slot that suits you. Pay securely online.",
  },
  {
    icon: Navigation,
    title: "We come to you",
    body: "A verified washer arrives with water, power and supplies. Track them live.",
  },
  {
    icon: Sparkles,
    title: "Drive off sparkling",
    body: "See before and after photos, rate the wash, and rebook in one tap.",
  },
];

const features = [
  { icon: ShieldCheck, title: "Verified professionals", body: "Every washer is ID-verified, police-checked and trained in-house." },
  { icon: Leaf, title: "Water-smart cleaning", body: "Pressure foam systems use up to 80% less water than a bucket wash." },
  { icon: Timer, title: "On-time, every time", body: "Choose a one-hour slot. If we're late by 30 minutes, the wash is on us." },
  { icon: CreditCard, title: "Secure payments", body: "Pay with UPI, card or wallet. Instant refunds on eligible cancellations." },
  { icon: MapPin, title: "Live tracking", body: "Know exactly when your washer will arrive, with status updates by SMS." },
  { icon: BadgeCheck, title: "Satisfaction promise", body: "Not happy? We'll come back and redo it free within 24 hours." },
];

const testimonials = [
  {
    name: "Ritika Bansal",
    city: "Gurugram",
    quote: "Booked at 8 am, washer arrived at 9 sharp. The before/after photos were a nice touch. My SUV hasn't looked this good since I bought it.",
  },
  {
    name: "Amit Khanna",
    city: "Noida",
    quote: "No more Sunday queues at the service centre. The Premium wash is worth every rupee and the app makes rebooking effortless.",
  },
  {
    name: "Sneha Iyer",
    city: "Gurugram",
    quote: "I was sceptical about a doorstep wash in a basement parking, but they had everything they needed. Super professional team.",
  },
];

const faqs = [
  {
    q: "Do I need to provide water or electricity?",
    a: "No. Our washers carry their own water tank, pressure washer and all cleaning supplies. We just need access to your car.",
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
    a: "You pay online at booking with UPI, debit/credit card or wallet. You receive a GST invoice by email after the wash.",
  },
  {
    q: "Which cities do you serve?",
    a: "We're live in Gurugram and Noida, and launching in Pune soon. Enter your pincode above to check your exact area.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div
          aria-hidden
          className="absolute -top-40 right-0 -z-0 size-[40rem] rounded-full bg-brand-200/40 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
          <div>
            <Badge tone="blue" className="px-3 py-1">
              <Sparkles className="size-3.5" /> Now live in Gurugram &amp; Noida
            </Badge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              A spotless car, <span className="text-brand-600">without leaving home.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Professional car wash and detailing at your doorstep. Book a slot, pay online, and a verified washer
              arrives with everything needed.
            </p>
            <div className="mt-10">
              <CoverageChecker />
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                ["4.8/5", "Average rating"],
                ["25k+", "Cars washed"],
                ["45 min", "Average wash"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-bold text-slate-900">{value}</dt>
                  <dd className="text-sm text-slate-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-900/10">
              <div className="rounded-2xl bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Booking BK-10482</p>
                    <p className="mt-0.5 font-semibold text-slate-900">Premium Wash · Hyundai Creta</p>
                  </div>
                  <Badge tone="sky">
                    <span className="size-1.5 animate-pulse rounded-full bg-current" /> On the way
                  </Badge>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <Avatar name="Ramesh Kumar" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Ramesh Kumar</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> 4.9 · 412 washes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-600">8 min</p>
                    <p className="text-xs text-slate-500">away</p>
                  </div>
                </div>
                <ol className="mt-5 space-y-4">
                  {[
                    ["Booking confirmed", "08:12 AM", true],
                    ["Washer assigned", "08:14 AM", true],
                    ["On the way", "08:47 AM", true],
                    ["Wash in progress", "—", false],
                    ["Completed", "—", false],
                  ].map(([label, time, done], i) => (
                    <li key={label as string} className="flex items-center gap-3">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          done ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`flex-1 text-sm ${done ? "font-medium text-slate-900" : "text-slate-400"}`}>
                        {label}
                      </span>
                      <span className="text-xs text-slate-400">{time}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:block">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Droplets className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">80% less water</p>
                  <p className="text-xs text-slate-500">vs. a bucket wash</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Three steps to a cleaner car
            </h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl bg-slate-50 p-8">
                <span className="absolute top-8 right-8 text-5xl font-bold text-slate-200">0{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                  <s.icon className="size-6" />
                </span>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{s.body}</p>
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
            <p className="mt-4 text-slate-600">Prices include all supplies and taxes. No hidden charges.</p>
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
          <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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
            <div className="grid gap-4 sm:grid-cols-2">
              {CITIES.map((c) => (
                <div key={c.id} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    {c.isActive ? (
                      <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-400/20">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-400/20">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {c.areas.filter((a) => a.isActive).map((a) => a.name).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Reviews</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Loved by car owners
            </h2>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-6 text-slate-700">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Avatar name={t.name} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.city}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-12 divide-y divide-slate-200 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
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
          <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-8 py-16 text-center shadow-xl sm:px-16">
            <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your car deserves better than a dusty Sunday.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-brand-100">
              First wash? Use code <span className="font-mono font-semibold text-white">FIRST30</span> for 30% off.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Button href="/book" size="lg" variant="secondary">
                Book your wash
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
