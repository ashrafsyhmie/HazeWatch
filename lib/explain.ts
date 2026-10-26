import { z } from "zod";
import { categoryStyle } from "@/lib/categories";
import { formatDateTime, formatTime } from "@/lib/format";
import type { CategoryKey, Snapshot, StationSnapshot } from "@/lib/types";

export type ExplanationFacts = {
  scope: "station" | "national";
  generatedAt: string;
  station: {
    name: string;
    state: string;
    api: number | null;
    category: string;
    observedAt: string | null;
    freshness: string;
  } | null;
  trend: {
    direction: string;
    delta: number | null;
    comparisonHours: number;
    windowHours: number;
    threshold: number;
    peakValue: number | null;
    peakAt: string | null;
  } | null;
  national: {
    reporting: number;
    total: number;
    latestHour: string | null;
    counts: { category: string; count: number }[];
    median: number | null;
    highest: { name: string; api: number } | null;
  } | null;
  forecast: {
    note: string;
  };
};

export type Explanation = {
  source: "gemini" | "rules";
  headline: string;
  summary: string;
  trendNote: string;
  precautions: string[];
  model?: string;
  note?: string;
};

export function factsForStation(
  station: StationSnapshot,
  snapshot: Snapshot,
): ExplanationFacts {
  const highest = snapshot.comparable.reduce<StationSnapshot | null>(
    (best, item) =>
      item.api !== null && (!best || (best.api ?? -1) < item.api) ? item : best,
    null,
  );
  return {
    scope: "station",
    generatedAt: snapshot.now,
    station: {
      name: station.name,
      state: station.stateName,
      api: station.api,
      category: categoryStyle(station.category).label,
      observedAt: station.observedAt,
      freshness: station.freshness.label,
    },
    trend: {
      direction: station.trend.direction,
      delta: station.trend.delta,
      comparisonHours: station.trend.comparisonHours,
      windowHours: station.trend.windowHours,
      threshold: station.trend.threshold,
      peakValue: station.trend.peak?.value ?? null,
      peakAt: station.trend.peak?.observedAt ?? null,
    },
    national: {
      reporting: snapshot.coverage.reporting,
      total: snapshot.coverage.total,
      latestHour: snapshot.latestObservedAt,
      counts: [],
      median: snapshot.national?.median ?? null,
      highest: highest
        ? { name: highest.name, api: highest.api as number }
        : null,
    },
    forecast: {
      note:
        "No numerical forecast is used here. Official MyCMAQ forecast products are published separately as maps.",
    },
  };
}

export function factsForNational(snapshot: Snapshot): ExplanationFacts {
  const highest = snapshot.comparable.reduce<StationSnapshot | null>(
    (best, item) =>
      item.api !== null && (!best || (best.api ?? -1) < item.api) ? item : best,
    null,
  );
  return {
    scope: "national",
    generatedAt: snapshot.now,
    station: null,
    trend: null,
    national: {
      reporting: snapshot.coverage.reporting,
      total: snapshot.coverage.total,
      latestHour: snapshot.latestObservedAt,
      counts: Object.entries(snapshot.counts)
        .filter(([key, count]) => key !== "unavailable" && count > 0)
        .map(([key, count]) => ({ category: categoryStyle(key as CategoryKey).label, count })),
      median: snapshot.national?.median ?? null,
      highest: highest
        ? { name: highest.name, api: highest.api as number }
        : null,
    },
    forecast: {
      note:
        "No numerical forecast is used here. Official MyCMAQ forecast products are published separately as maps.",
    },
  };
}

export function fallbackExplanation(facts: ExplanationFacts): Explanation {
  if (facts.scope === "station" && facts.station && facts.trend) {
    const station = facts.station;
    const trend = facts.trend;
    const category = station.category;
    const movement =
      trend.direction === "worsening"
        ? `rose ${Math.abs(trend.delta ?? 0)} points`
        : trend.direction === "improving"
          ? `fell ${Math.abs(trend.delta ?? 0)} points`
          : trend.direction === "stable"
            ? "held within our stable band"
            : "cannot be compared yet";

    const peak =
      trend.peakValue !== null && trend.peakAt
        ? ` The highest reading in the last 24 hours was ${trend.peakValue} at ${formatTime(trend.peakAt)} MYT.`
        : "";

    const precautions =
      category === "Unhealthy" || category === "Very unhealthy" || category === "Hazardous"
        ? [
            "Consider reducing prolonged or heavy outdoor exertion.",
            "Keep windows closed where it is safe to do so and follow official advisories.",
            "People with heart or lung conditions should be especially cautious.",
          ]
        : [
            "Outdoor activity is generally reasonable for most people.",
            "Sensitive groups may still prefer to limit prolonged exertion.",
            "Follow official DOE and MetMalaysia advisories for decisions.",
          ];

    return {
      source: "rules",
      headline: `${station.name}: API ${station.api ?? "—"} (${category})`,
      summary: `${station.name} in ${station.state} recorded API ${station.api ?? "—"} (${category}) at ${station.observedAt ? formatDateTime(station.observedAt) : "an unknown time"}. The reading is ${station.freshness.toLowerCase()}. Over the last ${trend.comparisonHours} hours the index ${movement}.${peak}`,
      trendNote:
        trend.direction === "insufficient"
          ? "Not enough recent hourly readings to describe a direction reliably."
          : `Trend rule: compare the latest reading with the reading about ${trend.comparisonHours} hours earlier; a change of at least 10 API points is treated as a trend.`,
      precautions,
      note: "Generated from stored observations using fixed rules. Gemini was not used.",
    };
  }

  const national = facts.national;
  const summary = national
    ? `At ${national.latestHour ? formatDateTime(national.latestHour) : "the latest hour"}, ${national.reporting} of ${national.total} stations reported a comparable reading. ${national.counts
        .map((item) => `${item.count} ${item.category.toLowerCase()}`)
        .join(", ")}. The median API was ${national.median ?? "—"}${national.highest ? `, and the highest reading was ${national.highest.api} at ${national.highest.name}` : ""}.`
    : "No comparable readings are available right now.";

  return {
    source: "rules",
    headline: "National air-quality briefing",
    summary,
    trendNote:
      "This briefing describes observed API values at a single hour. It does not project future conditions.",
    precautions: [
      "Use official DOE API classifications and MetMalaysia advisories for decisions.",
      "Check the freshness of each station before relying on its reading.",
    ],
    note: "Generated from stored observations using fixed rules. Gemini was not used.",
  };
}

