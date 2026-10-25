import { formatDateTime, formatMonth, formatTime } from "@/lib/format";
import type {
  CategoryKey,
  MonthlyPoint,
  Snapshot,
  StationSnapshot,
  TrendDirection,
} from "@/lib/types";

export type ExplorerStation = {
  id: string;
  name: string;
  shortName: string;
  state: string;
  lat: number;
  lng: number;
  api: number | null;
  category: CategoryKey;
  observedAt: string | null;
  time: string;
  freshness: string;
  delta: number | null;
  direction: TrendDirection;
  spark: number[];
};

function shortName(name: string): string {
  const [first] = name.split(",");
  return (first ?? name).trim();
}

export function toExplorerStations(snapshot: Snapshot): ExplorerStation[] {
  return snapshot.stations.map((station) => ({
    id: station.externalId,
    name: station.name,
    shortName: shortName(station.name),
    state: station.stateName,
    lat: station.latitude,
    lng: station.longitude,
    api: station.api,
    category: station.category,
    observedAt: station.observedAt,
    time: station.observedAt ? formatTime(station.observedAt) : "—",
    freshness: station.freshness.label,
    delta: station.trend.delta,
    direction: station.trend.direction,
    spark: station.series.slice(-12).map((point) => point.value),
  }));
}

export type TrendPoint = {
  label: string;
  full: string;
  value: number;
};

export function toTrendSeries(station: StationSnapshot): TrendPoint[] {
  return station.series.slice(-24).map((point) => ({
    label: formatTime(point.observedAt),
    full: formatDateTime(point.observedAt),
    value: point.value,
  }));
}

export type MonthlyChartRow = { label: string } & Record<
  string,
  string | number | null
>;

export const PARTICULATE_SERIES = [
  { key: "PM25", label: "PM2.5", color: "#b6e57a" },
  { key: "PM10", label: "PM10", color: "#e8b15c" },
];

export const GAS_SERIES = [
  { key: "O3", label: "O₃", color: "#5fcb8a" },
  { key: "NO2", label: "NO₂", color: "#c79bff" },
  { key: "SO2", label: "SO₂", color: "#8fb8ff" },
  { key: "CO", label: "CO", color: "#93a79e" },
];

export type LatestPollutant = {
  key: string;
  label: string;
  month: string;
  value: number;
  unit: string;
};

export function buildMonthlyRows(points: MonthlyPoint[]): {
  rows: MonthlyChartRow[];
  latest: LatestPollutant[];
} {
  const byMonth = new Map<string, MonthlyChartRow>();
  const latest = new Map<string, MonthlyPoint>();

  for (const point of points) {
    const key = point.pollutant.replace(".", "");
    let row = byMonth.get(point.month);
    if (!row) {
      row = { label: formatMonth(point.month) };
      byMonth.set(point.month, row);
    }
    row[key] = point.concentration;

    if (point.concentration !== null) {
      const current = latest.get(key);
      if (!current || current.month <= point.month) {
        latest.set(key, point);
      }
    }
  }

  const rows = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);

  const labels = new Map(
    [...PARTICULATE_SERIES, ...GAS_SERIES].map((item) => [item.key, item.label]),
  );

  return {
    rows,
    latest: [...latest.entries()]
      .map(([key, point]) => ({
        key,
        label: labels.get(key) ?? key,
        month: point.month,
        value: point.concentration as number,
        unit: point.unit,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export type NearestStation = { station: StationSnapshot; km: number };

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const radius = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestStations(
  stations: StationSnapshot[],
  origin: StationSnapshot,
  limit = 5,
): NearestStation[] {
  return stations
    .filter((station) => station.externalId !== origin.externalId)
    .map((station) => ({ station, km: distanceKm(origin, station) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export type StateSummary = {
  state: string;
  reporting: number;
  total: number;
  median: number | null;
  highest: { name: string; api: number; category: CategoryKey } | null;
};

export function summariseStates(snapshot: Snapshot): StateSummary[] {
  const grouped = new Map<string, StationSnapshot[]>();
  for (const station of snapshot.stations) {
    const list = grouped.get(station.stateName);
    if (list) list.push(station);
    else grouped.set(station.stateName, [station]);
  }

  return [...grouped.entries()]
    .map(([state, stations]) => {
      const reporting = stations.filter(
        (station) => station.observedAt === snapshot.latestObservedAt && station.api !== null,
      );
      const values = reporting
        .map((station) => station.api as number)
        .sort((a, b) => a - b);
      const median =
        values.length === 0
          ? null
          : values.length % 2 === 0
            ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
            : values[Math.floor(values.length / 2)];
      const top = reporting.reduce<StationSnapshot | null>(
        (best, station) =>
          !best || (station.api as number) > (best.api as number) ? station : best,
        null,
      );

      return {
        state,
        reporting: reporting.length,
        total: stations.length,
        median: median === null ? null : Math.round(median * 10) / 10,
        highest:
          top && top.api !== null
            ? { name: top.name, api: top.api, category: top.category }
            : null,
      };
    })
    .sort((a, b) => (b.highest?.api ?? -1) - (a.highest?.api ?? -1));
}
