"use client";

import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-snap carousel. Each direct child becomes one full-width slide.
 * Supports touch swipe and trackpad scrolling natively, arrow buttons,
 * keyboard arrows, pill indicators, and optional autoplay with a progress
 * bar that pauses on hover, focus, when off-screen or when the tab is hidden.
 */
export function Slider({
  children,
  label,
  autoPlay = 0,
  className,
  dark = false,
}: {
  children: ReactNode;
  /** Accessible name for the carousel region. */
  label: string;
  /** Milliseconds between automatic advances; 0 disables autoplay. */
  autoPlay?: number;
  className?: string;
  /** Use light controls on a dark background. */
  dark?: boolean;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const playing = autoPlay > 0;
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const running = playing && !hovered && visible && pageVisible && count > 1;

  const goTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const target = ((next % count) + count) % count;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: target * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
    },
    [count],
  );

  // Track the active slide from the scroll position.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Pause when scrolled out of view or the tab is hidden.
  useEffect(() => {
    const node = regionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setVisible(entries.some((entry) => entry.isIntersecting)), {
      threshold: 0.35,
    });
    observer.observe(node);
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Autoplay.
  useEffect(() => {
    if (!running || autoPlay <= 0) return;
    const timer = window.setTimeout(() => goTo(index + 1), autoPlay);
    return () => window.clearTimeout(timer);
  }, [running, autoPlay, index, goTo]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  }

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn("group/slider relative outline-none", className)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, slideIndex) => (
          <div
            key={slideIndex}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${count}`}
            aria-hidden={slideIndex !== index}
            className="w-full shrink-0 snap-center"
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((_, dot) => (
                <button
                  key={dot}
                  type="button"
                  role="tab"
                  aria-selected={dot === index}
                  aria-label={`Go to slide ${dot + 1}`}
                  onClick={() => goTo(dot)}
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-full transition-all duration-500",
                    dot === index ? "w-12" : "w-6",
                    dark ? "bg-white/20 hover:bg-white/40" : "bg-slate-200 hover:bg-slate-300",
                  )}
                >
                  {dot === index && (
                    <span
                      key={`${index}-${running}`}
                      aria-hidden
                      className={cn("absolute inset-0 origin-left rounded-full", dark ? "bg-brand-400" : "bg-brand-600")}
                      style={
                        autoPlay > 0
                          ? { animation: `bar-in ${autoPlay}ms linear both`, animationPlayState: running ? "running" : "paused" }
                          : undefined
                      }
                    />
                  )}
                </button>
              ))}
            </div>
            <span className={cn("text-xs font-semibold tabular-nums", dark ? "text-slate-400" : "text-slate-500")}>
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>
          <p className={cn("hidden text-xs sm:block", dark ? "text-slate-500" : "text-slate-400")}>Swipe or use arrow keys</p>
        </div>
      )}
    </div>
  );
}
