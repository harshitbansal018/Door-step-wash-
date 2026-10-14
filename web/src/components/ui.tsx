import Link from "next/link";
import Image from "next/image";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { BRAND } from "@/lib/config";
import { STATUS_META, type BookingStatus, type Tone } from "@/lib/domain";
import { cn, initials } from "@/lib/utils";

export { Modal } from "./modal";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "btn-shine bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/30 active:translate-y-0 active:scale-[.98] focus-visible:outline-brand-600 disabled:translate-y-0 disabled:bg-brand-300 disabled:shadow-none",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:ring-slate-400 hover:shadow-md active:translate-y-0 active:scale-[.98] disabled:translate-y-0 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[.98]",
  danger: "bg-red-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 active:translate-y-0 active:scale-[.98]",
  dark: "btn-shine bg-slate-900 text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/25 active:translate-y-0 active:scale-[.98]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
} & ComponentProps<"button">;

export function Button({ variant = "primary", size = "md", href, className, children, ...props }: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
    variantClass[variant],
    sizeClass[size],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
const toneClass: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}

export function Card({
  className,
  children,
  hover = false,
  style,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-xl bg-white ring-1 ring-slate-200 shadow-sm",
        hover && "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 hover:ring-brand-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Shimmering placeholder block used while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-4 w-full", className)} />;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "block h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 transition-[box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:ring-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:shadow-[0_0_0_4px_rgb(37_99_235/0.12)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "block h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 transition-[box-shadow] duration-200 hover:ring-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:shadow-[0_0_0_4px_rgb(37_99_235/0.12)] focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        checked ? "bg-brand-600" : "bg-slate-200",
      )}
    >
      <span
        className={cn(
          "pointer-events-none mt-0.5 ml-0.5 inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Logo({ href = "/", light = false, suffix, name = BRAND.name }: { href?: string; light?: boolean; suffix?: string; name?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={`${name} home`}>
      {/* Navy strokes become white on dark headers so the car stays visible. */}
      <Image
        src={light ? "/brand/logo-mark-light.png" : "/brand/logo-mark.png"}
        alt=""
        width={93}
        height={32}
        priority
        className="h-8 w-auto shrink-0"
      />
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-slate-900")}>
        {name}
      </span>
      {suffix && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            light ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600",
          )}
        >
          {suffix}
        </span>
      )}
    </Link>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change?: { value: string; positive: boolean };
  icon: ReactNode;
}) {
  return (
    <Card hover className="group p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="icon-tile flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-brand-600/25">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {change && (
        <p className={cn("mt-1 text-xs font-medium", change.positive ? "text-emerald-600" : "text-red-600")}>
          {change.value} <span className="font-normal text-slate-500">vs last week</span>
        </p>
      )}
    </Card>
  );
}
