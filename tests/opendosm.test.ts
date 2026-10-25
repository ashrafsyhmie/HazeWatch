import { describe, expect, it } from "vitest";
import { normalizePollutant, parseMonthlyPayload } from "@/lib/opendosm";

describe("normalizePollutant", () => {
  it.each([
    ["CO", "CO"],
    ["NO²", "NO2"],
    ["NO2", "NO2"],
    ["O³", "O3"],
    ["PM₁₀", "PM10"],
    ["PM₂.₅", "PM2.5"],
    ["SO²", "SO2"],
  ])("normalises %s to %s", (raw, expected) => {
    expect(normalizePollutant(raw)).toBe(expected);
  });

  it("rejects unknown pollutants instead of guessing", () => {
    expect(normalizePollutant("CH4")).toBeNull();
  });
});

describe("parseMonthlyPayload", () => {
  it("maps catalogue rows and keeps the correct units", () => {
    const rows = parseMonthlyPayload([
      { date: "2024-12-01", pollutant: "PM₂.₅", concentration: 14.2 },
      { date: "2024-12-01", pollutant: "O³", concentration: 0.021 },
    ]);
    expect(rows).toEqual([
      {
        month: "2024-12-01",
        pollutant: "PM2.5",
        concentration: 14.2,
        unit: "µg/m³",
      },
      {
        month: "2024-12-01",
        pollutant: "O3",
        concentration: 0.021,
        unit: "ppm",
      },
    ]);
  });

  it("keeps null concentrations as null, not zero", () => {
    const [row] = parseMonthlyPayload([
      { date: "2024-11-01", pollutant: "PM10", concentration: null },
    ]);
    expect(row.concentration).toBeNull();
  });

  it("skips malformed and unknown rows", () => {
    const rows = parseMonthlyPayload([
      { date: "2024-13-01", pollutant: "PM10", concentration: 40 },
      { date: "2024-10-01", pollutant: "UNKNOWN", concentration: 1 },
      { date: "2024-10-01", pollutant: "PM10", concentration: 41 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].concentration).toBe(41);
  });

  it("throws when the payload is not an array", () => {
    expect(() => parseMonthlyPayload({})).toThrow();
  });
});
