import { ShieldCheck, Star } from "lucide-react";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {children}
          <p className="mt-10 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" /> Your details are encrypted and never shared.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-600 lg:block">
        <div aria-hidden className="absolute -top-32 -right-32 size-[32rem] rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-brand-900/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-16 text-white">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-amber-300 text-amber-300" />
            ))}
          </div>
          <blockquote className="mt-6 text-2xl leading-9 font-medium">
            “The washer comes to my society parking while I&apos;m at work. My car looks brand new every week.”
          </blockquote>
          <p className="mt-6 text-brand-100">Karan Malhotra · Gurugram</p>
        </div>
      </div>
    </div>
  );
}
