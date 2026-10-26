"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categoryStyle } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import type { ExplorerStation } from "@/lib/present";
import { DeltaChip, Sparkline } from "@/components/ui";
import { StationMap } from "@/components/station-map";

export function StationExplorer({
  stations,
  initialSelectedId,
  mapTheme,
}: {
  stations: ExplorerStation[];
  initialSelectedId?: string;
  mapTheme?: "pastel";
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [sort, setSort] = useState<"api" | "name">("api");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );

  const states = useMemo(
    () =>
      [...new Set(stations.map((station) => station.state))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [stations],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = stations.filter((station) => {
      if (state !== "all" && station.state !== state) return false;
      if (!needle) return true;
      return (
        station.name.toLowerCase().includes(needle) ||
        station.state.toLowerCase().includes(needle) ||
        station.id.toLowerCase().includes(needle)
      );
    });

    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (a.api === null && b.api === null) return a.name.localeCompare(b.name);
      if (a.api === null) return 1;
      if (b.api === null) return -1;
      return b.api - a.api;
    });
  }, [stations, query, state, sort]);

  const selectedStation = filtered.find((station) => station.id === selectedId);

  return (
    <div className="panel overflow-hidden">
      <div className="grid lg:h-[620px] lg:grid-cols-[1.65fr_0.85fr]">
        <div className="relative h-[380px] border-b border-line/80 sm:h-[460px] lg:h-full lg:border-b-0 lg:border-r">
          <StationMap
            stations={filtered}
            selectedId={selectedStation?.id ?? null}
            onSelect={setSelectedId}
            theme={mapTheme}
            fitToStations={state !== "all" || query.trim().length > 0}
          />
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="border-b border-line/70 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <label htmlFor="station-search" className="sr-only">
                  Search stations
                </label>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m16 16 4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="station-search"
                  name="station-query"
                  type="search"
                  autoComplete="off"
                  value={query}
                onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }}
                  placeholder="Search station or state…"
                  className="min-h-11 w-full rounded-lg border border-line bg-ink/60 py-2 pl-8 pr-3 text-[12.5px] text-fog placeholder:text-muted/70 focus:border-signal/50 focus:outline-none"
                />
              </div>
              <label htmlFor="station-state" className="sr-only">
                Filter by state
              </label>
              <select
                id="station-state"
                name="station-state"
                value={state}
                onChange={(event) => { setState(event.target.value); setSelectedId(null); }}
                className="min-h-11 max-w-[124px] rounded-lg border border-line bg-ink/60 px-2 py-2 text-[12px] text-muted focus:border-signal/50 focus:outline-none"
              >
                <option value="all">All states</option>
                {states.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
            <p aria-live="polite" className="text-[11px] text-muted">
              {filtered.length} of {stations.length} stations
            </p>
            <div
              role="group"
              aria-label="Sort stations"
              className="flex items-center rounded-full border border-line p-0.5"
            >
              <button
                type="button"
                aria-pressed={sort === "api"}
                onClick={() => setSort("api")}
                className={`min-h-11 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  sort === "api" ? "bg-white/[0.08] text-fog" : "text-muted hover:text-fog"
                }`}
              >
                Highest
              </button>
              <button
                type="button"
                aria-pressed={sort === "name"}
                onClick={() => setSort("name")}
                className={`min-h-11 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  sort === "name" ? "bg-white/[0.08] text-fog" : "text-muted hover:text-fog"
                }`}
              >
                Name
              </button>
            </div>
          </div>

          <div aria-live="polite" className="border-b border-line bg-surface-2/70 p-4">
            {selectedStation ? (
              <section aria-label="Selected station details">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-signal">Selected station</p>
                    <h3 className="mt-1 text-sm font-medium">{selectedStation.name}</h3>
                    <p className="mt-1 text-xs text-muted">{selectedStation.state}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedId(null)} aria-label="Close station details" className="size-11 rounded-lg text-muted hover:text-fog">×</button>
                </div>
                <p className="mt-3 text-sm" style={{ color: categoryStyle(selectedStation.api === null ? "unavailable" : selectedStation.category).hex }}>
                  <span className="num text-2xl">{selectedStation.api ?? "—"}</span> · {selectedStation.api === null ? "No reading" : `API · ${categoryStyle(selectedStation.category).label}`}
                </p>
                <p className="mt-2 text-xs text-muted">DOE APIMS · {selectedStation.observedAt ? formatDateTime(selectedStation.observedAt) : "Observation time unavailable"} · {selectedStation.freshness}</p>
                <Link href={`/stations/${encodeURIComponent(selectedStation.id)}`} className="mt-3 inline-block text-xs text-signal">View station history →</Link>
              </section>
            ) : <p className="text-xs text-muted">Select a map marker or station below to inspect its reading.</p>}
          </div>

          <div className="scroll-thin max-h-[520px] min-h-0 flex-1 overflow-y-auto lg:max-h-none">
            {filtered.length === 0 ? (
              <div className="grid h-full min-h-[200px] place-items-center px-6 text-center">
                <div>
                  <p className="text-[13px] font-medium text-fog">
                    No stations match
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted">
                    Try a different name or reset the state filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setState("all");
                    }}
                    className="mt-3 rounded-full border border-line px-3 py-1.5 text-[11px] text-fog hover:border-signal/40 hover:text-signal"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              <ul>
                {filtered.map((station) => {
                  const style = categoryStyle(station.category);
                  const selected = station.id === selectedId;
                  return (
                    <li key={station.id} className="[content-visibility:auto] [contain-intrinsic-size:0_58px]">
                      <button
                        type="button"
                        onClick={() => setSelectedId(station.id)}
                        aria-pressed={selected}
                        title={station.name}
                        className={`group flex w-full items-center gap-2.5 border-b border-line/50 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.035] ${
                          selected ? "bg-white/[0.05]" : ""
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: style.hex }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-fog">
                            {station.shortName}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted">
                            {station.state} · {station.time} MYT
                            {station.freshness !== "Current" && station.api !== null
                              ? ` · ${station.freshness}`
                              : ""}
                          </span>
                          <span className="mt-1 block text-[11px]" style={{ color: style.hex }}>{style.label}</span>
                        </span>
                        {station.spark.length > 1 ? (
                          <Sparkline values={station.spark} color={style.hex} />
                        ) : null}
                        <span className="shrink-0 text-right">
                          <span
                            className="num block text-[16px] font-semibold leading-tight"
                            style={{ color: style.hex }}
                          >
                            {station.api ?? "—"}
                          </span>
                          <span className="mt-0.5 block">
                            <DeltaChip
                              direction={station.direction}
                              delta={station.delta}
                            />
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
