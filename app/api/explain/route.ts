import { getSnapshot } from "@/lib/data";
import {
  explainWithGemini,
  factsForNational,
  factsForStation,
  type Explanation,
} from "@/lib/explain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 60_000;
const LIMIT = 8;
const CACHE_TTL_MS = 10 * 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();
const cache = new Map<string, { at: number; explanation: Explanation }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many explanation requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let payload: { scope?: string; stationId?: string };
  try {
    payload = (await request.json()) as { scope?: string; stationId?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scope = payload.scope === "national" ? "national" : "station";
  try {
    const snapshot = await getSnapshot();
    let cacheKey: string;
    let facts;

    if (scope === "station") {
      const station = snapshot.stations.find(
        (item) => item.externalId === payload.stationId,
      );
      if (!station) {
        return Response.json({ error: "Station not found" }, { status: 404 });
      }
      cacheKey = `station:${station.externalId}:${station.observedAt ?? "none"}`;
      facts = factsForStation(station, snapshot);
    } else {
      cacheKey = `national:${snapshot.latestObservedAt ?? "none"}`;
      facts = factsForNational(snapshot);
    }

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return Response.json({ explanation: cached.explanation, facts, cached: true });
    }

    const explanation = await explainWithGemini(facts);
    cache.set(cacheKey, { at: Date.now(), explanation });
    return Response.json({ explanation, facts });
  } catch {
    return Response.json(
      { error: "Verified data is temporarily unavailable, so no explanation was generated." },
      { status: 503 },
    );
  }
}
