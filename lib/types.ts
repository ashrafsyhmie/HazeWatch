export type CategoryKey =
  | "good"
  | "moderate"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous"
  | "unavailable";

export type DataMode = "supabase" | "live";

export type FreshnessState = "fresh" | "delayed" | "stale" | "unavailable";

export type Freshness = {
  state: FreshnessState;
  ageMinutes: number | null;
  label: string;
};

export type SourceMeta = {
  id: string;
  name: string;
  attribution: string;
  url: string;
};

export type Station = {
  externalId: string;
  name: string;
  stateName: string;
  stateId: number;
  latitude: number;
  longitude: number;
};

export type ObservationPoint = {
  observedAt: string;
  value: number;
};

export type TrendDirection = "improving" | "stable" | "worsening" | "insufficient";

export type TrendSummary = {
  direction: TrendDirection;
  delta: number | null;
  latest: number | null;
  previous: number | null;
  comparisonHours: number;
  windowHours: number;
  peak: { value: number; observedAt: string } | null;
  points: number;
  threshold: number;
  reason: string;
};

export type StationSnapshot = Station & {
  api: number | null;
  category: CategoryKey;
  sourceClass: string | null;
  symbol: string | null;
  observedAt: string | null;
  series: ObservationPoint[];
  trend: TrendSummary;
  freshness: Freshness;
};

export type TrendInsight = {
  externalId: string;
  name: string;
  stateName: string;
  delta: number;
  latest: number;
  previous: number;
  comparisonHours: number;
};

export type NationalSummary = {
  median: number;
  mean: number;
  min: number;
  max: number;
};

export type Snapshot = {
  mode: DataMode;
  now: string;
  latestObservedAt: string | null;
  stations: StationSnapshot[];
  comparable: StationSnapshot[];
  counts: Record<CategoryKey, number>;
  national: NationalSummary | null;
  insights: TrendInsight[];
  freshness: Freshness;
  coverage: { reporting: number; total: number; comparableAt: string | null };
  sources: SourceMeta[];
  notice?: string;
};

export type MonthlyPoint = {
  month: string;
  pollutant: string;
  concentration: number | null;
  unit: string;
};

export type ForecastStatus = {
  available: boolean;
  cycleId: string | null;
  initializedAt: string | null;
  mapUrl: string;
  manifestUrl: string | null;
  lastFrameLabel: string | null;
  pollutants: string[];
  frameCount: number | null;
  retrievedAt: string;
  error?: string;
};

export type IngestSourceResult = {
  source: string;
  status: "success" | "partial" | "failed" | "skipped";
  accepted: number;
  rejected: number;
  message?: string;
};

export type IngestResult = {
  startedAt: string;
  finishedAt: string;
  results: IngestSourceResult[];
};
