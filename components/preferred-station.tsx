"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { CategoryBadge } from "@/components/ui";
import { categoryStyle } from "@/lib/categories";
import type { CategoryKey } from "@/lib/types";

const KEY = "hazewatch.preferred-station.v1";

type SavedStation = { id: string; name: string };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: SavedStation | null = null;

function parseSaved(raw: string | null): SavedStation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedStation>;
    if (typeof parsed.id !== "string" || parsed.id === "") return null;
    return { id: parsed.id, name: typeof parsed.name === "string" ? parsed.name : "" };
  } catch {
    return null;
  }
}

function getSnapshot(): SavedStation | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseSaved(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): SavedStation | null {
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function persist(value: SavedStation | null): boolean {
  try {
    if (value) window.localStorage.setItem(KEY, JSON.stringify(value));
    else window.localStorage.removeItem(KEY);
  } catch {
    return false;
  }
  cachedRaw = undefined;
  for (const listener of [...listeners]) listener();
  return true;
}

function useSavedStation(): SavedStation | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function SaveStationButton({
  stationId,
  name,
}: {
  stationId: string;
  name: string;
}) {
  const saved = useSavedStation();
  const [error, setError] = useState<string | null>(null);
  const pinned = saved?.id === stationId;

  function toggle() {
    const ok = persist(pinned ? null : { id: stationId, name });
    setError(ok ? null : "This browser blocked local storage.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={pinned}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] transition-colors ${
          pinned
            ? "border-signal/35 bg-signal/10 text-signal"
            : "border-line bg-surface text-muted hover:border-signal/30 hover:text-signal"
        }`}
      >
        {pinned ? "Pinned" : "Pin station"}
      </button>
      {error ? (
        <p role="alert" className="text-[9.5px] text-unhealthy">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type PreferredCandidate = {
  id: string;
  name: string;
  shortName: string;
  state: string;
  api: number | null;
  category: CategoryKey;
  time: string;
  freshness: string;
};

export function PreferredStationCard({
  candidates,
}: {
  candidates: PreferredCandidate[];
}) {
  const saved = useSavedStation();

  if (!saved) return null;

  const station = candidates.find((candidate) => candidate.id === saved.id);

  if (!station) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            Your station
          </p>
          <p className="mt-1 text-[12px] text-fog/80">
            The station you pinned is not in the current APIMS list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => persist(null)}
          className="rounded-full border border-line px-3 py-1 text-[10.5px] text-muted hover:border-signal/30 hover:text-signal"
        >
          Clear
        </button>
      </div>
    );
  }

  const style = categoryStyle(station.category);

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: style.hex }}
        />
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            Your station · stored on this device
          </p>
          <p className="mt-1 truncate text-[13px] font-medium text-fog">
            {station.shortName}
            <span className="ml-2 text-[10.5px] font-normal text-muted">
              {station.state}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span
            className="num text-[24px] font-semibold leading-none"
            style={{ color: style.hex }}
          >
            {station.api ?? "—"}
          </span>
          <CategoryBadge category={station.category} />
        </div>
        <p className="text-[10px] text-muted">
          {station.time} MYT
          {station.freshness !== "Current" ? ` · ${station.freshness}` : ""}
        </p>
        <Link
          href={`/stations/${encodeURIComponent(station.id)}`}
          className="text-[11px] text-fog/85 hover:text-signal"
        >
          Open →
        </Link>
        <button
          type="button"
          onClick={() => persist(null)}
          aria-label="Unpin my station"
          className="grid h-6 w-6 place-items-center rounded-full border border-line text-[12px] text-muted hover:border-signal/30 hover:text-signal"
        >
          ×
        </button>
      </div>
    </div>
  );
}
