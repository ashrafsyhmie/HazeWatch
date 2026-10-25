import { describe, expect, it } from "vitest";
import {
  buildMonthlyRows,
  nearestStations,
  toExplorerStations,
} from "@/lib/present";
import { freshnessOf, summariseTrend } from "@/lib/analysis";
import type { MonthlyPoint, Snapshot, StationSnapshot } from "@/lib/types";

function station(
  externalId: string,
  latitude: number,
  longitude: number,
  api: number | null,
): StationSnapshot {
  const series = api === null ? [] : [{ observedAt: "2026-10-25T13:00:00.000Z", value: api }];
  return {
    externalId,
    name: `${externalId}, Selangor`,
    stateName: "Selangor",
    stateId: 10,
    latitude,
    longitude,
    api,
    category: api === null ? "unavailable" : "moderate",
    sourceClass: null,
    symbol: null,
    observedAt: series[0]?.observedAt ?? null,
    series,
    trend: summariseTrend(series),
    freshness: freshnessOf(series[0]?.observedAt ?? null, "2026-10-25T13:00:00.000Z"),
  };
}

describe("toExplorerStations", () => {
  it("uses the locality as the short name and caps the sparkline window", () => {
    const snapshot: Snapshot = {
      mode: "live",
      now: "2026-10-25T13:00:00.000Z",
      latestObservedAt: "2026-10-25T13:00:00.000Z",
      stations: [station("A", 3.1, 101.5, 70)],
      comparable: [],
      counts: {
        good: 0,
        moderate: 1,
        unhealthy: 0,
        "very-unhealthy": 0,
        hazardous: 0,
        unavailable: 0,
      },
      national: null,
      insights: [],
      freshness: freshnessOf("2026-10-25T13:00:00.000Z", "2026-10-25T13:00:00.000Z"),
      coverage: { reporting: 1, total: 1, comparableAt: null },
      sources: [],
    };

    const [explorer] = toExplorerStations(snapshot);
    expect(explorer.shortName).toBe("A");
    expect(explorer.time).toBe("21:00");
    expect(explorer.spark).toEqual([70]);
  });
});

describe("buildMonthlyRows", () => {
  const points: MonthlyPoint[] = [
    { month: "2024-01-01", pollutant: "PM2.5", concentration: 10, unit: "µg/m³" },
    { month: "2024-01-01", pollutant: "PM10", concentration: 20, unit: "µg/m³" },
    { month: "2024-01-01", pollutant: "O3", concentration: 0.02, unit: "ppm" },
    { month: "2024-02-01", pollutant: "PM2.5", concentration: 12, unit: "µg/m³" },
    { month: "2024-02-01", pollutant: "PM10", concentration: null, unit: "µg/m³" },
  ];

  it("groups by month and strips the dot from the PM2.5 key", () => {
    const { rows } = buildMonthlyRows(points);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ label: "Jan 2024", PM25: 10, PM10: 20, O3: 0.02 });
    expect(rows[1]).toMatchObject({ PM25: 12, PM10: null });
  });

  it("takes the latest non-null value per pollutant", () => {
    const { latest } = buildMonthlyRows(points);
    const pm25 = latest.find((item) => item.key === "PM25");
    const pm10 = latest.find((item) => item.key === "PM10");
    expect(pm25?.value).toBe(12);
    expect(pm10?.value).toBe(20);
    expect(pm10?.month).toBe("2024-01-01");
  });

  it("does not interpolate a missing month", () => {
    const { rows } = buildMonthlyRows([
      { month: "2024-01-01", pollutant: "PM25", concentration: 10, unit: "µg/m³" },
      { month: "2024-03-01", pollutant: "PM25", concentration: 14, unit: "µg/m³" },
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe("nearestStations", () => {
  const origin = station("A", 3.1, 101.5, 60);
  const near = station("B", 3.2, 101.55, 61);
  const far = station("C", 5.4, 100.3, 62);

  it("orders by great-circle distance and excludes the origin", () => {
    const result = nearestStations([origin, far, near], origin, 2);
    expect(result.map((item) => item.station.externalId)).toEqual(["B", "C"]);
    expect(result[0].km).toBeLessThan(result[1].km);
  });

  it("respects the limit", () => {
    expect(nearestStations([origin, far, near], origin, 1)).toHaveLength(1);
  });
});
