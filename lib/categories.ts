import type { CategoryKey } from "@/lib/types";

export type CategoryDefinition = {
  key: Exclude<CategoryKey, "unavailable">;
  label: string;
  range: string;
  min: number;
  max: number;
  hex: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
};

/**
 * Malaysia's official APIMS index bands, as published on the DOE portal.
 * These are API bands — not US AQI, not PM2.5 concentration thresholds.
 */
export const CATEGORIES: CategoryDefinition[] = [
  {
    key: "good",
    label: "Good",
    range: "0–50",
    min: 0,
    max: 50,
    hex: "#087a56",
    text: "text-good",
    bg: "bg-good/10",
    border: "border-good/30",
    dot: "bg-good",
  },
  {
    key: "moderate",
    label: "Moderate",
    range: "51–100",
    min: 51,
    max: 100,
    hex: "#806000",
    text: "text-moderate",
    bg: "bg-moderate/10",
    border: "border-moderate/30",
    dot: "bg-moderate",
  },
  {
    key: "unhealthy",
    label: "Unhealthy",
    range: "101–200",
    min: 101,
    max: 200,
    hex: "#a64716",
    text: "text-unhealthy",
    bg: "bg-unhealthy/10",
    border: "border-unhealthy/30",
    dot: "bg-unhealthy",
  },
  {
    key: "very-unhealthy",
    label: "Very unhealthy",
    range: "201–300",
    min: 201,
    max: 300,
    hex: "#a92f3b",
    text: "text-very-unhealthy",
    bg: "bg-very-unhealthy/10",
    border: "border-very-unhealthy/30",
    dot: "bg-very-unhealthy",
  },
  {
    key: "hazardous",
    label: "Hazardous",
    range: "Above 300",
    min: 301,
    max: Number.POSITIVE_INFINITY,
    hex: "#773286",
    text: "text-hazardous",
    bg: "bg-hazardous/10",
    border: "border-hazardous/30",
    dot: "bg-hazardous",
  },
];

export const UNAVAILABLE_STYLE = {
  label: "Not available",
  range: "No reading",
  text: "text-muted",
  bg: "bg-white/5",
  border: "border-white/10",
  dot: "bg-muted",
  hex: "#4c657d",
} as const;

export function categoryFromApi(value: number | null | undefined): CategoryKey {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unavailable";
  return CATEGORIES.find((c) => value >= c.min && value <= c.max)?.key ?? "unavailable";
}

/** Maps the DOE class label onto our category keys. Unknown labels are ignored. */
export function categoryFromSourceClass(value: string | null | undefined): CategoryKey | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (normalized) {
    case "good":
      return "good";
    case "moderate":
      return "moderate";
    case "unhealthy":
      return "unhealthy";
    case "veryunhealthy":
      return "very-unhealthy";
    case "hazardous":
      return "hazardous";
    case "na":
    case "notavailable":
    case "unavailable":
      return "unavailable";
    default:
      return null;
  }
}

export function categoryStyle(key: CategoryKey) {
  return CATEGORIES.find((c) => c.key === key) ?? UNAVAILABLE_STYLE;
}
