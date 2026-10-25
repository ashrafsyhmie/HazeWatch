import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  categoryFromApi,
  categoryFromSourceClass,
} from "@/lib/categories";

describe("categoryFromApi", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "moderate"],
    [100, "moderate"],
    [101, "unhealthy"],
    [200, "unhealthy"],
    [201, "very-unhealthy"],
    [300, "very-unhealthy"],
    [301, "hazardous"],
    [500, "hazardous"],
  ])("maps API %i to %s", (value, expected) => {
    expect(categoryFromApi(value)).toBe(expected);
  });

  it("treats missing values as unavailable, never as clean air", () => {
    expect(categoryFromApi(null)).toBe("unavailable");
    expect(categoryFromApi(undefined)).toBe("unavailable");
    expect(categoryFromApi(Number.NaN)).toBe("unavailable");
  });

  it("keeps the published bands contiguous", () => {
    const sorted = [...CATEGORIES].sort((a, b) => a.min - b.min);
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index].min).toBe(sorted[index - 1].max + 1);
    }
  });
});

describe("categoryFromSourceClass", () => {
  it("normalises the published class labels", () => {
    expect(categoryFromSourceClass("Good")).toBe("good");
    expect(categoryFromSourceClass("MODERATE")).toBe("moderate");
    expect(categoryFromSourceClass("Very Unhealthy")).toBe("very-unhealthy");
    expect(categoryFromSourceClass("very-unhealthy")).toBe("very-unhealthy");
    expect(categoryFromSourceClass("Hazardous")).toBe("hazardous");
  });

  it("returns null for unknown labels instead of inventing a band", () => {
    expect(categoryFromSourceClass("Hazy")).toBeNull();
    expect(categoryFromSourceClass(null)).toBeNull();
  });
});
