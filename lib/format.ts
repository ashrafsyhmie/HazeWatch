const MYT_OFFSET_MINUTES = 8 * 60;
const MYT_OFFSET_MS = MYT_OFFSET_MINUTES * 60 * 1000;

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * APIMS returns Malayian wall-clock timestamps without an offset
 * (e.g. "2026-10-25T21:00:00") while its epoch field is encoded as if that
 * wall clock were UTC. We deliberately trust the human-readable field and
 * interpret it as Malaysia time (UTC+8).
 */
export function parseMalaysiaWallClock(input: string): string | null {
  const match = WALL_CLOCK.exec(input.trim());
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const parts = [y, mo, d, h, mi, s ?? "00"].map(Number);
  const [year, month, day, hour, minute, second] = parts;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) - MYT_OFFSET_MS;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return null;

  // Reject impossible calendar dates such as 31 February.
  const roundTrip = new Date(utcMs + MYT_OFFSET_MS);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() + 1 !== month ||
    roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCHours() !== hour ||
    roundTrip.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return date.toISOString();
}

/** Formats an instant as the APIMS query parameter: MYT wall clock, no offset. */
export function toMalaysiaQueryParam(iso: string): string {
  const myt = new Date(new Date(iso).getTime() + MYT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${myt.getUTCFullYear()}-${pad(myt.getUTCMonth() + 1)}-${pad(
    myt.getUTCDate(),
  )}T${pad(myt.getUTCHours())}:00:00`;
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600_000).toISOString();
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
});

const monthFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

function normalizeHour(value: string): string {
  // Some ICU builds emit "24:00" for midnight with hour12:false.
  return value.replace(/^24:/, "00:");
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "No reading";
  return `${normalizeHour(dateTimeFormatter.format(new Date(iso)))} MYT`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return dateFormatter.format(new Date(iso));
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return normalizeHour(timeFormatter.format(new Date(iso)));
}

export function formatDay(iso: string): string {
  return dayFormatter.format(new Date(iso));
}

export function formatMonth(iso: string): string {
  return monthFormatter.format(new Date(iso));
}

export function formatAge(fromIso: string | null, nowIso: string): string {
  if (!fromIso) return "No data";
  const minutes = Math.max(0, minutesBetween(fromIso, nowIso));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

export function formatCoord(value: number): string {
  return value.toFixed(4);
}
