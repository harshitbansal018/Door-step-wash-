"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Moves its children vertically at a fraction of the scroll speed.
 * A `speed` of 0.2 drifts the element 20% of the distance scrolled.
 * Negative values move against the scroll direction.
 */
export function Parallax({
  speed = 0.2,
  className,
  style,
  children,
}: {
  speed?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      const offset = rect.top + rect.height / 2 - viewport / 2;
      node.style.setProperty("--parallax", `${(-offset * speed).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <div ref={ref} aria-hidden className={className} style={{ ...style, transform: "translate3d(0, var(--parallax, 0px), 0)", willChange: "transform" }}>
      {children}
    </div>
  );
}
