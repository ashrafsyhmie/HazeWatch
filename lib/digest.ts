import { z } from "zod";
import { categoryFromApi, categoryStyle } from "@/lib/categories";
import { extractText, outputRespectsFacts } from "@/lib/explain";
import { formatDay } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase";

const MYT_OFFSET_MS = 8 * 3600_000;

export type DigestStation = { id: string; name: string; state: string };
export type DigestObservation = {
  locationId: string;
  observedAt: string;
  value: number;
};

export type DigestReading = {
  name: string;
  state: string;
  api: number;
  atMYT: string;
};

export type DigestMover = {
  name: string;
  state: string;
  from: number;
  to: number;
  delta: number;
};

export type DigestFacts = {
  day: string;
  hoursCollected: number;
  hoursExpected: number;
  stationsReporting: number;
  stationsTotal: number;
  peakMedian: { api: number; hour: string } | null;
  categoriesAtPeak: { category: string; count: number }[];
  highest: DigestReading | null;
  lowest: DigestReading | null;
  movers: DigestMover[];
};

export type DigestSummary = {
  headline: string;
  summary: string;
};

export type DailyDigest = {
  day: string;
  generatedAt: string;
  source: "gemini" | "rules";
  model: string | null;
  facts: DigestFacts;
  summary: DigestSummary;
};

/** The Malaysia calendar day that just closed, as YYYY-MM-DD. */
export function previousDay(now: Date): string {
  const myt = new Date(now.getTime() + MYT_OFFSET_MS);
  const previous = new Date(
    Date.UTC(myt.getUTCFullYear(), myt.getUTCMonth(), myt.getUTCDate()) - 86_400_000,
  );
  return previous.toISOString().slice(0, 10);
}

function localHour(iso: string): number {
  return new Date(new Date(iso).getTime() + MYT_OFFSET_MS).getUTCHours();
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Pure facts pass. Gemini never calculates anything: every number in the
 * summary comes from here, computed from stored observations only.
 */
export function buildDigestFacts(input: {
  day: string;
  stations: DigestStation[];
  observations: DigestObservation[];
}): DigestFacts {
  const stationById = new Map(input.stations.map((station) => [station.id, station]));
  const byStation = new Map<string, DigestObservation[]>();
  const byHour = new Map<number, number[]>();

  for (const observation of input.observations) {
    if (!stationById.has(observation.locationId)) continue;
    if (!Number.isFinite(observation.value)) continue;
    const list = byStation.get(observation.locationId) ?? [];
    list.push(observation);
    byStation.set(observation.locationId, list);
    const hour = localHour(observation.observedAt);
    const values = byHour.get(hour) ?? [];
    values.push(observation.value);
    byHour.set(hour, values);
  }

  let highest: DigestReading | null = null;
  let lowest: DigestReading | null = null;
  const movers: DigestMover[] = [];

  for (const [locationId, list] of byStation) {
    const station = stationById.get(locationId);
    if (!station) continue;
    const sorted = [...list].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    );
    for (const observation of sorted) {
      const reading: DigestReading = {
        name: station.name,
        state: station.state,
        api: Math.round(observation.value),
        atMYT: hourLabel(localHour(observation.observedAt)),
      };
      if (!highest || reading.api > highest.api) highest = reading;
      if (!lowest || reading.api < lowest.api) lowest = reading;
    }
    if (sorted.length >= 2) {
      const first = Math.round(sorted[0].value);
      const last = Math.round(sorted[sorted.length - 1].value);
      if (first !== last) {
        movers.push({
          name: station.name,
          state: station.state,
          from: first,
          to: last,
          delta: last - first,
        });
      }
    }
  }

  let peakMedian: DigestFacts["peakMedian"] = null;
  let peakHour: number | null = null;
  for (const [hour, values] of [...byHour].sort((a, b) => a[0] - b[0])) {
    const value = Math.round(median(values));
    if (!peakMedian || value > peakMedian.api) {
      peakMedian = { api: value, hour: hourLabel(hour) };
      peakHour = hour;
    }
  }
  let categoriesAtPeak: DigestFacts["categoriesAtPeak"] = [];
  if (peakHour !== null) {
    const counts = new Map<string, number>();
    for (const value of byHour.get(peakHour) ?? []) {
      const label = categoryStyle(categoryFromApi(value)).label;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    categoriesAtPeak = [...counts]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    day: input.day,
    hoursCollected: byHour.size,
    hoursExpected: 24,
    stationsReporting: byStation.size,
    stationsTotal: input.stations.length,
    peakMedian,
    categoriesAtPeak,
    highest,
    lowest,
    movers: movers
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3),
  };
}

