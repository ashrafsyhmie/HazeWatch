import { z } from "zod";
import { categoryFromApi, categoryFromSourceClass } from "@/lib/categories";
import { parseMalaysiaWallClock, toMalaysiaQueryParam } from "@/lib/format";
import type { CategoryKey, Station } from "@/lib/types";

const BASE = "https://eqms.doe.gov.my/api3/publicportalapims";
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 750;
const STATE_HISTORY_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ObservationSeed = {
  externalId: string;
  observedAt: string;
  api: number;
  category: CategoryKey;
  sourceClass: string | null;
  symbol: string | null;
};

export type ApimsBundle = {
  stations: Station[];
  observations: ObservationSeed[];
  rejected: number;
  stateErrors: string[];
  retrievedAt: string;
};

const numeric = z.union([z.number(), z.string(), z.null()]).optional();

const stationRowSchema = z.object({
  STATION_ID: z.string().min(1),
  STATION_LOCATION: z.string().min(1),
  STATE_ID: z.coerce.number().int(),
  STATE_NAME: z.string().nullish(),
  LATITUDE: z.coerce.number(),
  LONGITUDE: z.coerce.number(),
  API: numeric,
  CLASS: z.string().nullish(),
  PARAM_SYMBOL: z.string().nullish(),
  RECORD_DT: z.string().min(10),
  STATION_STATUS: z.coerce.number().optional(),
});

const hourlyRowSchema = z.object({
  STATION_ID: z.string().min(1),
  STATE_ID: z.coerce.number().int(),
  STATION_LOCATION: z.string().min(1),
  LATITUDE: z.coerce.number(),
  LONGITUDE: z.coerce.number(),
  DATETIME: z.string().min(10),
  API: numeric,
  PARAM_SYMBOL: z.string().nullish(),
});

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isPeninsularOrBorneo(lat: number, lng: number): boolean {
  // Malaysia spans roughly 0.8–7.4 N and 99.6–119.3 E.
  return lat >= 0.5 && lat <= 7.8 && lng >= 99 && lng <= 119.5;
}

