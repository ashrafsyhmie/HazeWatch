import { describe, expect, it } from "vitest";
import { NEAREST_MAX_KM, nearestToPoint, type ExplorerStation } from "@/lib/present";

function explorer(id: string, lat: number, lng: number, api: number | null): ExplorerStation {
  return {
    id,
    name: `${id}, Selangor`,
    shortName: id,
    state: "Selangor",
    lat,
    lng,
    api,
    category: api === null ? "unavailable" : "moderate",
    observedAt: api === null ? null : "2026-10-25T13:00:00.000Z",
    time: "21:00",
    freshness: "Current",
    delta: null,
    direction: "insufficient",
    spark: [],
  };
}

const KL = { latitude: 3.139, longitude: 101.6869 };

describe("nearestToPoint", () => {
  const stations = [
    explorer("Petaling Jaya", 3.1073, 101.6067, 80),
    explorer("Shah Alam", 3.0738, 101.5183, 95),
    explorer("Klang", 3.0449, 101.4455, 70),
    explorer("Ipoh", 4.5975, 101.0901, 60),
  ];

  it("sorts by distance and respects the limit", () => {
    const result = nearestToPoint(stations, KL, 2);
    expect(result.map((entry) => entry.station.id)).toEqual(["Petaling Jaya", "Shah Alam"]);
    expect(result[0].km).toBeLessThan(result[1].km);
  });

  it("skips stations that have no reading", () => {
    const withGap = [explorer("Closest but empty", 3.139, 101.687, null), ...stations];
    const result = nearestToPoint(withGap, KL, 1);
    expect(result[0].station.id).toBe("Petaling Jaya");
  });

  it("returns nothing for a visitor outside the network", () => {
    const London = { latitude: 51.5072, longitude: -0.1276 };
    expect(nearestToPoint(stations, London)).toEqual([]);
  });

  it("drops stations beyond the maximum distance", () => {
    const result = nearestToPoint(stations, KL, 10, NEAREST_MAX_KM);
    expect(result.map((entry) => entry.station.id)).not.toContain("Ipoh");
  });

  it("ignores invalid coordinates", () => {
    expect(nearestToPoint(stations, { latitude: Number.NaN, longitude: 101 })).toEqual([]);
  });
});
