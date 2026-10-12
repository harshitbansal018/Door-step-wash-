import { ArrowRight, Bike, Check, Clock3, Droplets, Sparkles, SprayCan, type LucideIcon } from "lucide-react";
import { Slider } from "@/components/site/slider";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
  highlights: string[];
  duration: string;
  accent: string;
  glow: string;
  href: string;
};

/** Edit this list to match the packages configured in the admin panel. */
const slides: Slide[] = [
  {
    eyebrow: "Quick and regular",
    title: "Express Wash",
    body: "A fast exterior clean for cars that are driven every day. Foam, rinse and a streak-free microfiber dry, done right in your parking spot.",
    icon: SprayCan,
    highlights: ["Exterior foam wash", "Pressure rinse", "Microfiber dry", "Tyre and rim clean"],
    duration: "About 30 min",
    accent: "from-brand-500 to-cyan-400",
    glow: "bg-brand-500/30",
    href: "/pricing",
  },
  {
    eyebrow: "Inside and out",
    title: "Premium Wash",
    body: "Everything in Express, plus a thorough interior vacuum, dashboard wipe-down and glass cleaning so the whole car feels fresh again.",
    icon: Sparkles,
    highlights: ["Everything in Express", "Interior vacuum", "Dashboard and panels", "Interior glass"],
    duration: "About 60 min",
    accent: "from-violet-500 to-brand-500",
    glow: "bg-violet-500/30",
    href: "/pricing",
  },
  {
    eyebrow: "Showroom finish",
    title: "Deluxe Detailing",
    body: "Deep cleaning with attention to every surface: seats, mats, door jambs and a protective exterior finish that keeps the shine for longer.",
    icon: Droplets,
    highlights: ["Everything in Premium", "Seats and mats shampoo", "Door jambs and sills", "Exterior protection"],
    duration: "About 120 min",
    accent: "from-emerald-400 to-cyan-400",
    glow: "bg-emerald-500/25",
    href: "/pricing",
  },
  {
    eyebrow: "Two-wheelers",
    title: "Bike Wash",
    body: "A careful wash for motorcycles and scooters, with degreasing where it matters and a dry that leaves no water spots on the paint or chrome.",
    icon: Bike,
    highlights: ["Body and panels", "Wheels and chain area", "Chrome and mirrors", "Spot-free dry"],
    duration: "About 25 min",
    accent: "from-amber-400 to-orange-500",
    glow: "bg-amber-500/25",
    href: "/pricing",
  },
];

function ShowcaseSlide({ slide, position }: { slide: Slide; position: number }) {
  const Icon = slide.icon;
  return (
    <article className="relative isolate grid overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-blue-950/20 ring-1 ring-white/10 lg:grid-cols-[1.1fr_.9fr]">
      <div aria-hidden className="dot-grid absolute inset-0 opacity-50" />
      <div aria-hidden className={cn("drift absolute -top-32 -right-24 size-96 rounded-full blur-3xl", slide.glow)} />
      <div aria-hidden className="float-slow absolute -bottom-40 -left-24 size-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative p-8 sm:p-12 lg:p-14">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200 ring-1 ring-white/10">
          <span className={cn("size-1.5 rounded-full bg-gradient-to-r", slide.accent)} />
          {slide.eyebrow}
        </p>
        <h3 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{slide.title}</h3>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{slide.body}</p>
        <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
          {slide.highlights.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-slate-200">
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white", slide.accent)}>
                <Check className="size-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Button href={slide.href} size="lg" variant="secondary" className="group rounded-xl">
            See local price <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
          <span className="flex items-center gap-2 text-sm text-slate-400">
            <Clock3 className="size-4" /> {slide.duration}
          </span>
        </div>
      </div>

      <div className="relative hidden items-center justify-center p-10 lg:flex">
        <div className="relative">
          <div aria-hidden className={cn("absolute inset-0 scale-125 rounded-full bg-gradient-to-br opacity-40 blur-3xl", slide.accent)} />
          <div className="float-slow relative flex size-56 items-center justify-center rounded-[2.5rem] bg-white/5 ring-1 ring-white/10 backdrop-blur">
            <span className={cn("flex size-28 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-2xl", slide.accent)}>
              <Icon className="size-14" />
            </span>
            <span className="absolute -top-4 -right-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg">
              0{position}
            </span>
          </div>
          <div className="float-slow-reverse absolute -bottom-6 -left-10 rounded-2xl bg-white/10 px-4 py-3 text-xs ring-1 ring-white/10 backdrop-blur">
            <p className="font-semibold text-white">Photo proof</p>
            <p className="text-slate-400">Before and after</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ServiceShowcase() {
  return (
    <Slider label="Wash packages" autoPlay={6000}>
      {slides.map((slide, index) => (
        <ShowcaseSlide key={slide.title} slide={slide} position={index + 1} />
      ))}
    </Slider>
  );
}
