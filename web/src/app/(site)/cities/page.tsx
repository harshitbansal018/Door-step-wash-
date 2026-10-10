import { BellRing, MapPinned, Navigation, Waves } from "lucide-react";
import { CityList } from "@/components/site/city-list";
import { CoverageChecker } from "@/components/site/coverage-checker";
import { PublicPageHero } from "@/components/site/public-page-hero";

export default function CitiesPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Growing area by area"
        title="Doorstep car care"
        accent="closer to home."
        description="Coverage can vary by neighbourhood. Check your six-digit pincode for the most accurate availability, packages and local pricing."
        primaryLabel="Check coverage"
        primaryHref="#coverage"
      />
      <section id="coverage" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">Pincode checker</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Know before you book</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-600">Enter your pincode and we’ll take you directly to booking when your area is served. If we are not there yet, you can join the local waitlist.</p>
            <div className="mt-8"><CoverageChecker /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: MapPinned, title: "Area-level coverage", body: "Availability is checked against your exact pincode, not only your city." },
              { icon: Navigation, title: "Local time slots", body: "Booking options reflect capacity in the service area assigned to you." },
              { icon: Waves, title: "Water access", body: "Provide a nearby water source at the parking spot for your scheduled wash." },
              { icon: BellRing, title: "Launch updates", body: "Join the waitlist to be notified when service opens in an unsupported area." },
            ].map((item) => (
              <article key={item.title} className="interactive-card rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
                <item.icon className="size-6 text-brand-600" />
                <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden bg-slate-950 py-20 text-white sm:py-24">
        <div aria-hidden className="absolute -top-32 right-0 size-96 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold tracking-wider text-brand-300 uppercase">Service map</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Where we are washing now</h2>
          </div>
          <CityList />
        </div>
      </section>
    </>
  );
}
