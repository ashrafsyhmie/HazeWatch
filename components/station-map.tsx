"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as LibreMap, Marker } from "maplibre-gl";
import { CATEGORIES, categoryStyle } from "@/lib/categories";
import { MAP_PROVIDER, MALAYSIA_BOUNDS, hasMapCoordinates, markerLabel } from "@/lib/map";
import type { ExplorerStation } from "@/lib/present";
import { formatDateTime } from "@/lib/format";

export function StationMap({ stations, selectedId, onSelect }: {
  stations: ExplorerStation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Marker[]>([]);
  const selectionRef = useRef(selectedId);
  const [map, setMap] = useState<LibreMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let instance: LibreMap | undefined;
    let resize: ResizeObserver | undefined;
    const timeout = window.setTimeout(() => {
      if (!disposed) setStatus("error");
    }, 20000);

    import("maplibre-gl").then(({ Map, NavigationControl, AttributionControl, setWorkerUrl }) => {
      if (disposed || !containerRef.current) return;
      // Emit the matching worker as a local asset instead of resolving it against the page URL.
      setWorkerUrl(new URL("../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
      instance = new Map({
        container: containerRef.current,
        style: MAP_PROVIDER.style,
        bounds: MALAYSIA_BOUNDS,
        fitBoundsOptions: { padding: 40 },
        maxZoom: 16,
        attributionControl: false,
      });
      instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
      instance.addControl(new AttributionControl({ compact: false }), "bottom-right");
      instance.on("load", () => {
        if (disposed) return;
        window.clearTimeout(timeout);
        setStatus("ready");
      });
      instance.on("error", () => {
        if (!disposed) {
          window.clearTimeout(timeout);
          setStatus("error");
        }
      });
      resize = new ResizeObserver(() => instance?.resize());
      resize.observe(containerRef.current);
      setMap(instance);
    }).catch(() => {
      if (!disposed) {
        window.clearTimeout(timeout);
        setStatus("error");
      }
    });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      resize?.disconnect();
      instance?.remove();
    };
  }, [attempt]);

  useEffect(() => {
    if (!map) return;
    let disposed = false;
    const markers: Marker[] = [];
    import("maplibre-gl").then(({ Marker, LngLatBounds, Popup }) => {
      if (disposed) return;
      const bounds = new LngLatBounds();
      for (const station of stations.filter(hasMapCoordinates)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "station-marker";
        button.dataset.stationId = station.id;
        button.textContent = station.api === null ? "—" : String(station.api);
        button.setAttribute("aria-label", markerLabel(station));
        button.style.color = categoryStyle(station.api === null ? "unavailable" : station.category).hex;
        button.onclick = () => onSelect(station.id);
        const details = document.createElement("section");
        details.setAttribute("aria-label", "Station information");
        const name = document.createElement("h3");
        name.className = "text-sm font-semibold text-fog";
        name.textContent = station.name;
        const state = document.createElement("p");
        state.className = "mt-1 text-xs text-muted";
        state.textContent = station.state;
        const reading = document.createElement("p");
        reading.className = "mt-3 text-sm font-medium";
        reading.style.color = button.style.color;
        reading.textContent = station.api === null
          ? "— · No reading available"
          : `API ${station.api} · ${categoryStyle(station.category).label}`;
        const updated = document.createElement("p");
        updated.className = "mt-2 text-xs leading-relaxed text-muted";
        updated.textContent = `DOE APIMS · ${station.observedAt ? formatDateTime(station.observedAt) : "Observation time unavailable"} · ${station.freshness}`;
        const link = document.createElement("a");
        link.className = "mt-3 inline-block text-xs text-signal";
        link.href = `/stations/${encodeURIComponent(station.id)}`;
        link.textContent = "View station history →";
        link.onpointerenter = () => router.prefetch(link.getAttribute("href") ?? "/stations");
        link.onclick = (event) => {
          event.preventDefault();
          router.push(link.getAttribute("href") ?? "/stations");
        };
        details.append(name, state, reading, updated, link);
        const popup = new Popup({ offset: 20, maxWidth: "260px", className: "station-popup" })
          .setDOMContent(details);
        const marker = new Marker({ element: button })
          .setLngLat([station.lng, station.lat])
          .setPopup(popup)
          .addTo(map);
        markers.push(marker);
        bounds.extend([station.lng, station.lat]);
      }
      markersRef.current = markers;
      map.fitBounds(bounds.isEmpty() ? MALAYSIA_BOUNDS : bounds, { padding: 48, maxZoom: 10, duration: 0 });
      for (const marker of markers) {
        const button = marker.getElement();
        button.setAttribute("aria-pressed", String(button.dataset.stationId === selectionRef.current));
      }
    }).catch(() => { if (!disposed) setStatus("error"); });
    return () => {
      disposed = true;
      markers.forEach((marker) => marker.remove());
    };
  }, [map, stations, onSelect, router]);

  useEffect(() => {
    selectionRef.current = selectedId;
    for (const marker of markersRef.current) {
      const button = marker.getElement();
      button.setAttribute("aria-pressed", String(button.dataset.stationId === selectedId));
    }
  }, [selectedId]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-surface">
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} role="region" aria-label="Malaysia air-quality station map" className="h-full w-full" />
        {status !== "ready" ? (
          <div role="status" className="absolute left-3 right-12 top-12 rounded-xl border border-line bg-ink/95 p-4 text-xs text-muted">
            {status === "loading" ? "Loading Malaysia map…" : (
              <>
                <p>Basemap unavailable or incomplete. Station readings remain available in the list.</p>
                <button type="button" className="mt-2 rounded-lg border border-line px-3 py-2 text-signal" onClick={() => {
                  setMap(null);
                  setStatus("loading");
                  setAttempt((value) => value + 1);
                }}>Retry map</button>
              </>
            )}
          </div>
        ) : null}
        {status === "ready" && !stations.some(hasMapCoordinates) ? (
          <p role="status" className="absolute left-3 right-12 top-12 rounded-xl border border-line bg-ink/95 p-4 text-xs text-muted">No stations with coordinates match these filters.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-3 py-2">
        {[...CATEGORIES, categoryStyle("unavailable")].map((category) => (
          <span key={category.label} className="inline-flex items-center gap-1.5 text-[9px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.hex }} />
            {category.label}
          </span>
        ))}
      </div>
    </div>
  );
}
