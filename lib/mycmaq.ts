import { z } from "zod";
import type { ForecastStatus } from "@/lib/types";

const BASE = "https://mycmaq.met.gov.my";
const CYCLE_PATTERN = /display_(\d{4})(\d{2})(\d{2})_(\d{2})\.html/g;
const FRAME_PATTERN = /^([A-Z0-9]+)_d0([12])_(\d{4})(\d{2})(\d{2})_(\d{2})LST\.png$/;
const PUBLIC_POLLUTANTS = new Set(["PM25", "PM10", "O3"]);

const manifestSchema = z.object({ files: z.array(z.string()) });

export type ForecastCycle = {
  cycleId: string;
  initializedAt: string;
  mapUrl: string;
};

export function extractCycles(html: string): ForecastCycle[] {
  const seen = new Map<string, ForecastCycle>();
  for (const match of html.matchAll(CYCLE_PATTERN)) {
    const [, y, mo, d, h] = match;
    const cycleId = `${y}${mo}${d}_${h}`;
    if (seen.has(cycleId)) continue;
    seen.set(cycleId, {
      cycleId,
      initializedAt: new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h))).toISOString(),
      mapUrl: `${BASE}/display_${cycleId}.html`,
    });
  }
  return [...seen.values()].sort((a, b) => b.cycleId.localeCompare(a.cycleId));
}

export function summariseManifest(files: string[]) {
  const pollutants = new Set<string>();
  let frameCount = 0;
  let lastKey = "";

  for (const file of files) {
    const match = FRAME_PATTERN.exec(file);
    if (!match) continue;
    frameCount += 1;
    const [, variable, domain, y, mo, d, h] = match;
    if (domain === "2" && PUBLIC_POLLUTANTS.has(variable)) {
      pollutants.add(variable);
      const key = `${y}${mo}${d}${h}`;
      if (key > lastKey) lastKey = key;
    }
  }

  const lastFrameLabel = lastKey
    ? `${lastKey.slice(0, 4)}-${lastKey.slice(4, 6)}-${lastKey.slice(6, 8)} ${lastKey.slice(8, 10)}:00 LST`
    : null;

  return {
    pollutants: [...pollutants].sort(),
    frameCount,
    lastFrameLabel,
  };
}

async function getText(url: string, revalidate: number): Promise<string> {
  const response = await fetch(url, {
    headers: { accept: "text/html" },
    next: revalidate === 0 ? undefined : { revalidate },
    cache: revalidate === 0 ? "no-store" : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`MyCMAQ responded ${response.status}`);
  }
  return response.text();
}

async function getJson(url: string, revalidate: number): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: revalidate === 0 ? undefined : { revalidate },
    cache: revalidate === 0 ? "no-store" : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`MyCMAQ manifest responded ${response.status}`);
  }
  return response.json();
}

export async function fetchForecastStatus(
  options: { fresh?: boolean } = {},
): Promise<ForecastStatus> {
  const revalidate = options.fresh ? 0 : 1800;
  const retrievedAt = new Date().toISOString();
  const fallback: ForecastStatus = {
    available: false,
    cycleId: null,
    initializedAt: null,
    mapUrl: BASE,
    manifestUrl: null,
    lastFrameLabel: null,
    pollutants: [],
    frameCount: null,
    retrievedAt,
  };

  try {
    const html = await getText(`${BASE}/`, revalidate);
    const cycles = extractCycles(html);
    const latest = cycles[0];
    if (!latest) return { ...fallback, error: "No forecast cycle was listed" };

    const manifestUrl = `${BASE}/${latest.cycleId}/manifest.json`;
    const status: ForecastStatus = {
      ...fallback,
      available: true,
      cycleId: latest.cycleId,
      initializedAt: latest.initializedAt,
      mapUrl: latest.mapUrl,
      manifestUrl,
    };

    try {
      const parsed = manifestSchema.safeParse(await getJson(manifestUrl, revalidate));
      if (!parsed.success) {
        return { ...status, error: "Forecast manifest had an unexpected shape" };
      }
      return { ...status, ...summariseManifest(parsed.data.files) };
    } catch (error) {
      return {
        ...status,
        error: error instanceof Error ? error.message : "Manifest unavailable",
      };
    }
  } catch (error) {
    return {
      ...fallback,
      error: error instanceof Error ? error.message : "Forecast source unavailable",
    };
  }
}
