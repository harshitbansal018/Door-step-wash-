import { BadgeCheck, CreditCard, Droplets, ReceiptText } from "lucide-react";
import { Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { Pricing } from "@/components/site/pricing";
import { PublicPageHero } from "@/components/site/public-page-hero";

const promises = [
  { icon: ReceiptText, title: "Price shown upfront", body: "See your package price and applicable area charge before booking." },
  { icon: CreditCard, title: "Secure online payment", body: "Complete payment through Razorpay using the enabled methods." },
  { icon: BadgeCheck, title: "Materials included", body: "Microfiber cloths and standard cleaning materials are included in the displayed price." },
  { icon: Droplets, title: "Water access required", body: "You provide a nearby water source; the partner brings the pressure washer and equipment." },
];

export default function PricingPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Clear, local pricing"
        title="Find the right wash at"
        accent="the right price."
        description="Start with our lowest active rates, then enter your pincode to see the exact packages and pricing available in your area."
        primaryLabel="Check your pincode"
        primaryHref="#live-pricing"
      />
      <section id="live-pricing" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Reveal variant="fade">
              <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">Live packages</p>
            </Reveal>
            <Reveal variant="blur" delay={80}>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Your area. Your vehicle. Your price.</h2>
            </Reveal>
          </div>
          <Pricing />
        </div>
      </section>
      <section className="py-20 sm:py-24">
        <Stagger className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8" step={100}>
          {promises.map((item) => (
            <SpotlightCard
              key={item.title}
              as="article"
              className="interactive-card group h-full rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="icon-tile inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-600/25">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </SpotlightCard>
          ))}
        </Stagger>
      </section>
    </>
  );
}