async function getJson(path: string): Promise<unknown> {
  const url = `${BASE}/${path}${path.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }

    if (response.status === 429 || response.status === 503) {
      lastError = new Error(
        `APIMS responded ${response.status} for ${path.split("?")[0]}`,
      );
      if (attempt < 2) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw lastError;
    }
    if (!response.ok) {
      throw new Error(`APIMS responded ${response.status} for ${path.split("?")[0]}`);
    }
    return response.json();
  }

  throw lastError ?? new Error(`APIMS request failed for ${path.split("?")[0]}`);
}

export function parseStationPayload(
  payload: unknown,
): { stations: Station[]; rejected: number } {
  const wrapped = z.object({ data: z.unknown() }).safeParse(payload);
  const rows = wrapped.success ? wrapped.data.data : payload;
  if (!Array.isArray(rows)) {
    throw new Error("APIMS station payload was not an array");
  }

  const stations = new Map<string, Station>();
  let rejected = 0;

  for (const raw of rows) {
    const parsed = stationRowSchema.safeParse(raw);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }
    const row = parsed.data;
    if (row.STATION_STATUS !== undefined && row.STATION_STATUS !== 1) {
      rejected += 1;
      continue;
    }
    if (!isPeninsularOrBorneo(row.LATITUDE, row.LONGITUDE)) {
      rejected += 1;
      continue;
    }
    stations.set(row.STATION_ID, {
      externalId: row.STATION_ID,
      name: row.STATION_LOCATION,
      stateName: row.STATE_NAME ?? "Malaysia",
      stateId: row.STATE_ID,
      latitude: row.LATITUDE,
      longitude: row.LONGITUDE,
    });
  }

  return { stations: [...stations.values()], rejected };
}

export function parseStationObservations(
  payload: unknown,
): { observations: ObservationSeed[]; rejected: number } {
  const wrapped = z.object({ data: z.unknown() }).safeParse(payload);
  const rows = wrapped.success ? wrapped.data.data : payload;
  if (!Array.isArray(rows)) {
    throw new Error("APIMS station payload was not an array");
  }

  const observations: ObservationSeed[] = [];
  let rejected = 0;

  for (const raw of rows) {
    const parsed = stationRowSchema.safeParse(raw);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }
    const row = parsed.data;
    const api = toNumber(row.API);
    const observedAt = parseMalaysiaWallClock(row.RECORD_DT);
    // APIMS has no documented missing-value sentinel. A non-positive index is
    // implausible ambient air, so treat it as missing rather than clean air.
    if (api === null || api <= 0 || observedAt === null) {
      rejected += 1;
      continue;
    }
    if (!isPeninsularOrBorneo(row.LATITUDE, row.LONGITUDE)) {
      rejected += 1;
      continue;
    }
    observations.push({
      externalId: row.STATION_ID,
      observedAt,
      api,
      category:
        categoryFromSourceClass(row.CLASS) ?? categoryFromApi(api),
      sourceClass: row.CLASS ?? null,
      symbol: row.PARAM_SYMBOL ?? null,
    });
  }

  return { observations, rejected };
}

export function parseHourlyPayload(
  payload: unknown,
): { observations: ObservationSeed[]; rejected: number } {
  const wrapped = z.object({ api_table_hourly: z.unknown() }).safeParse(payload);
  const rows = wrapped.success ? wrapped.data.api_table_hourly : null;
  if (!Array.isArray(rows)) {
    throw new Error("APIMS hourly payload was not an array");
  }

  const observations: ObservationSeed[] = [];
  let rejected = 0;

  for (const raw of rows) {
    const parsed = hourlyRowSchema.safeParse(raw);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }
    const row = parsed.data;
    const api = toNumber(row.API);
    const observedAt = parseMalaysiaWallClock(row.DATETIME);
    if (api === null || api <= 0 || observedAt === null) {
      rejected += 1;
      continue;
    }
    observations.push({
      externalId: row.STATION_ID,
      observedAt,
      api,
      category: categoryFromApi(api),
      sourceClass: null,
      symbol: row.PARAM_SYMBOL ?? null,
    });
  }

  return { observations, rejected };
}

export async function fetchStations(): Promise<{
  stations: Station[];
  observations: ObservationSeed[];
  rejected: number;
}> {
  const payload = await getJson("mapcaqm");
  const { stations, rejected } = parseStationPayload(payload);
  const { observations, rejected: rejectedReadings } = parseStationObservations(payload);
  return { stations, observations, rejected: rejected + rejectedReadings };
}

export async function fetchStateHistory(
  stateId: number,
  latestObservedAt: string,
): Promise<{ observations: ObservationSeed[]; rejected: number }> {
  const datetime = toMalaysiaQueryParam(latestObservedAt);
  const payload = await getJson(
    `apitablehourly?stateid=${stateId}&datetime=${encodeURIComponent(datetime)}&`,
  );
  return parseHourlyPayload(payload);
}

/**
 * Fetch current readings plus the recent hourly window for every state.
 * APIMS exposes history per state, so this is the only way to assemble an
 * all-station series. Requests are sequential to stay gentle on the source.
 */
export async function fetchApimsBundle(): Promise<ApimsBundle> {
  const current = await fetchStations();
  if (current.stations.length === 0) {
    throw new Error("APIMS returned no usable stations");
  }

  const stateIds = [...new Set(current.stations.map((s) => s.stateId))].sort(
    (a, b) => a - b,
  );
  const latest = current.observations
    .map((o) => o.observedAt)
    .sort()
    .at(-1);
  if (!latest) {
    throw new Error("APIMS returned no usable current readings");
  }

  const merged = new Map<string, ObservationSeed>();
  const key = (o: ObservationSeed) => `${o.externalId}|${o.observedAt}`;
  for (const observation of current.observations) {
    merged.set(key(observation), observation);
  }

  let rejected = current.rejected;
  const stateErrors: string[] = [];

  for (const [index, stateId] of stateIds.entries()) {
    // APIMS rate-limits bursts (HTTP 429); space state requests out.
    if (index > 0) await sleep(STATE_HISTORY_DELAY_MS);
    try {
      const history = await fetchStateHistory(stateId, latest);
      rejected += history.rejected;
      for (const observation of history.observations) {
        const existing = merged.get(key(observation));
        if (existing) {
          // Keep the richer current-payload metadata (class label, symbol).
          if (!existing.symbol && observation.symbol) {
            existing.symbol = observation.symbol;
          }
          continue;
        }
        merged.set(key(observation), observation);
      }
    } catch (error) {
      stateErrors.push(
        `state ${stateId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  const knownStations = new Set(current.stations.map((s) => s.externalId));
  const observations = [...merged.values()].filter((o) =>
    knownStations.has(o.externalId),
  );

  return {
    stations: current.stations,
    observations,
    rejected,
    stateErrors,
    retrievedAt: new Date().toISOString(),
  };
}
