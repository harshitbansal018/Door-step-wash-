import { MessageCircleQuestion } from "lucide-react";
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
          <div className="flex flex-col items-center rounded-[2rem] bg-slate-950 p-8 text-center text-white shadow-2xl shadow-blue-950/20 sm:p-12">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-600"><MessageCircleQuestion className="size-6" /></span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">Ready to give your car a better wash?</h2>
            <p className="mt-3 max-w-xl text-slate-300">Check your local availability, choose a package and reserve a time that works for you.</p>
            <Button href="/book" size="lg" variant="secondary" className="mt-7 rounded-xl">Start booking</Button>
          </div>
        </div>
      </section>
    </>
  );
}
