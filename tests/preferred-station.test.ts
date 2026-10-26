import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreferredStationCard } from "@/components/preferred-station";

describe("PreferredStationCard", () => {
  it("guides new visitors to pin a real station on the map", () => {
    const html = renderToStaticMarkup(createElement(PreferredStationCard, { candidates: [], showEmpty: true }));
    expect(html).toContain("No station pinned yet");
    expect(html).toContain('href="#stations"');
    expect(renderToStaticMarkup(createElement(PreferredStationCard, { candidates: [] }))).toBe("");
  });
});
