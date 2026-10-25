import { describe, expect, it } from "vitest";
import {
  fallbackExplanation,
  outputRespectsFacts,
  type ExplanationFacts,
} from "@/lib/explain";

const facts: ExplanationFacts = {
  scope: "station",
  generatedAt: "2026-01-02T03:00:00.000Z",
  station: {
    name: "Putrajaya",
    state: "W.P. Putrajaya",
    api: 176,
    category: "Unhealthy",
    observedAt: "2026-01-02T03:00:00.000Z",
    freshness: "Current",
  },
  trend: {
    direction: "worsening",
    delta: 20,
    comparisonHours: 6,
    windowHours: 24,
    threshold: 10,
    peakValue: 188,
    peakAt: "2026-01-02T00:00:00.000Z",
  },
  national: {
    reporting: 68,
    total: 68,
    latestHour: "2026-01-02T03:00:00.000Z",
    counts: [{ category: "Unhealthy", count: 8 }],
    median: 82,
    highest: { name: "Putrajaya", api: 176 },
  },
  forecast: { note: "No numerical forecast." },
};

describe("outputRespectsFacts", () => {
  it("accepts numbers that already exist in the verified facts", () => {
    expect(outputRespectsFacts("API 176 rose 20 points.", facts)).toBe(true);
    expect(outputRespectsFacts("The 24-hour peak was 188.", facts)).toBe(true);
  });

  it("rejects an invented number", () => {
    expect(outputRespectsFacts("API 176 will reach 250 tomorrow.", facts)).toBe(
      false,
    );
  });

  it("does not treat pollutant names as invented numbers", () => {
    expect(outputRespectsFacts("PM2.5 and PM10 are separate.", facts)).toBe(true);
    expect(outputRespectsFacts("NO2, SO2 and O3 have their own scales.", facts)).toBe(
      true,
    );
  });

  it("still checks a concentration written next to a pollutant name", () => {
    expect(outputRespectsFacts("PM2.5 was 2.5 µg/m³.", facts)).toBe(false);
  });
});

describe("fallbackExplanation", () => {
  it("states the supplied category and never upgrades it", () => {
    const explanation = fallbackExplanation(facts);
    expect(explanation.source).toBe("rules");
    expect(explanation.headline).toContain("176");
    expect(explanation.headline).toContain("Unhealthy");
    expect(explanation.summary).toContain("rose 20 points");
    expect(explanation.precautions.length).toBeGreaterThan(0);
  });

  it("handles insufficient history without inventing a direction", () => {
    const explanation = fallbackExplanation({
      ...facts,
      trend: { ...facts.trend!, direction: "insufficient", delta: null },
    });
    expect(explanation.trendNote).toContain("Not enough");
    expect(explanation.summary).not.toContain("rose");
  });

  it("builds a national briefing from the comparable hour only", () => {
    const explanation = fallbackExplanation({
      ...facts,
      scope: "national",
      station: null,
      trend: null,
    });
    expect(explanation.summary).toContain("68 of 68");
    expect(explanation.summary).toContain("8 unhealthy");
    expect(explanation.summary).toContain("176");
  });
});
