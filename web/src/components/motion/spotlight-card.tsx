"use client";

import { useRef, type CSSProperties, type ElementType, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card whose background follows the pointer with a soft radial highlight.
 * Purely decorative; it behaves as a normal card without JavaScript.
 */
export function SpotlightCard({
  as,
  className,
  children,
  style,
  color = "rgb(37 99 235 / 0.14)",
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  /** Highlight colour; use a translucent value. */
  color?: string;
}) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn("spotlight", className)}
      style={{ ...style, "--spot": color } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
