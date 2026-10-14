"use client";

import { useEffect, useRef } from "react";
import { Parallax } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Fixed set of bubble positions so server and client render identically.
 * left: % across, size: px, duration/delay: seconds, sway: px of sideways drift.
 */
const BUBBLES = [
  { left: 4, size: 14, duration: 19, delay: 0, sway: 18 },
  { left: 11, size: 8, duration: 15, delay: 3, sway: 10 },
  { left: 18, size: 22, duration: 24, delay: 6, sway: 26 },
  { left: 26, size: 10, duration: 17, delay: 1, sway: 14 },
  { left: 33, size: 16, duration: 21, delay: 8, sway: 20 },
  { left: 41, size: 7, duration: 14, delay: 4, sway: 8 },
  { left: 48, size: 26, duration: 27, delay: 10, sway: 30 },
  { left: 55, size: 12, duration: 18, delay: 2, sway: 16 },
  { left: 62, size: 9, duration: 16, delay: 7, sway: 12 },
  { left: 69, size: 20, duration: 23, delay: 5, sway: 22 },
  { left: 76, size: 11, duration: 17, delay: 12, sway: 14 },
  { left: 83, size: 30, duration: 29, delay: 9, sway: 34 },
  { left: 89, size: 8, duration: 15, delay: 11, sway: 10 },
  { left: 95, size: 17, duration: 22, delay: 3, sway: 20 },
];

/**
 * Layered animated backdrop for hero sections: drifting aurora gradients,
 * rising water bubbles, a pointer-following glow and an animated wave at the
 * bottom edge. Everything is CSS-driven; the only JavaScript is the glow
 * position. Place inside a `relative isolate overflow-hidden` section.
 */
export function HeroBackground({
  tone = "light",
  wave = true,
  className,
}: {
  tone?: "light" | "dark";
  /** Render the animated wave along the bottom edge. */
  wave?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = tone === "dark";

  // Pause every animation in the hero section (background and anything else in
  // it, such as the live booking card) while it is off screen, so scrolling the
  // rest of the page does not pay for animations nobody can see.
  useEffect(() => {
    const section = ref.current?.parentElement;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) delete section.dataset.paused;
        else section.dataset.paused = "true";
      },
      { rootMargin: "80px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // The backdrop ignores pointer events, so listen on the parent section and
  // translate the pointer position into CSS variables for the glow layer.
  useEffect(() => {
    const node = ref.current;
    const parent = node?.parentElement;
    if (!node || !parent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = parent.getBoundingClientRect();
      node.style.setProperty("--gx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`);
      node.style.setProperty("--gy", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`);
      node.dataset.glow = "true";
    };
    const onLeave = () => {
      delete node.dataset.glow;
    };
    parent.addEventListener("pointermove", onMove, { passive: true });
    parent.addEventListener("pointerleave", onLeave);
    return () => {
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("hero-bg pointer-events-none absolute inset-0 -z-10", dark ? "hero-bg-dark" : "hero-bg-light", className)}
    >
      {/* Base gradient */}
      <div
        className={cn(
          "absolute inset-0",
          dark
            ? "bg-[linear-gradient(160deg,#020617_0%,#0f172a_55%,#0b1a3a_100%)]"
            : "bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#ecfeff_100%)]",
        )}
      />

      {/* Aurora blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <Parallax speed={-0.12} className="absolute -top-[20%] -right-[10%]">
          <div className={cn("aurora aurora-1 size-[46rem] rounded-full", dark ? "bg-brand-500/25" : "bg-brand-300/45")} />
        </Parallax>
        <Parallax speed={0.1} className="absolute top-[35%] -left-[15%]">
          <div className={cn("aurora aurora-2 size-[38rem] rounded-full", dark ? "bg-cyan-400/20" : "bg-cyan-200/55")} />
        </Parallax>
        <Parallax speed={-0.06} className="absolute -bottom-[25%] left-[35%]">
          <div className={cn("aurora aurora-3 size-[40rem] rounded-full", dark ? "bg-violet-500/15" : "bg-sky-200/50")} />
        </Parallax>
        <div className={cn("aurora aurora-4 absolute top-[10%] left-[45%] size-[22rem] rounded-full", dark ? "bg-blue-400/15" : "bg-white/70")} />
      </div>

      {/* Pointer glow */}
      <div className="hero-glow absolute inset-0" />

      {/* Grid overlay */}
      <div className={cn("absolute inset-0", dark ? "dot-grid opacity-40" : "hero-grid opacity-70")} />

      {/* Rising bubbles */}
      <div className="absolute inset-0 overflow-hidden">
        {BUBBLES.map((bubble, index) => (
          <span
            key={index}
            className={cn("bubble absolute bottom-0 rounded-full", dark ? "bubble-dark" : "bubble-light")}
            style={{
              left: `${bubble.left}%`,
              width: bubble.size,
              height: bubble.size,
              animationDuration: `${bubble.duration}s`,
              animationDelay: `-${bubble.delay}s`,
              ["--sway" as string]: `${bubble.sway}px`,
            }}
          />
        ))}
      </div>

      {/* Light rays (subtle diagonal sheen) */}
      {!dark && <div className="rays absolute inset-0" />}

      {/* Bottom wave */}
      {wave && (
        <div className="absolute inset-x-0 bottom-0 h-20 overflow-hidden sm:h-28">
          <svg className="wave wave-back absolute bottom-0 h-full w-[200%]" viewBox="0 0 2880 120" preserveAspectRatio="none" fill="none">
            <path
              d="M0 70 C 240 20, 480 20, 720 70 S 1200 120, 1440 70 S 1920 20, 2160 70 S 2640 120, 2880 70 L2880 120 L0 120 Z"
              className={dark ? "fill-white/5" : "fill-brand-100/60"}
            />
          </svg>
          <svg className="wave wave-front absolute bottom-0 h-full w-[200%]" viewBox="0 0 2880 120" preserveAspectRatio="none" fill="none">
            <path
              d="M0 90 C 240 50, 480 50, 720 90 S 1200 130, 1440 90 S 1920 50, 2160 90 S 2640 130, 2880 90 L2880 120 L0 120 Z"
              className={dark ? "fill-slate-950" : "fill-white"}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
