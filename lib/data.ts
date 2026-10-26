import { addHours, formatDateTime, minutesBetween } from "@/lib/format";
import { buildInsights, freshnessOf, nationalSummary, summariseTrend } from "@/lib/analysis";
import { CATEGORIES, categoryFromApi, categoryFromSourceClass } from "@/lib/categories";
import type {
  CategoryKey,
  DataMode,
  ForecastStatus,
  MonthlyPoint,
  ObservationPoint,
  Snapshot,
  SourceMeta,
  Station,
  StationSnapshot,
} from "@/lib/types";
import type { ObservationSeed } from "@/lib/apims";
import { fetchApimsBundle } from "@/lib/apims";
import { fetchForecastStatus } from "@/lib/mycmaq";
import { fetchMonthlyPollution } from "@/lib/opendosm";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const SOURCES: SourceMeta[] = [
  {
    id: "doe-apims",
    name: "Department of Environment — APIMS",
    attribution: "Air Pollutant Index of Malaysia, Department of Environment (DOE)",
    url: "https://eqms.doe.gov.my/apims/main",
  },
  {
    id: "metmalaysia-mycmaq",
    name: "MetMalaysia — MyCMAQ",
    attribution: "Operational air quality forecast, Malaysian Meteorological Department",
    url: "https://mycmaq.met.gov.my/",
  },
  {
    id: "opendosm",
    name: "OpenDOSM — Monthly Air Pollution",
    attribution: "Monthly air pollution, Department of Statistics Malaysia (CC BY 4.0)",
    url: "https://open.dosm.gov.my/data-catalogue/air_pollution",
  },
];

const LIVE_TTL_MS = 5 * 60 * 1000;
// Older than two hours means the archive missed an hourly publication.
const STORED_STALE_MINUTES = 120;

type LiveCache = {
  at: number;
  ttl: number;
  bundle: Awaited<ReturnType<typeof fetchApimsBundle>>;
};

let liveCache: LiveCache | null = null;
let livePromise: Promise<{
  bundle: Awaited<ReturnType<typeof fetchApimsBundle>>;
  notice?: string;
}> | null = null;

async function loadLiveBundle(): Promise<{
  bundle: Awaited<ReturnType<typeof fetchApimsBundle>>;
  notice?: string;
}> {
  try {
    const bundle = await fetchApimsBundle();
    // A partial bundle (some state histories failed) is retried sooner so the
    // next reader is not stuck with thin series for five minutes.
    const partial = bundle.stateErrors.length > 0;
    liveCache = {
      at: Date.now(),
      ttl: partial ? 60_000 : LIVE_TTL_MS,
      bundle,
    };
    return {
      bundle,
      notice: partial
        ? `Live preview: ${bundle.stateErrors.length} state ${
            bundle.stateErrors.length === 1 ? "history" : "histories"
          } could not be refreshed, so some stations show fewer readings. HazeWatch retries on the next request.`
        : undefined,
    };
  } catch (error) {
    if (liveCache) {
      return {
        bundle: liveCache.bundle,
        notice:
          "Live APIMS refresh failed; showing the last successful reading from this server instance.",
      };
    }
    throw error;
  }
}

async function getLiveBundle(): Promise<{
  bundle: Awaited<ReturnType<typeof fetchApimsBundle>>;
  notice?: string;
}> {
  if (liveCache && Date.now() - liveCache.at < liveCache.ttl) {
    return { bundle: liveCache.bundle };
  }
  // Metadata and the page render can ask for the snapshot at the same time.
  // Share one bundle so APIMS sees one set of requests, not two.
  if (livePromise) return livePromise;
  livePromise = loadLiveBundle().finally(() => {
    livePromise = null;
  });
  return livePromise;
}

