import Link from "next/link";
import type { ReactNode } from "react";
import { categoryStyle } from "@/lib/categories";
import { formatSigned } from "@/lib/format";
import type { CategoryKey, Freshness, TrendDirection } from "@/lib/types";

export function CategoryBadge({
  category,
  className = "",
}: {
  category: CategoryKey;
  className?: string;
}) {
  const style = categoryStyle(category);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

const FRESHNESS_STYLES: Record<Freshness["state"], string> = {
  fresh: "border-good/25 bg-good/10 text-good",
  delayed: "border-moderate/25 bg-moderate/10 text-moderate",
  stale: "border-unhealthy/25 bg-unhealthy/10 text-unhealthy",
  unavailable: "border-line bg-white/[0.03] text-muted",
};

export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${FRESHNESS_STYLES[freshness.state]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {freshness.label}
    </span>
  );
}

export function DeltaChip({
  direction,
  delta,
  className = "",
}: {
  direction: TrendDirection;
  delta: number | null;
  className?: string;
}) {
  if (delta === null) {
    return (
      <span className={`text-[11px] text-muted ${className}`}>No comparison</span>
    );
  }
  const color =
    direction === "worsening"
      ? "text-unhealthy"
      : direction === "improving"
        ? "text-good"
        : "text-muted";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "■";

  return (
    <span
      className={`num inline-flex items-baseline gap-1 text-[11.5px] ${color} ${className}`}
    >
      <span aria-hidden="true" className="text-[11px]">
        {arrow}
      </span>
      <span>{formatSigned(delta)}</span>
      <span className="font-sans text-[11px]">
        6h
      </span>
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em] text-fog sm:text-[28px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SourceLinks({
  sources,
  compact = false,
}: {
  sources: { id: string; name: string; url: string }[];
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className={`inline-flex min-h-11 items-center gap-1 text-muted transition-colors hover:text-fog ${
            compact ? "text-[11px]" : "text-[11.5px]"
          }`}
        >
          <span
            aria-hidden="true"
            className="h-1 w-1 rounded-full bg-current opacity-60"
          />
          {source.name}
          <span aria-hidden="true" className="text-[11px] opacity-60">
            ↗
          </span>
        </a>
      ))}
    </div>
  );
}

/** Pure SVG sparkline so long station lists stay cheap to render. */
export function Sparkline({
  values,
  color = "#93a79e",
  width = 64,
  height = 20,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ModeNotice({
  notice,
  mode,
}: {
  notice?: string;
  mode: "supabase" | "live";
}) {
  if (!notice && mode === "supabase") return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-moderate/25 bg-moderate/[0.06] px-4 py-3">
      <span
        aria-hidden="true"
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-moderate"
      />
      <p className="text-[12px] leading-relaxed text-fog">
        {notice ??
          "Live preview: readings are fetched directly from APIMS and are not archived. Set up Supabase and scheduled collection to keep history."}
      </p>
    </div>
  );
}

export function QuickLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] text-fog/90 transition-colors hover:border-signal/40 hover:text-signal"
    >
      {children}
      <span aria-hidden="true" className="text-[11px]">
        →
      </span>
    </Link>
  );
}
