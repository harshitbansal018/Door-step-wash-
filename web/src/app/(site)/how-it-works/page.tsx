import { ArrowRight, Camera, Droplets, ShieldCheck, Wrench } from "lucide-react";
import { Reveal, SpotlightCard, Stagger } from "@/components/motion";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { ServiceJourney } from "@/components/site/service-journey";
import { Button } from "@/components/ui";

const essentials = [
  { icon: Droplets, title: "You provide water", body: "Please make sure a nearby water source is accessible at your chosen time." },
  { icon: Wrench, title: "We bring the equipment", body: "Your partner arrives with a pressure washer, microfiber cloths and required cleaning tools." },
  { icon: ShieldCheck, title: "Verified service partner", body: "Partners are activated only after their identity document is reviewed by an administrator." },
  { icon: Camera, title: "Progress you can see", body: "Track job status and receive before-and-after photo proof through your account." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="From booking to spotless"
        title="A better wash in"
        accent="four simple steps."
        description="Book online, prepare your parking spot, and let a verified service partner handle the rest—while your car stays right where it is."
      />
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="flip" duration={1000}>
            <ServiceJourney />
          </Reveal>
        </div>
      </section>
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal variant="fade">
              <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">Good to know</p>
            </Reveal>
            <Reveal variant="blur" delay={80}>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Everything ready before the first drop</h2>
            </Reveal>
          </div>
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" step={100}>
            {essentials.map((item) => (
              <SpotlightCard
                key={item.title}
                as="article"
                className="interactive-card group h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <span className="icon-tile flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-600/25">
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </SpotlightCard>
            ))}
          </Stagger>
          <Reveal variant="up" delay={200} className="mt-12 flex justify-center">
            <Button href="/book" size="lg" className="group rounded-xl">
              Book your first wash <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
