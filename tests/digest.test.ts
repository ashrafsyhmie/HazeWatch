import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyDigestCard } from "@/components/daily-digest";
import {
  buildDigestFacts,
  fallbackDigest,
  generateDailyDigest,
  previousDay,
} from "@/lib/digest";

const stations = [
  { id: "a", name: "Klang", state: "Selangor" },
  { id: "b", name: "Kuching", state: "Sarawak" },
];

// 2026-10-24T16:00Z is 00:00 on 25 October in Malaysia.
const observations = [
  { locationId: "a", observedAt: "2026-10-24T16:00:00.000Z", value: 40 },
  { locationId: "a", observedAt: "2026-10-24T17:00:00.000Z", value: 60 },
  { locationId: "b", observedAt: "2026-10-24T16:00:00.000Z", value: 80 },
  { locationId: "b", observedAt: "2026-10-24T18:00:00.000Z", value: 50 },
];

describe("buildDigestFacts", () => {
  const facts = buildDigestFacts({
    day: "2026-10-25",
    stations,
    observations,
  });

  it("counts collected hours and reporting stations", () => {
    expect(facts.hoursCollected).toBe(3);
    expect(facts.hoursExpected).toBe(24);
    expect(facts.stationsReporting).toBe(2);
    expect(facts.stationsTotal).toBe(2);
  });

  it("finds the peak hourly median with its Malaysia hour", () => {
    // 00:00 MYT: median(40, 80) = 60. 01:00: 60. Tie keeps the earlier hour.
    expect(facts.peakMedian).toEqual({ api: 60, hour: "00:00" });
  });

  it("finds the highest reading and the largest change", () => {
    expect(facts.highest).toMatchObject({ name: "Kuching", api: 80 });
    expect(facts.lowest).toMatchObject({ name: "Klang", api: 40 });
    expect(facts.movers[0]).toEqual({
      name: "Kuching",
      state: "Sarawak",
      from: 80,
      to: 50,
      delta: -30,
    });
  });

  it("ignores observations from unknown locations", () => {
    const filtered = buildDigestFacts({
      day: "2026-10-25",
      stations,
      observations: [
        ...observations,
        { locationId: "ghost", observedAt: "2026-10-24T16:00:00.000Z", value: 900 },
      ],
    });
    expect(filtered.highest?.api).toBe(80);
    expect(filtered.stationsReporting).toBe(2);
  });
});

describe("fallbackDigest", () => {
  const facts = buildDigestFacts({ day: "2026-10-25", stations, observations });
  const digest = fallbackDigest(facts);

  it("states the peak, highest station and incomplete day", () => {
    expect(digest.summary).toContain("60");
    expect(digest.summary).toContain("Kuching");
    expect(digest.summary).toContain("incomplete");
  });

  it("never forecasts", () => {
    expect(digest.summary.toLowerCase()).not.toContain("forecast");
  });
});

describe("DailyDigestCard", () => {
  it("compares published API facts on one scale and omits bars without data", () => {
    const facts = buildDigestFacts({ day: "2026-10-25", stations, observations });
    const digest = { day: facts.day, generatedAt: "2026-10-26T00:00:00Z", source: "rules" as const, model: null, facts, summary: fallbackDigest(facts) };
    const html = renderToStaticMarkup(createElement(DailyDigestCard, { digest }));
    expect(html).toContain("width:100%");
    expect(html).toContain("width:75%");

    const emptyFacts = buildDigestFacts({ day: "2026-10-25", stations, observations: [] });
    const empty = renderToStaticMarkup(createElement(DailyDigestCard, { digest: { ...digest, facts: emptyFacts, summary: fallbackDigest(emptyFacts) } }));
    expect(empty).toContain("Not enough stored readings to compare");
    expect(empty).not.toContain("width:0%");
  });
});

describe("previousDay", () => {
  it("uses Malaysia time, not UTC", () => {
    expect(previousDay(new Date("2026-10-25T16:30:00.000Z"))).toBe("2026-10-25");
    expect(previousDay(new Date("2026-10-25T15:00:00.000Z"))).toBe("2026-10-24");
  });
});

describe("generateDailyDigest", () => {
  it("rejects a malformed day before touching storage", async () => {
    await expect(generateDailyDigest("25-10-2026")).rejects.toThrow(
      "Day must be YYYY-MM-DD",
    );
    await expect(generateDailyDigest("2026-02-31")).rejects.toThrow(
      "Day must be a real date",
    );
  });
});
