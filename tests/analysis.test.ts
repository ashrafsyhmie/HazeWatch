import { describe, expect, it } from "vitest";
import {
  buildInsights,
  freshnessOf,
  nationalSummary,
  summariseTrend,
} from "@/lib/analysis";
import type { StationSnapshot } from "@/lib/types";

const base = Date.UTC(2026, 9, 25, 0, 0, 0);
const at = (hours: number) => new Date(base + hours * 3_600_000).toISOString();

function series(values: number[]) {
  return values.map((value, index) => ({
    observedAt: at(index),
    value,
  }));
}

function station(
  externalId: string,
  trend: StationSnapshot["trend"],
): StationSnapshot {
  return {
    externalId,
    name: `${externalId} station`,
    stateName: "Selangor",
    stateId: 10,
    latitude: 3.1,
    longitude: 101.5,
    api: trend.latest,
    category: "moderate",
    sourceClass: "Moderate",
    symbol: null,
    observedAt: at(6),
    series: [],
    trend,
    freshness: freshnessOf(at(6), at(6)),
  };
}

describe("summariseTrend", () => {
  it("flags a rise of 10 or more points over six hours as worsening", () => {
    const trend = summariseTrend(series([60, 62, 64, 66, 70, 74, 80]));
    expect(trend.direction).toBe("worsening");
    expect(trend.delta).toBe(20);
    expect(trend.previous).toBe(60);
    expect(trend.latest).toBe(80);
    expect(trend.peak?.value).toBe(80);
    expect(trend.reason).toContain("rose");
  });

  it("treats a small change as stable", () => {
    const trend = summariseTrend(series([60, 61, 62, 63, 64, 62, 65]));
    expect(trend.direction).toBe("stable");
    expect(trend.delta).toBe(5);
  });

  it("flags a fall of 10 or more points as improving", () => {
    const trend = summariseTrend(series([100, 95, 90, 85, 80, 75, 70]));
    expect(trend.direction).toBe("improving");
    expect(trend.delta).toBe(-30);
  });

  it("returns insufficient when no reading is near the comparison hour", () => {
    const trend = summariseTrend(series([60, 65]));
    expect(trend.direction).toBe("insufficient");
    expect(trend.delta).toBeNull();
    expect(trend.reason).toContain("Not enough hourly history");
  });

  it("accepts a comparison within the 90-minute tolerance", () => {
    const trend = summariseTrend([
      { observedAt: at(0.5), value: 50 },
      { observedAt: at(6), value: 60 },
    ]);
    expect(trend.direction).toBe("worsening");
    expect(trend.delta).toBe(10);
  });

  it("rejects a comparison outside the tolerance rather than stretching it", () => {
    const trend = summariseTrend([
      { observedAt: at(-2), value: 50 },
      { observedAt: at(6), value: 90 },
    ]);
    expect(trend.direction).toBe("insufficient");
    expect(trend.delta).toBeNull();
  });

  it("only considers the 24-hour window for the peak", () => {
    const trend = summariseTrend([
      { observedAt: at(-10), value: 200 },
      { observedAt: at(0), value: 55 },
      { observedAt: at(6), value: 60 },
    ]);
    expect(trend.peak?.value).toBe(200);
    expect(trend.peak?.observedAt).toBe(at(-10));
  });

  it("handles an empty series without inventing a reading", () => {
    const trend = summariseTrend([]);
    expect(trend.direction).toBe("insufficient");
    expect(trend.latest).toBeNull();
    expect(trend.peak).toBeNull();
    expect(trend.points).toBe(0);
  });
});

describe("freshnessOf", () => {
  it("marks readings up to two hours old as fresh", () => {
    expect(freshnessOf(at(0), at(2)).state).toBe("fresh");
  });

  it("marks three to six hours as delayed", () => {
    expect(freshnessOf(at(0), at(3)).state).toBe("delayed");
    expect(freshnessOf(at(0), at(6)).state).toBe("delayed");
  });

  it("marks older readings as stale", () => {
    expect(freshnessOf(at(0), at(7)).state).toBe("stale");
  });

  it("does not treat a missing reading as fresh", () => {
    expect(freshnessOf(null, at(0)).state).toBe("unavailable");
  });
});

describe("buildInsights", () => {
  it("keeps only worsening stations, sorted by the largest rise", () => {
    const critical = summariseTrend(series([60, 70, 80, 90, 100, 110, 130]));
    const mild = summariseTrend(series([60, 62, 64, 66, 68, 70, 72]));
    const steady = summariseTrend(series([60, 60, 60, 60, 60, 60, 60]));

    const insights = buildInsights([
      station("A", steady),
      station("B", mild),
      station("C", critical),
    ]);

    expect(insights.map((insight) => insight.externalId)).toEqual(["C", "B"]);
    expect(insights[0].delta).toBe(70);
  });

  it("returns nothing rather than a weak signal", () => {
    const steady = summariseTrend(series([60, 60, 60, 60, 60, 60, 60]));
    expect(buildInsights([station("A", steady)])).toEqual([]);
  });
});

describe("nationalSummary", () => {
  it("computes median, mean, min and max", () => {
    expect(nationalSummary([10, 20, 30])).toEqual({
      median: 20,
      mean: 20,
      min: 10,
      max: 30,
    });
  });

  it("averages the middle pair for an even count", () => {
    expect(nationalSummary([10, 20])?.median).toBe(15);
  });

  it("returns null for an empty comparable set", () => {
    expect(nationalSummary([])).toBeNull();
  });
});
