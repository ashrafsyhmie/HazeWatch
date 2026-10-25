import { z } from "zod";

const ENDPOINT = "https://api.data.gov.my/data-catalogue?id=air_pollution";

const rowSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isCalendarDate, "Invalid calendar date"),
  pollutant: z.string().min(1),
  concentration: z.union([z.number(), z.null()]),
});

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

const UNIT_BY_POLLUTANT: Record<string, string> = {
  CO: "ppm",
  NO2: "ppm",
  O3: "ppm",
  SO2: "ppm",
  PM10: "µg/m³",
  PM25: "µg/m³",
};

const NAME_BY_KEY: Record<string, string> = {
  CO: "CO",
  NO2: "NO2",
  O3: "O3",
  SO2: "SO2",
  PM10: "PM10",
  PM25: "PM2.5",
};

export type MonthlySeed = {
  month: string;
  pollutant: string;
  concentration: number | null;
  unit: string;
};

export function normalizePollutant(raw: string): string | null {
  const key = raw
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) =>
      String("₀₁₂₃₄₅₆₇₈₉".indexOf(char)),
    )
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (char) =>
      String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(char)),
    )
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!(key in UNIT_BY_POLLUTANT)) return null;
  return NAME_BY_KEY[key] ?? null;
}

export function parseMonthlyPayload(payload: unknown): MonthlySeed[] {
  if (!Array.isArray(payload)) {
    throw new Error("OpenDOSM payload was not an array");
  }
  const rows: MonthlySeed[] = [];
  for (const raw of payload) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const pollutant = normalizePollutant(parsed.data.pollutant);
    if (!pollutant) continue;
    rows.push({
      month: `${parsed.data.date.slice(0, 7)}-01`,
      pollutant,
      concentration: parsed.data.concentration,
      unit: UNIT_BY_POLLUTANT[pollutant.replace(".", "")] ?? "ppm",
    });
  }
  return rows;
}

export async function fetchMonthlyPollution(
  options: { fresh?: boolean } = {},
): Promise<MonthlySeed[]> {
  const revalidate = options.fresh ? 0 : 86_400;
  const response = await fetch(ENDPOINT, {
    headers: { accept: "application/json" },
    next: revalidate === 0 ? undefined : { revalidate },
    cache: revalidate === 0 ? "no-store" : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`OpenDOSM responded ${response.status}`);
  }
  return parseMonthlyPayload(await response.json());
}
