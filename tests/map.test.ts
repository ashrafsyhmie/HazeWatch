import { describe, expect, it } from "vitest";
import { hasMapCoordinates, markerLabel } from "@/lib/map";

describe("map presentation", () => {
  it("distinguishes a missing reading from a numeric zero", () => {
    expect(markerLabel({ name: "Test station", api: null })).toBe("Test station · No reading");
    expect(markerLabel({ name: "Test station", api: 0 })).toBe("Test station · API 0");
  });

  it("rejects coordinates that would break the map without rejecting zero", () => {
    expect(hasMapCoordinates({ lat: 3.1, lng: 101.7 })).toBe(true);
    expect(hasMapCoordinates({ lat: 0, lng: 0 })).toBe(true);
    for (const coordinates of [{ lat: NaN, lng: 101 }, { lat: 3, lng: Infinity }, { lat: 91, lng: 101 }, { lat: 3, lng: -181 }]) {
      expect(hasMapCoordinates(coordinates)).toBe(false);
    }
  });
});