export function assembleSnapshot(input: {
  mode: DataMode;
  stations: Station[];
  observations: ObservationSeed[];
  now: string;
  notice?: string;
}): Snapshot {
  const grouped = new Map<string, ObservationSeed[]>();
  for (const observation of input.observations) {
    const list = grouped.get(observation.externalId);
    if (list) list.push(observation);
    else grouped.set(observation.externalId, [observation]);
  }

  const stations: StationSnapshot[] = input.stations.map((station) => {
    const seeds = [...(grouped.get(station.externalId) ?? [])].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    );
    const byTime = new Map<string, ObservationSeed>();
    for (const seed of seeds) byTime.set(seed.observedAt, seed);
    const unique = [...byTime.values()].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    );

    const series: ObservationPoint[] = unique.map((seed) => ({
      observedAt: seed.observedAt,
      value: seed.api,
    }));
    const latest = unique.at(-1);
    const trend = summariseTrend(series);

    return {
      ...station,
      api: latest?.api ?? null,
      category: latest?.category ?? "unavailable",
      sourceClass: latest?.sourceClass ?? null,
      symbol: latest?.symbol ?? null,
      observedAt: latest?.observedAt ?? null,
      series,
      trend,
      freshness: freshnessOf(latest?.observedAt ?? null, input.now),
    };
  });

  const latestObservedAt =
    stations
      .map((station) => station.observedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  const comparable = latestObservedAt
    ? stations.filter((station) => station.observedAt === latestObservedAt)
    : [];

  const counts = Object.fromEntries([
    ...CATEGORIES.map((category) => [category.key, 0]),
    ["unavailable", 0],
  ]) as Record<CategoryKey, number>;
  for (const station of comparable) counts[station.category] += 1;

  return {
    mode: input.mode,
    now: input.now,
    latestObservedAt,
    stations,
    comparable,
    counts,
    national: nationalSummary(
      comparable
        .map((station) => station.api)
        .filter((value): value is number => value !== null),
    ),
    insights: buildInsights(stations),
    freshness: freshnessOf(latestObservedAt, input.now),
    coverage: {
      reporting: comparable.length,
      total: stations.length,
      comparableAt: latestObservedAt,
    },
    sources: SOURCES,
    notice: input.notice,
  };
}

type LocationRow = {
  id: string;
  external_id: string;
  name: string;
  state_name: string | null;
  state_id: number | null;
  latitude: number;
  longitude: number;
};

type ObservationRow = {
  location_id: string;
  observed_at: string;
  value: number;
  source_class: string | null;
  source_symbol: string | null;
};

async function loadStoredBundle(): Promise<{
  stations: Station[];
  observations: ObservationSeed[];
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: locations, error: locationError } = await supabase
    .from("locations")
    .select("id, external_id, name, state_name, state_id, latitude, longitude")
    .eq("source_id", "doe-apims")
    .order("name");
  if (locationError) throw new Error(locationError.message);

  const rows = (locations ?? []) as LocationRow[];
  if (rows.length === 0) return { stations: [], observations: [] };

  const since = addHours(new Date().toISOString(), -36);
  // PostgREST caps a response at 1000 rows, so page through the window.
  const observations: ObservationRow[] = [];
  const PAGE = 1000;
  for (let from = 0; from < PAGE * 5; from += PAGE) {
    const { data, error } = await supabase
      .from("observations")
      .select("location_id, observed_at, value, source_class, source_symbol")
      .eq("metric", "api")
      .gte("observed_at", since)
      .order("observed_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as ObservationRow[];
    observations.push(...page);
    if (page.length < PAGE) break;
  }

  const stationByLocation = new Map<string, Station>();
  const stations: Station[] = rows.map((row) => {
    const station: Station = {
      externalId: row.external_id,
      name: row.name,
      stateName: row.state_name ?? "Malaysia",
      stateId: row.state_id ?? 0,
      latitude: row.latitude,
      longitude: row.longitude,
    };
    stationByLocation.set(row.id, station);
    return station;
  });

  const seeds: ObservationSeed[] = [];
  for (const row of observations) {
    const station = stationByLocation.get(row.location_id);
    if (!station) continue;
    seeds.push({
      externalId: station.externalId,
      observedAt: row.observed_at,
      api: row.value,
      category:
        categoryFromSourceClass(row.source_class) ?? categoryFromApi(row.value),
      sourceClass: row.source_class,
      symbol: row.source_symbol,
    });
  }

  return { stations, observations: seeds };
}

