"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryBadge, DeltaChip } from "@/components/ui";
import { categoryStyle } from "@/lib/categories";
import { nearestToPoint, type ExplorerStation, type NearestToPoint } from "@/lib/present";

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "done"; results: NearestToPoint[] }
  | { status: "error"; message: string };

function errorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access was blocked. Allow it in your browser, or search for a station below.";
  }
  if (error.code === error.TIMEOUT) {
    return "Finding your location took too long. Try again, or search for a station below.";
  }
  return "Your location is not available right now. Search for a station below.";
}

export function NearestStation({ stations }: { stations: ExplorerStation[] }) {
  const [state, setState] = useState<State>({ status: "idle" });

  function locate() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "error", message: "This browser cannot share a location. Search for a station below." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "done",
          results: nearestToPoint(stations, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
      },
      (error) => setState({ status: "error", message: errorMessage(error) }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="nearest-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="nearest-title" className="text-[15px] font-medium text-fog">
            Air quality near you
          </h2>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted">
            Find the closest stations with a current reading. Your position stays in this browser. It
            is not sent to HazeWatch or stored.
          </p>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={state.status === "locating"}
          className="inline-flex min-h-11 items-center rounded-full border border-signal/35 bg-signal/10 px-4 py-1.5 text-[12px] font-medium text-signal transition-colors hover:bg-signal/15 disabled:opacity-60"
        >
          {state.status === "locating"
            ? "Finding your location…"
            : state.status === "done"
              ? "Update my location"
              : "Use my location"}
        </button>
      </div>

      <div aria-live="polite">
        {state.status === "error" ? (
          <p role="alert" className="mt-4 text-[12px] text-unhealthy">
            {state.message}
          </p>
        ) : null}

        {state.status === "done" && state.results.length === 0 ? (
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            No station with a current reading is within 150 km of you. HazeWatch only covers the
            Malaysian APIMS network.
          </p>
        ) : null}

        {state.status === "done" && state.results.length > 0 ? (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {state.results.map(({ station, km }) => {
              const style = categoryStyle(station.category);
              return (
                <li key={station.id}>
                  <Link
                    href={`/stations/${encodeURIComponent(station.id)}`}
                    className="group block rounded-xl border border-line/70 bg-ink/40 px-4 py-3 transition-colors hover:border-signal/40"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium text-fog group-hover:text-signal">
                        {station.shortName}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">{km.toFixed(0)} km</span>
                    </span>
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <span
                        className="num text-[26px] font-semibold leading-none tracking-[-0.04em]"
                        style={{ color: style.hex }}
                      >
                        {station.api}
                      </span>
                      <CategoryBadge category={station.category} />
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
                      <span>
                        {station.time} MYT
                        {station.freshness !== "Current" ? ` · ${station.freshness}` : ""}
                      </span>
                      <DeltaChip direction={station.direction} delta={station.delta} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
