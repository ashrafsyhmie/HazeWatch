import { describe, expect, it } from "vitest";
import { AUDIENCES, guidanceFor } from "@/lib/guidance";
import type { CategoryKey } from "@/lib/types";

const BANDS: CategoryKey[] = ["good", "moderate", "unhealthy", "very-unhealthy", "hazardous"];

describe("guidanceFor", () => {
  it("returns guidance for every band and audience", () => {
    for (const band of BANDS) {
      for (const audience of AUDIENCES) {
        const result = guidanceFor(band, audience.key);
        expect(result, `${band}/${audience.key}`).not.toBeNull();
        expect(result?.headline.length).toBeGreaterThan(0);
        expect(result?.actions.length).toBeGreaterThan(0);
      }
    }
  });

  it("never gives advice for a missing reading", () => {
    expect(guidanceFor("unavailable")).toBeNull();
    expect(guidanceFor("unavailable", "outdoor")).toBeNull();
  });

  it("defaults to the general audience", () => {
    expect(guidanceFor("unhealthy")).toEqual(guidanceFor("unhealthy", "everyone"));
  });

  it("recommends a respirator, not a surgical mask, once air is unhealthy", () => {
    for (const band of ["unhealthy", "very-unhealthy", "hazardous"] as const) {
      const text = guidanceFor(band, "everyone")!.actions.join(" ");
      expect(text).toMatch(/N95|KN95/);
    }
  });

  it("does not ask for masks when air is good", () => {
    for (const audience of AUDIENCES) {
      const text = guidanceFor("good", audience.key)!.actions.join(" ");
      expect(text).not.toMatch(/N95|KN95/);
    }
  });

  it("returns a copy so callers cannot change the shared guidance", () => {
    const first = guidanceFor("moderate", "everyone")!;
    first.actions.push("changed");
    expect(guidanceFor("moderate", "everyone")!.actions).not.toContain("changed");
  });
});