const outputSchema = z.object({
  headline: z.string().min(8).max(120),
  summary: z.string().min(30).max(700),
  trendNote: z.string().min(15).max(400),
  precautions: z.array(z.string().min(5).max(180)).min(1).max(4),
});

const RESPONSE_FORMAT = {
  type: "text",
  mime_type: "application/json",
  schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "Short factual headline. Maximum 90 characters.",
      },
      summary: {
        type: "string",
        description:
          "Plain-language summary of the supplied facts. Maximum 480 characters.",
      },
      trendNote: {
        type: "string",
        description:
          "One or two sentences explaining the observed change using the supplied comparison. Do not forecast.",
      },
      precautions: {
        type: "array",
        items: { type: "string" },
        description: "One to three short, general precautions. Not medical advice.",
      },
    },
    required: ["headline", "summary", "trendNote", "precautions"],
  },
} as const;

export function extractText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;

  const steps = record.steps;
  if (!Array.isArray(steps)) return null;
  for (const step of steps) {
    if (typeof step !== "object" || step === null) continue;
    const candidate = step as Record<string, unknown>;
    if (candidate.type !== "model_output") continue;
    const content = candidate.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part !== "object" || part === null) continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") return text;
    }
  }
  return null;
}

/** Any number the model writes must already exist in the supplied facts. */
export function outputRespectsFacts(text: string, facts: unknown): boolean {
  const haystack = JSON.stringify(facts);
  const allowed = new Set(
    (haystack.match(/\d+(?:\.\d+)?/g) ?? []).map(normalizeNumber),
  );
  const scrubbed = text.replace(
    /\b(PM\s?2\.5|PM\s?10|NO2|SO2|O3)\b/gi,
    "AIR",
  );
  const numbers = scrubbed.match(/\d+(?:\.\d+)?/g) ?? [];
  return numbers.every((value) => allowed.has(normalizeNumber(value)));
}

function normalizeNumber(value: string): string {
  return String(Number(value));
}

const SYSTEM_PROMPT = `You rewrite verified Malaysian air-quality facts into plain, calm English.

Hard rules:
- Use ONLY the numbers and classifications in the FACTS JSON. Never introduce a new number.
- Do not forecast, predict, estimate, or invent concentrations, causes, or health outcomes.
- Do not claim an official warning. Do not describe satellite hotspots.
- Do not change the official API category supplied in the facts.
- If the trend is "insufficient", say the direction is unclear.
- Precautions must be general and must not be medical advice.
- Keep the tone factual and non-alarmist.`;

export async function explainWithGemini(
  facts: ExplanationFacts,
): Promise<Explanation> {
  const fallback = fallbackExplanation(facts);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ...fallback, note: "Gemini is not configured; using rule-based text." };
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
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
          input: `${SYSTEM_PROMPT}\n\nFACTS:\n${JSON.stringify(facts)}`,
          response_format: RESPONSE_FORMAT,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      return {
        ...fallback,
        note: `Gemini returned ${response.status}; using rule-based text.`,
      };
    }

    const text = extractText(await response.json());
    if (!text) {
      return { ...fallback, note: "Gemini returned no text; using rule-based text." };
    }

    const parsed = outputSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return {
        ...fallback,
        note: "Gemini output failed validation; using rule-based text.",
      };
    }

    const joined = [
      parsed.data.headline,
      parsed.data.summary,
      parsed.data.trendNote,
      ...parsed.data.precautions,
    ].join(" ");
    if (!outputRespectsFacts(joined, facts)) {
      return {
        ...fallback,
        note: "Gemini introduced an unverified number; using rule-based text.",
      };
    }

    return {
      source: "gemini",
      ...parsed.data,
      model,
      note: "Gemini rewrote verified observations and calculated trends. It did not create data or forecasts.",
    };
  } catch {
    return {
      ...fallback,
      note: "Gemini was unreachable; using rule-based text.",
    };
  }
}