/** Deterministic text, used when Gemini is missing, slow or off-script. */
export function fallbackDigest(facts: DigestFacts): DigestSummary {
  const peak = facts.peakMedian;
  const coverage =
    facts.hoursCollected < 20
      ? `Only ${facts.hoursCollected} of 24 hours were collected; the day's data is incomplete.`
      : `${facts.hoursCollected} of 24 hours were collected.`;

  const pieces: string[] = [];
  if (peak) {
    const mix = facts.categoriesAtPeak
      .map((item) => `${item.count} ${item.category.toLowerCase()}`)
      .join(", ");
    pieces.push(
      `At ${peak.hour} MYT, the national median API reached its daily high of ${peak.api}${
        mix ? `. Stations reporting then included ${mix}` : ""
      }.`,
    );
  } else {
    pieces.push("No comparable readings were stored for this day.");
  }
  if (facts.highest) {
    pieces.push(
      `The highest single reading was ${facts.highest.api} at ${facts.highest.name} in ${facts.highest.state}.`,
    );
  }
  pieces.push(coverage);
  if (facts.movers[0]) {
    const mover = facts.movers[0];
    pieces.push(
      `The largest change was ${mover.delta > 0 ? "a rise" : "a fall"} of ${Math.abs(
        mover.delta,
      )} points at ${mover.name} (${mover.from} → ${mover.to}).`,
    );
  }

  return {
    headline: `Malaysia API summary for ${formatDay(facts.day)}`,
    summary: pieces.join(" "),
  };
}

const outputSchema = z.object({
  headline: z.string().min(8).max(100),
  summary: z.string().min(40).max(700),
});

const RESPONSE_FORMAT = {
  type: "text",
  mime_type: "application/json",
  schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description:
          "Short factual headline without the date. Maximum 90 characters.",
      },
      summary: {
        type: "string",
        description:
          "Two to four plain sentences about the supplied day. Maximum 600 characters.",
      },
    },
    required: ["headline", "summary"],
  },
} as const;

const SYSTEM_PROMPT = `You write a short daily briefing about observed Malaysian air quality for the public.

Hard rules:
- Use ONLY the numbers, places and classifications in the FACTS JSON. Never introduce a new number.
- Do not forecast, project, estimate, or explain causes. Never mention haze sources, burning, wind or transport.
- Do not give health advice and do not claim an official warning.
- The date is shown beside the summary. Do not repeat it in the headline or paragraph, and never write "today" or "yesterday".
- Copy quantities and times exactly as supplied. Write every number in digits; never spell out a number or replace a time with words such as "midnight".
- If hoursCollected is under 20, say the day is incomplete.
- If all 24 hours were collected, omit coverage from the paragraph because it is shown separately.
- Write one direct paragraph of two to four sentences. No introduction or conclusion.
- Use past tense because the day has ended.
- Use active voice and plain verbs. Stations reported data and recorded readings. Do not use metaphors, dramatic fragments, rhetorical questions, generic praise, or phrases such as "it is worth noting", "overall", "the key point", "not just", or "underscores".
- Describe highest, lowest and peak readings as recorded values, not movement. Do not write "rose", "fell", "climbed", "dropped" or "reached" unless the facts give a from-and-to change.
- Times in fields named atMYT are Malaysia time. If used, append "MYT".
- Category counts are station counts. Write "stations", not "categories".
- If a station name already includes its state, do not repeat the state.
- Do not call stations "expected". Say how many reported.
- Do not repeat the same fact in the headline and paragraph.
- Keep the tone calm, factual and non-alarmist.`;

const SPELLED_NUMBER =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:-[a-z]+)?\b/i;

