import { z } from "zod";

const BASE = "https://api.openaq.org/v3";
const PM25_ID = 2;
const CACHE_SECONDS = 600;
const MAX_AGE_HOURS = 6;
const MAX_VALUE = 1000;
const REQUEST_TIMEOUT_MS = 12_000;

export type SeaStation = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  pm25: number;
  observedAt: string;
  isMonitor: boolean;
  provider: string | null;
};

type CityQuery = {
  city: string;
  country: string;
  lat: number;
  lng: number;
};

// One query per major city; OpenAQ returns nearby monitors within 25 km.
const CITIES: CityQuery[] = [
  { city: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
  { city: "Chiang Mai", country: "Thailand", lat: 18.7883, lng: 98.9853 },
  { city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456 },
  { city: "Denpasar", country: "Indonesia", lat: -8.65, lng: 115.2167 },
  { city: "Medan", country: "Indonesia", lat: 3.5952, lng: 98.6722 },
  { city: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842 },
  { city: "Cebu", country: "Philippines", lat: 10.3157, lng: 123.8854 },
  { city: "Hanoi", country: "Vietnam", lat: 21.0278, lng: 105.8342 },
  { city: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lng: 106.6297 },
  { city: "Phnom Penh", country: "Cambodia", lat: 11.5564, lng: 104.9282 },
  { city: "Vientiane", country: "Laos", lat: 17.9757, lng: 102.6331 },
  { city: "Yangon", country: "Myanmar", lat: 16.8661, lng: 96.1951 },
];

const locationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  locality: z.string().nullish(),
  country: z.object({ code: z.string(), name: z.string() }),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
  isMonitor: z.boolean().nullish(),
  datetimeLast: z.object({ utc: z.string() }).nullish(),
  sensors: z.array(
    z.object({
      id: z.number().int(),
      parameter: z.object({ id: z.number().int(), units: z.string() }),
    }),
  ),
  distance: z.number().nullish(),
  provider: z.object({ name: z.string() }).nullish(),
});

const locationsSchema = z.object({ results: z.array(locationSchema) });

const latestSchema = z.object({
  results: z.array(
    z.object({
      sensorsId: z.number().int(),
      value: z.number(),
      datetime: z.object({ utc: z.string() }),
    }),
  ),
});

async function getJson(path: string): Promise<unknown> {
  const key = process.env.OPENAQ_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: { "X-API-Key": key, accept: "application/json" },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function ageHours(iso: string | null | undefined): number {
  const parsed = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(parsed) ? (Date.now() - parsed) / 3_600_000 : Infinity;
}

async function resolveCity(query: CityQuery): Promise<SeaStation | null> {
  const search = new URLSearchParams({
    coordinates: `${query.lat},${query.lng}`,
    radius: "25000",
    limit: "10",
    parameters_id: String(PM25_ID),
  });
  const raw = await getJson(`/locations?${search.toString()}`);
  const parsed = locationsSchema.safeParse(raw);
  if (!parsed.success) return null;

  const candidates = parsed.data.results
    .map((location) => ({
      location,
      sensor: location.sensors.find(
        (item) => item.parameter.id === PM25_ID && item.parameter.units.includes("g/m"),
      ),
    }))
    .filter(
      (item) =>
        item.sensor &&
        ageHours(item.location.datetimeLast?.utc) <= MAX_AGE_HOURS,
    )
    .sort((a, b) => {
      // A fresh location timestamp is the best available signal; the PM2.5
      // sensor is still checked against the latest reading below.
      const freshness =
        Date.parse(b.location.datetimeLast?.utc ?? "") -
        Date.parse(a.location.datetimeLast?.utc ?? "");
      if (Number.isFinite(freshness) && freshness !== 0) return freshness;
      return (
        Number(Boolean(b.location.isMonitor)) - Number(Boolean(a.location.isMonitor)) ||
        (a.location.distance ?? 0) - (b.location.distance ?? 0)
      );
    });

  for (const candidate of candidates.slice(0, 3)) {
    const sensor = candidate.sensor;
    if (!sensor) continue;
    const latestRaw = await getJson(`/locations/${candidate.location.id}/latest`);
    const latest = latestSchema.safeParse(latestRaw);
    if (!latest.success) continue;
    const reading = latest.data.results.find((item) => item.sensorsId === sensor.id);
    if (!reading) continue;
    if (!(reading.value >= 0 && reading.value <= MAX_VALUE)) continue;
    if (ageHours(reading.datetime.utc) > MAX_AGE_HOURS) continue;

    const locality = candidate.location.locality?.trim();
    return {
      id: String(candidate.location.id),
      name: candidate.location.name,
      city: locality && locality !== "N/A" ? locality : query.city,
      country: candidate.location.country.name,
      lat: candidate.location.coordinates.latitude,
      lng: candidate.location.coordinates.longitude,
      pm25: reading.value,
      observedAt: new Date(reading.datetime.utc).toISOString(),
      isMonitor: Boolean(candidate.location.isMonitor),
      provider: candidate.location.provider?.name ?? null,
    };
  }

  return null;
}

// Small batches keep the free tier's 60 requests/minute limit comfortable.
export async function getSeaStations(): Promise<SeaStation[]> {
  if (!process.env.OPENAQ_API_KEY) return [];

  const stations: SeaStation[] = [];
  for (let index = 0; index < CITIES.length; index += 4) {
    const batch = CITIES.slice(index, index + 4);
    const results = await Promise.all(batch.map(resolveCity));
    for (const result of results) {
      if (result) stations.push(result);
    }
  }
  return stations.sort((a, b) => a.city.localeCompare(b.city));
}

export { CITIES as SEA_CITY_QUERIES };
