import { describe, expect, it } from "vitest";
import {
  addHours,
  formatDateTime,
  formatSigned,
  formatTime,
  minutesBetween,
  parseMalaysiaWallClock,
  toMalaysiaQueryParam,
} from "@/lib/format";

describe("parseMalaysiaWallClock", () => {
  it("treats the APIMS text as Malaysia time and stores the UTC instant", () => {
    expect(parseMalaysiaWallClock("2026-10-25T21:00:00")).toBe(
      "2026-10-25T13:00:00.000Z",
    );
  });

  it("accepts the space-separated form without seconds", () => {
    expect(parseMalaysiaWallClock("2026-01-02 03:04")).toBe(
      "2026-01-01T19:04:00.000Z",
    );
  });

  it("rejects an explicit UTC suffix instead of guessing", () => {
    expect(parseMalaysiaWallClock("2026-10-25T21:00:00Z")).toBeNull();
  });

  it("rejects impossible calendar dates", () => {
    expect(parseMalaysiaWallClock("2026-02-31T10:00:00")).toBeNull();
    expect(parseMalaysiaWallClock("2026-13-01T10:00:00")).toBeNull();
    expect(parseMalaysiaWallClock("2026-10-25T24:00:00")).toBeNull();
  });

  it("round-trips through the APIMS query parameter", () => {
    const iso = parseMalaysiaWallClock("2026-10-25T21:00:00");
    expect(iso).not.toBeNull();
    expect(toMalaysiaQueryParam(iso as string)).toBe("2026-10-25T21:00:00");
  });
});

describe("time helpers", () => {
  it("adds hours without mutating the input", () => {
    const base = "2026-10-25T13:00:00.000Z";
    expect(addHours(base, -6)).toBe("2026-10-25T07:00:00.000Z");
    expect(base).toBe("2026-10-25T13:00:00.000Z");
  });

  it("formats times in Malaysia time", () => {
    expect(formatTime("2026-10-25T13:00:00.000Z")).toBe("21:00");
    expect(formatDateTime("2026-10-25T13:00:00.000Z")).toContain("MYT");
  });

  it("computes signed minutes", () => {
    expect(
      minutesBetween("2026-10-25T13:00:00.000Z", "2026-10-25T13:30:00.000Z"),
    ).toBe(30);
  });

  it("prints a leading plus only for positive changes", () => {
    expect(formatSigned(12)).toBe("+12");
    expect(formatSigned(-4)).toBe("-4");
    expect(formatSigned(0)).toBe("0");
  });
});