export async function getSnapshot(): Promise<Snapshot> {
  const now = new Date().toISOString();
  let notice: string | undefined;
  let storedSnapshot: Snapshot | null = null;

  if (isSupabaseConfigured()) {
    try {
      const stored = await loadStoredBundle();
      if (stored.observations.length > 0) {
        storedSnapshot = assembleSnapshot({
          mode: "supabase",
          stations: stored.stations,
          observations: stored.observations,
          now,
        });
        const latest = storedSnapshot.latestObservedAt;
        // The archive must not pass an old hour off as the current one.
        if (latest && minutesBetween(latest, now) <= STORED_STALE_MINUTES) {
          return storedSnapshot;
        }
        notice = latest
          ? `The archive's newest reading is ${formatDateTime(latest)} MYT. Showing live APIMS readings instead.`
          : undefined;
      } else {
        notice =
          "No stored observations yet. Showing live APIMS readings without persistence — run collection to start the archive.";
      }
    } catch {
      notice =
        "Stored data is unavailable right now. Showing live APIMS readings instead; nothing is being saved.";
    }
  }

  try {
    const live = await getLiveBundle();
    return assembleSnapshot({
      mode: "live",
      stations: live.bundle.stations,
      observations: live.bundle.observations,
      now,
      notice: notice ?? live.notice,
    });
  } catch (error) {
    if (!storedSnapshot) throw error;
    return {
      ...storedSnapshot,
      notice: `Live APIMS is unavailable. Showing the archive's newest reading from ${formatDateTime(
        storedSnapshot.latestObservedAt ?? now,
      )} MYT.`,
    };
  }
}

export async function getStation(externalId: string): Promise<{
  snapshot: Snapshot;
  station: StationSnapshot | null;
}> {
  const snapshot = await getSnapshot();
  return {
    snapshot,
    station:
      snapshot.stations.find((station) => station.externalId === externalId) ?? null,
  };
}

export async function getMonthlyHistory(): Promise<{
  mode: DataMode;
  points: MonthlyPoint[];
  notice?: string;
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase
          .from("monthly_air_pollution")
          .select("month, pollutant, concentration, unit")
          .order("month", { ascending: true });
        if (error) throw new Error(error.message);
        if (data && data.length > 0) {
          return {
            mode: "supabase",
            points: data as MonthlyPoint[],
          };
        }
      }
    } catch {
      // Fall through to the live source.
    }
  }

  try {
    const points = await fetchMonthlyPollution();
    return {
      mode: "live",
      points: points.map((point) => ({
        month: point.month,
        pollutant: point.pollutant,
        concentration: point.concentration,
        unit: point.unit,
      })),
    };
  } catch {
    return {
      mode: "live",
      points: [],
      notice: "OpenDOSM could not be reached. Historical context is temporarily unavailable.",
    };
  }
}

type ForecastRow = {
  external_cycle_id: string;
  initialized_at: string | null;
  retrieved_at: string;
  source_url: string;
  meta: unknown;
};

function metaOf(meta: unknown): {
  pollutants?: string[];
  frameCount?: number | null;
  lastFrameLabel?: string | null;
  manifestUrl?: string | null;
  error?: string;
} {
  const value = (typeof meta === "object" && meta !== null ? meta : {}) as Record<
    string,
    unknown
  >;
  return {
    pollutants: Array.isArray(value.pollutants)
      ? value.pollutants.filter((item): item is string => typeof item === "string")
      : undefined,
    frameCount: typeof value.frameCount === "number" ? value.frameCount : null,
    lastFrameLabel:
      typeof value.lastFrameLabel === "string" ? value.lastFrameLabel : null,
    manifestUrl: typeof value.manifestUrl === "string" ? value.manifestUrl : null,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

export async function getForecastStatus(): Promise<ForecastStatus> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data } = await supabase
          .from("forecast_runs")
          .select("external_cycle_id, initialized_at, retrieved_at, source_url, meta")
          .eq("source_id", "metmalaysia-mycmaq")
          .order("initialized_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          const row = data as ForecastRow;
          const meta = metaOf(row.meta);
          return {
            available: true,
            cycleId: row.external_cycle_id,
            initializedAt: row.initialized_at,
            mapUrl: row.source_url,
            manifestUrl: meta.manifestUrl ?? null,
            lastFrameLabel: meta.lastFrameLabel ?? null,
            pollutants: meta.pollutants ?? [],
            frameCount: meta.frameCount ?? null,
            retrievedAt: row.retrieved_at,
            error: meta.error,
          };
        }
      }
    } catch {
      // Fall through to the live source.
    }
  }
  return fetchForecastStatus();
}

export type IngestionRun = {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  accepted: number;
  rejected: number;
  error: string | null;
};

export async function getIngestionRuns(limit = 5): Promise<IngestionRun[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("ingestion_runs")
    .select("id, source_id, started_at, finished_at, status, accepted, rejected, error")
    .order("started_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Record<string, string | number | null>[]).map((row) => ({
    id: String(row.id),
    sourceId: String(row.source_id),
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    status: String(row.status),
    accepted: Number(row.accepted ?? 0),
    rejected: Number(row.rejected ?? 0),
    error: row.error ? String(row.error) : null,
  }));
}
