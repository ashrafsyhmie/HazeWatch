import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchStateHistory,
  parseHourlyPayload,
  parseStationObservations,
  parseStationPayload,
} from "@/lib/apims";

const currentRow = {
  STATION_ID: "CA17W",
  STATE_ID: 16,
  STATION_LOCATION: "Putrajaya, W.P. PUTRAJAYA",
  STATE_NAME: "W.P. Putrajaya",
  LATITUDE: 2.915793,
  LONGITUDE: 101.690946,
  API: 60,
  PARAM_SYMBOL: "**",
  CLASS: "Moderate",
  RECORD_DT: "2026-10-25T21:00:00",
  STATION_STATUS: 1,
};

describe("parseStationPayload", () => {
  it("accepts the wrapped APIMS shape and normalises a station", () => {
    const result = parseStationPayload({ data: [currentRow] });
    expect(result.rejected).toBe(0);
    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]).toMatchObject({
      externalId: "CA17W",
      name: "Putrajaya, W.P. PUTRAJAYA",
      stateId: 16,
      latitude: 2.915793,
      longitude: 101.690946,
    });
  });

  it("accepts a bare array as well", () => {
    expect(parseStationPayload([currentRow]).stations).toHaveLength(1);
  });

  it("drops rows outside Malaysia rather than plotting them", () => {
    const result = parseStationPayload({
      data: [{ ...currentRow, LATITUDE: 51.5, LONGITUDE: -0.12 }],
    });
    expect(result.stations).toHaveLength(0);
    expect(result.rejected).toBe(1);
  });

  it("drops inactive stations", () => {
    const result = parseStationPayload({
      data: [{ ...currentRow, STATION_STATUS: 0 }],
    });
    expect(result.stations).toHaveLength(0);
  });

  it("drops malformed rows while keeping valid ones", () => {
    const result = parseStationPayload({
      data: [currentRow, { STATION_ID: "" }, null],
    });
    expect(result.stations).toHaveLength(1);
    expect(result.rejected).toBe(2);
  });

  it("throws when the payload is not a list at all", () => {
    expect(() => parseStationPayload({ data: "nope" })).toThrow();
  });
});

describe("parseStationObservations", () => {
  it("normalises the wall clock as Malaysia time and keeps the source class", () => {
    const result = parseStationObservations({ data: [currentRow] });
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      externalId: "CA17W",
      observedAt: "2026-10-25T13:00:00.000Z",
      api: 60,
      category: "moderate",
      sourceClass: "Moderate",
      symbol: "**",
    });
  });

  it("trusts the published class over the numeric band when they disagree", () => {
    const result = parseStationObservations({
      data: [{ ...currentRow, API: 60, CLASS: "Unhealthy" }],
    });
    expect(result.observations[0].category).toBe("unhealthy");
    expect(result.observations[0].api).toBe(60);
  });

  it("rejects a missing reading instead of turning it into zero", () => {
    const result = parseStationObservations({ data: [{ ...currentRow, API: null }] });
    expect(result.observations).toHaveLength(0);
    expect(result.rejected).toBe(1);
  });

  it("treats a zero index as unavailable rather than clean air", () => {
    const result = parseStationObservations({ data: [{ ...currentRow, API: 0 }] });
    expect(result.observations).toHaveLength(0);
    expect(result.rejected).toBe(1);
  });

  it("rejects an ambiguous timestamp with a UTC suffix", () => {
    const result = parseStationObservations({
      data: [{ ...currentRow, RECORD_DT: "2026-10-25T21:00:00Z" }],
    });
    expect(result.observations).toHaveLength(0);
  });
});

describe("parseHourlyPayload", () => {
  it("parses the hourly table and derives the band", () => {
    const result = parseHourlyPayload({
      api_table_hourly: [
        {
          STATION_ID: "CA17W",
          STATE_ID: 16,
          STATION_LOCATION: "Putrajaya, W.P. PUTRAJAYA",
          LATITUDE: 2.915793,
          LONGITUDE: 101.690946,
          DATETIME: "2026-10-25T20:00:00",
          API: 63,
          PARAM_SYMBOL: "**",
        },
      ],
    });
    expect(result.rejected).toBe(0);
    expect(result.observations[0]).toMatchObject({
      observedAt: "2026-10-25T12:00:00.000Z",
      api: 63,
      category: "moderate",
      sourceClass: null,
    });
  });

  it("throws on an unexpected envelope", () => {
    expect(() => parseHourlyPayload({ data: [] })).toThrow();
  });
});

describe("state history retrieval", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const row = {
    STATION_ID: "CA17W",
    STATE_ID: 16,
    STATION_LOCATION: "Putrajaya, W.P. PUTRAJAYA",
    LATITUDE: 2.915793,
    LONGITUDE: 101.690946,
    DATETIME: "2026-10-25T20:00:00",
    API: 63,
    PARAM_SYMBOL: "**",
  };

  it("retries a rate-limited request once the source recovers", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      calls.push(String(input));
      if (calls.length === 1) {
        return new Response("rate limited", { status: 429 });
      }
      return new Response(JSON.stringify({ api_table_hourly: [row] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await fetchStateHistory(16, "2026-10-25T12:00:00.000Z");
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].externalId).toBe("CA17W");
    expect(calls).toHaveLength(2);
  }, 10_000);

  it("does not retry a hard client error", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls += 1;
      return new Response("bad request", { status: 400 });
    });

    await expect(
      fetchStateHistory(16, "2026-10-25T12:00:00.000Z"),
    ).rejects.toThrow("APIMS responded 400");
    expect(calls).toBe(1);
  });
});
