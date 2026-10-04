import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ICON } from "@/lib/icons";

/** Big display title used at the top of each tab, as in the reference screens. */
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-5 pb-3">
      <div className="min-w-0">
        <h1 className="text-tab-title">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm leading-snug text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/** Back bar for detail screens. */
export function BackBar({ label, href }: { label: string; href: string }) {
  return (
    <div className="bar-blur sticky top-0 z-30 flex items-center gap-1 border-b border-line-soft px-2 py-2">
      <Link
        href={href}
        aria-label="Go back"
        className="flex h-11 w-11 items-center justify-center rounded-chip transition-[background-color,transform] duration-150 hover:bg-kesar-mist active:scale-90 active:bg-kesar-pale"
      >
        <ChevronLeft size={ICON.xl} className="text-ink" />
      </Link>
      <span className="truncate font-display text-base font-semibold tracking-[-0.012em]">
        {label}
      </span>
    </div>
  );
}

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-4">
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rise card-mist mx-4 px-5 py-9 text-center">
      {icon && (
        <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-surface/70 text-kesar-ink">
          {icon}
        </span>
      )}
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">
        {body}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Small labelled value used throughout profile screens. */
export function DetailRow({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm text-ink-soft">
        {icon}
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-h-[2.75rem] items-center justify-between gap-4 border-b border-line-soft px-4 py-2.5 last:border-0 transition-colors active:bg-kesar-mist"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="flex min-h-[2.75rem] items-center justify-between gap-4 border-b border-line-soft px-4 py-2.5 last:border-0">
      {body}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "warn" | "info" | "danger";
}) {
  const tones = {
    default: "bg-kesar-mist text-ink-soft",
    warn: "bg-warn-soft text-birthday",
    info: "bg-kesar-pale text-kesar-ink",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-2xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Progress meter for profile completion. */
export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink-soft">
        <span>{label ?? "Profile complete"}</span>
        <span className="tnum">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Profile complete"}
        className="h-2 overflow-hidden rounded-chip bg-surface"
      >
        <div
          className="h-full rounded-chip bg-kesar transition-[width] duration-500"
          style={{ width: `${Math.max(value, 3)}%` }}
        />
      </div>
    </div>
  );
}
