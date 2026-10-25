import { describe, expect, it } from "vitest";
import { extractCycles, summariseManifest } from "@/lib/mycmaq";

describe("extractCycles", () => {
  const html = `
    <a href="./display_20261024_12.html">run</a>
    <a href="display_20261025_00.html">run</a>
    <a href='display_20261024_12.html'>duplicate</a>
    <a href="about.html">about</a>
    <a href="./display_20261026_00.html">newest</a>
  `;

  it("finds unique cycles and sorts newest first", () => {
    const cycles = extractCycles(html);
    expect(cycles.map((cycle) => cycle.cycleId)).toEqual([
      "20261026_00",
      "20261025_00",
      "20261024_12",
    ]);
  });

  it("builds the official viewer link", () => {
    const [newest] = extractCycles(html);
    expect(newest.mapUrl).toBe(
      "https://mycmaq.met.gov.my/display_20261026_00.html",
    );
    expect(newest.initializedAt).toBe("2026-10-26T00:00:00.000Z");
  });

  it("returns nothing when the page has no cycles", () => {
    expect(extractCycles("<html></html>")).toEqual([]);
  });
});

describe("summariseManifest", () => {
  const files = [
    "PM25_d02_20261024_14LST.png",
    "PM25_d02_20261024_15LST.png",
    "PM10_d02_20261024_16LST.png",
    "O3_d02_20261024_10LST.png",
    "SO2_d02_20261024_20LST.png",
    "PM25_d01_20261024_23LST.png",
    "readme.txt",
  ];

  it("counts frames and lists only the public map pollutants", () => {
    const summary = summariseManifest(files);
    expect(summary.frameCount).toBe(6);
    expect(summary.pollutants).toEqual(["O3", "PM10", "PM25"]);
  });

  it("derives the last public frame label without asserting an offset", () => {
    expect(summariseManifest(files).lastFrameLabel).toBe("2026-10-24 16:00 LST");
  });

  it("returns null labels when nothing matches", () => {
    const summary = summariseManifest(["not-a-frame.png"]);
    expect(summary.frameCount).toBe(0);
    expect(summary.lastFrameLabel).toBeNull();
    expect(summary.pollutants).toEqual([]);
  });
});
