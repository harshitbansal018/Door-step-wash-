"use client";

import { Children, isValidElement, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RevealVariant = "up" | "down" | "left" | "right" | "scale" | "fade" | "blur" | "flip";

type RevealProps = {
  as?: ElementType;
  variant?: RevealVariant;
  /** Delay in milliseconds before the animation starts once in view. */
  delay?: number;
  /** Duration in milliseconds. */
  duration?: number;
  /** Animate only the first time the element enters the viewport. */
  once?: boolean;
  /** How much of the element must be visible before it animates (0 to 1). */
  threshold?: number;
  /** Root margin passed to IntersectionObserver, e.g. "0px 0px -10% 0px". */
  margin?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
};

/**
 * Scroll-triggered reveal. The element starts hidden (only when the document
 * has `data-motion`, set by an inline script in the root layout) and animates
 * in the first time it scrolls into view. Without JavaScript or with reduced
 * motion enabled the content is simply visible.
 */
export function Reveal({
  as,
  variant = "up",
  delay = 0,
  duration,
  once = true,
  threshold = 0.12,
  margin = "0px 0px -6% 0px",
  className,
  style,
  children,
  id,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.inview = "true";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.inview = "true";
            if (once) observer.unobserve(node);
          } else if (!once) {
            delete node.dataset.inview;
          }
        }
      },
      { threshold, rootMargin: margin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold, margin]);

  const vars: Record<string, string | number | undefined> = { ...(style as Record<string, string | number | undefined>) };
  if (delay) vars["--reveal-delay"] = `${delay}ms`;
  if (duration) vars["--reveal-duration"] = `${duration}ms`;

  return (
    <Tag ref={ref} id={id} data-reveal={variant} className={cn("reveal", className)} style={vars as CSSProperties}>
      {children}
    </Tag>
  );
}

type StaggerProps = Omit<RevealProps, "delay" | "children"> & {
  /** Gap between each child's animation, in milliseconds. */
  step?: number;
  /** Delay before the first child animates. */
  start?: number;
  /** Class applied to each wrapped child. */
  itemClassName?: string;
  itemAs?: ElementType;
  children: ReactNode;
};

/**
 * Wraps each direct child in a Reveal with an increasing delay so lists and
 * grids cascade in. The wrapper itself is a plain element (default div).
 */
export function Stagger({
  as,
  itemAs,
  step = 90,
  start = 0,
  variant = "up",
  duration,
  once,
  threshold,
  margin,
  className,
  itemClassName,
  style,
  children,
}: StaggerProps) {
  const Tag = (as ?? "div") as ElementType;
  const items = Children.toArray(children).filter((child) => isValidElement(child) || typeof child === "string");
  return (
    <Tag className={className} style={style}>
      {items.map((child, index) => (
        <Reveal
          key={isValidElement(child) && child.key != null ? child.key : index}
          as={itemAs}
          variant={variant}
          delay={start + index * step}
          duration={duration}
          once={once}
          threshold={threshold}
          margin={margin}
          className={itemClassName}
        >
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}
