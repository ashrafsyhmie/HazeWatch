import { addHours, minutesBetween } from "@/lib/format";
import type {
  Freshness,
  ObservationPoint,
  StationSnapshot,
  TrendInsight,
  TrendSummary,
} from "@/lib/types";

export const TREND_WINDOW_HOURS = 24;
export const TREND_COMPARISON_HOURS = 6;
export const TREND_THRESHOLD = 10;
const COMPARISON_TOLERANCE_MINUTES = 90;

export type TrendOptions = {
  windowHours?: number;
  comparisonHours?: number;
  threshold?: number;
};

function sortedPoints(points: ObservationPoint[]): ObservationPoint[] {
  const byTime = new Map<string, ObservationPoint>();
  for (const point of points) {
    if (!Number.isFinite(point.value)) continue;
    byTime.set(point.observedAt, point);
  }
  return [...byTime.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

/**
 * Deterministic, explainable trend rule:
 * compare the latest reading with the reading ~6 hours earlier.
 * A change of at least ±10 API points is a trend; anything smaller is stable.
 * If there is no reading close to the 6-hour mark, report insufficient history.
 */
export function summariseTrend(
  input: ObservationPoint[],
  options: TrendOptions = {},
): TrendSummary {
  const windowHours = options.windowHours ?? TREND_WINDOW_HOURS;
  const comparisonHours = options.comparisonHours ?? TREND_COMPARISON_HOURS;
  const threshold = options.threshold ?? TREND_THRESHOLD;
  const points = sortedPoints(input);
  const base: TrendSummary = {
    direction: "insufficient",
    delta: null,
    latest: null,
    previous: null,
    comparisonHours,
    windowHours,
    peak: null,
    points: points.length,
    threshold,
    reason: "No hourly readings are available for this station.",
  };

  const latest = points.at(-1);
  if (!latest) return base;

  const windowStart = addHours(latest.observedAt, -windowHours);
  const windowed = points.filter((p) => p.observedAt >= windowStart);
  const peak = windowed.reduce<ObservationPoint | null>(
    (best, point) => (!best || point.value > best.value ? point : best),
    null,
  );

  const target = addHours(latest.observedAt, -comparisonHours);
  let previous: ObservationPoint | null = null;
  let closest = Number.POSITIVE_INFINITY;
  for (const point of points) {
    if (point.observedAt >= latest.observedAt) continue;
    const distance = Math.abs(minutesBetween(target, point.observedAt));
    if (distance < closest) {
      closest = distance;
      previous = point;
    }
  }

  const enriched: TrendSummary = {
    ...base,
    latest: latest.value,
    peak: peak ? { value: peak.value, observedAt: peak.observedAt } : null,
  };

  if (!previous || closest > COMPARISON_TOLERANCE_MINUTES) {
    return {
      ...enriched,
      reason: `Not enough hourly history to compare the last ${comparisonHours} hours.`,
    };
  }

  const delta = Math.round((latest.value - previous.value) * 10) / 10;
  const direction =
    delta >= threshold ? "worsening" : delta <= -threshold ? "improving" : "stable";
  const movement =
    direction === "worsening"
      ? `API rose ${Math.abs(delta)} points`
      : direction === "improving"
        ? `API fell ${Math.abs(delta)} points`
        : `API changed ${Math.abs(delta)} points`;

  return {
    ...enriched,
    direction,
    delta,
    previous: previous.value,
    reason: `${movement} over the last ${comparisonHours} hours (${previous.value} → ${latest.value}). Our stable band is ±${threshold} points.`,
  };
}

export function freshnessOf(observedAt: string | null, now: string): Freshness {
  if (!observedAt) {
    return { state: "unavailable", ageMinutes: null, label: "No observation" };
  }
  const ageMinutes = Math.max(0, minutesBetween(observedAt, now));
  if (ageMinutes <= 120) {
    return { state: "fresh", ageMinutes, label: "Current" };
  }
  if (ageMinutes <= 360) {
    return { state: "delayed", ageMinutes, label: "Delayed" };
  }
  return { state: "stale", ageMinutes, label: "Stale" };
}

export function buildInsights(stations: StationSnapshot[], limit = 6): TrendInsight[] {
  return stations
    .filter(
      (station) =>
        station.trend.direction === "worsening" &&
        station.trend.delta !== null &&
        station.trend.latest !== null &&
        station.trend.previous !== null,
    )
    .sort((a, b) => (b.trend.delta ?? 0) - (a.trend.delta ?? 0))
    .slice(0, limit)
    .map((station) => ({
      externalId: station.externalId,
      name: station.name,
      stateName: station.stateName,
      delta: station.trend.delta as number,
      latest: station.trend.latest as number,
      previous: station.trend.previous as number,
      comparisonHours: station.trend.comparisonHours,
    }));
}

export function nationalSummary(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    median: Math.round(median * 10) / 10,
    mean: Math.round((total / sorted.length) * 10) / 10,
    min: sorted[0],
    max: sorted.at(-1) as number,
  };
}
