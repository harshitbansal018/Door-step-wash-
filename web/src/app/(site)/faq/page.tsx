import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import { Reveal } from "@/components/motion";
import { FaqExplorer } from "@/components/site/faq-explorer";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { Button } from "@/components/ui";

export default function FaqPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Answers, without the runaround"
        title="Everything you need to"
        accent="book confidently."
        description="Search common questions about water access, equipment, booking, payments, coverage and what happens on wash day."
        primaryLabel="Browse questions"
        primaryHref="#questions"
      />
      <section id="questions" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FaqExplorer />
        </div>
      </section>
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="scale" duration={900}>
            <div className="cta-panel relative flex flex-col items-center overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-center text-white shadow-2xl shadow-blue-950/20 sm:p-12">
              <div aria-hidden className="dot-grid absolute inset-0 opacity-60" />
              <div aria-hidden className="drift absolute -top-24 -right-24 size-64 rounded-full bg-brand-500/25 blur-3xl" />
              <span className="check-pop relative flex size-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
                <MessageCircleQuestion className="size-6" />
              </span>
              <Reveal variant="up" delay={150}>
                <h2 className="relative mt-5 text-3xl font-bold tracking-tight">Ready to give your car a better wash?</h2>
              </Reveal>
              <Reveal variant="up" delay={250}>
                <p className="relative mt-3 max-w-xl text-slate-300">Check your local availability, choose a package and reserve a time that works for you.</p>
              </Reveal>
              <Reveal variant="up" delay={350} className="relative">
                <Button href="/book" size="lg" variant="secondary" className="group mt-7 rounded-xl">
                  Start booking <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