async function writeWithGemini(
  facts: DigestFacts,
): Promise<{ summary: DigestSummary; model: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const configuredModel = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const models = [...new Set([configuredModel, "gemini-3.5-flash-lite"])];
  const withoutRepeatedState = (reading: DigestReading | null) =>
    reading && reading.name.toLowerCase().includes(reading.state.toLowerCase())
      ? { name: reading.name, api: reading.api, atMYT: reading.atMYT }
      : reading;
  const promptFacts = {
    day: facts.day,
    peakMedian: facts.peakMedian,
    categoriesAtPeak: facts.categoriesAtPeak,
    highest: withoutRepeatedState(facts.highest),
    lowest: withoutRepeatedState(facts.lowest),
    movers: facts.movers,
    ...(facts.hoursCollected < 20
      ? {
          hoursCollected: facts.hoursCollected,
          hoursExpected: facts.hoursExpected,
          stationsReporting: facts.stationsReporting,
        }
      : {}),
  };

  for (const [index, model] of models.entries()) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            model,
            store: false,
            input: `${SYSTEM_PROMPT}\n\nFACTS:\n${JSON.stringify(promptFacts)}`,
            response_format: RESPONSE_FORMAT,
          }),
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (!response.ok) {
        console.warn("digest: Gemini returned", response.status, model);
        if (index < models.length - 1 && [429, 503].includes(response.status)) {
          continue;
        }
        return null;
      }

      const text = extractText(await response.json());
      if (!text) {
        console.warn("digest: Gemini returned no text");
        return null;
      }

      const parsed = outputSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        console.warn("digest: Gemini output failed schema", parsed.error.issues);
        return null;
      }

      const joined = [parsed.data.headline, parsed.data.summary].join(" ");
      if (SPELLED_NUMBER.test(joined)) {
        console.warn("digest: Gemini spelled out a number");
        return null;
      }
      if (!outputRespectsFacts(joined, facts)) {
        console.warn(
          "digest: Gemini introduced a number",
          JSON.stringify(parsed.data),
        );
        return null;
      }

      return { summary: parsed.data, model };
    } catch (error) {
      console.warn(
        "digest: Gemini call failed",
        model,
        error instanceof Error ? error.message : error,
      );
      if (index === models.length - 1) return null;
    }
  }

  return null;
}

async function loadDay(day: string): Promise<{
  stations: DigestStation[];
  observations: DigestObservation[];
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: locations, error: locationError } = await supabase
    .from("locations")
    .select("id, name, state_name")
    .eq("source_id", "doe-apims");
  if (locationError) throw new Error(locationError.message);

  const start = new Date(`${day}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 86_400_000);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid day");

  const rows: { location_id: string; observed_at: string; value: number }[] = [];
  const PAGE = 1000;
  for (let from = 0; from < PAGE * 5; from += PAGE) {
    const { data, error } = await supabase
      .from("observations")
      .select("location_id, observed_at, value")
      .eq("metric", "api")
      .gte("observed_at", start.toISOString())
      .lt("observed_at", end.toISOString())
      .order("observed_at", { ascending: true })
      // Ties are common (every station shares an hour); the second key keeps
      // pagination stable so no reading is skipped or duplicated.
      .order("location_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as typeof rows;
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  return {
    stations: ((locations ?? []) as {
      id: string;
      name: string;
      state_name: string | null;
    }[]).map((row) => ({
      id: row.id,
      name: row.name,
      state: row.state_name ?? "Malaysia",
    })),
    observations: rows.map((row) => ({
      locationId: row.location_id,
      observedAt: row.observed_at,
      value: row.value,
    })),
  };
}

/** Builds and stores one digest. Requires the service-role key. */
export async function generateDailyDigest(day?: string): Promise<DailyDigest> {
  const target = day ?? previousDay(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) {
    throw new Error("Day must be YYYY-MM-DD");
  }
  const start = new Date(`${target}T00:00:00+08:00`);
  if (
    Number.isNaN(start.getTime()) ||
    new Date(start.getTime() + MYT_OFFSET_MS).toISOString().slice(0, 10) !== target
  ) {
    throw new Error("Day must be a real date");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { stations, observations } = await loadDay(target);
  if (observations.length === 0) {
    throw new Error(`No stored observations for ${target}`);
  }

  const facts = buildDigestFacts({ day: target, stations, observations });
  const fallback = fallbackDigest(facts);
  const generated = await writeWithGemini(facts);
  const summary = generated?.summary ?? fallback;
  const source: DailyDigest["source"] = generated ? "gemini" : "rules";
  const model = generated?.model ?? null;
  const generatedAt = new Date().toISOString();

  const { error } = await supabase.from("daily_digests").upsert(
    {
      day: target,
      generated_at: generatedAt,
      source,
      model,
      facts,
      summary,
    },
    { onConflict: "day" },
  );
  if (error) throw new Error(error.message);

  return { day: target, generatedAt, source, model, facts, summary };
}

/** Latest stored digest. Missing table or credentials simply hide the card. */
export async function getLatestDigest(): Promise<DailyDigest | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("daily_digests")
    .select("day, generated_at, source, model, facts, summary")
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  return {
    day: data.day,
    generatedAt: data.generated_at,
    source: data.source,
    model: data.model,
    facts: data.facts as DigestFacts,
    summary: data.summary as DigestSummary,
  };
}
