import type { LngLatBoundsLike } from "maplibre-gl";
import type { ExplorerStation } from "@/lib/present";

// Replacement styles must retain attribution in their source metadata.
export const MAP_PROVIDER = {
  style: "https://tiles.openfreemap.org/styles/positron",
};

export const MALAYSIA_BOUNDS: LngLatBoundsLike = [[99.5, 0.8], [119.6, 7.5]];

export function hasMapCoordinates(station: Pick<ExplorerStation, "lat" | "lng">): boolean {
  return Number.isFinite(station.lat) && Number.isFinite(station.lng)
    && station.lat >= -90 && station.lat <= 90
    && station.lng >= -180 && station.lng <= 180;
}

export function markerLabel(station: Pick<ExplorerStation, "name" | "api">): string {
  return `${station.name} · ${station.api === null ? "No reading" : `API ${station.api}`}`;
}
