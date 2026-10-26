import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiExplainer } from "@/components/ai-explainer";
import { TrendChart } from "@/components/charts";
import { DataUnavailable } from "@/components/data-unavailable";
import { SaveStationButton } from "@/components/preferred-station";
import {
  CategoryBadge,
  DeltaChip,
  FreshnessBadge,
  ModeNotice,
  QuickLink,
} from "@/components/ui";
import { categoryFromApi, categoryStyle } from "@/lib/categories";
import { getSnapshot, getStation } from "@/lib/data";
import { fallbackExplanation, factsForStation } from "@/lib/explain";
import {
  formatAge,
  formatCoord,
  formatDateTime,
  formatTime,
} from "@/lib/format";
import { nearestStations, toTrendSeries } from "@/lib/present";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const snapshot = await getSnapshot();
    return snapshot.stations.map((station) => ({
      stationId: station.externalId,
    }));
  } catch {
    return [];
  }
}

type PageParams = { params: Promise<{ stationId: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { stationId } = await params;
  try {
    const { station } = await getStation(stationId);
    return {
      title: station ? station.name : "Station",
      description: station
        ? `Latest APIMS reading and recent history for ${station.name}, ${station.stateName}.`
        : "APIMS station details.",
    };
  } catch {
    return { title: "Station" };
  }
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted">
        {label}
      </p>
      <p className="num mt-1 text-[16px] font-medium text-fog">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function StationPage({ params }: PageParams) {
  const { stationId } = await params;

  let station;
  let snapshot;
  try {
    const result = await getStation(stationId);
    station = result.station;
    snapshot = result.snapshot;
  } catch {
    return <DataUnavailable />;
  }

  if (!station) notFound();

  const style = categoryStyle(station.category);
  const facts = factsForStation(station, snapshot);
  const initialExplanation = fallbackExplanation(facts);
  const aiEnabled = Boolean(process.env.GEMINI_API_KEY);

  const series = toTrendSeries(station);
  const window = station.series.slice(-24);
  const low = window.reduce<{ value: number; observedAt: string } | null>(
    (best, point) => (!best || point.value < best.value ? point : best),
    null,
  );
  const comparable = station.observedAt === snapshot.latestObservedAt;
  const derived = categoryFromApi(station.api);
  const derivedStyle = categoryStyle(derived);
  const mismatch =
    station.sourceClass !== null && station.api !== null && derived !== station.category;
  const nearby = nearestStations(snapshot.stations, station);

  const [localityPart, ...restParts] = station.name.split(",");
  const locality = (localityPart ?? station.name).trim();
  const remainder = restParts.join(",").trim();

  return (
    <div className="joy-page joy-detail pb-6">
      <section className="mx-auto w-full max-w-[1240px] px-5 pt-8 sm:px-8 sm:pt-10">
        <p className="flex items-center gap-2 text-[11px] text-muted">
          <Link href="/stations" className="inline-flex min-h-11 items-center hover:text-fog">
            Stations
          </Link>
          <span aria-hidden="true" className="text-muted/40">
            /
          </span>
          <span>{station.stateName}</span>
        </p>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-medium leading-[1.05] tracking-[-0.045em] text-fog sm:text-[46px]">
              {locality}
            </h1>
            <p className="mt-2 text-[12px] text-muted">
              {remainder || station.stateName} · Station {station.externalId} ·{" "}
              {formatCoord(station.latitude)}, {formatCoord(station.longitude)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!comparable ? (
              <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted">
                Not in latest hour
              </span>
            ) : null}
            <FreshnessBadge freshness={station.freshness} />
            <SaveStationButton
              stationId={station.externalId}
              name={station.name}
            />
          </div>
        </div>

        <div className="mt-4">
          <ModeNotice notice={snapshot.notice} mode={snapshot.mode} />
        </div>

        <div className="mt-7 grid gap-3 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-muted">
                Latest observation
              </p>
              <span className="text-[11px] text-muted">
                MY-API
              </span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <span
                 className="num text-[48px] font-semibold leading-none tracking-[-0.06em]"
                style={{ color: style.hex }}
              >
                {station.api ?? "—"}
              </span>
              <div className="pb-1.5">
                <CategoryBadge category={station.category} />
                <p className="mt-2 text-[11px] text-muted">Air Pollutant Index</p>
              </div>
            </div>

            <p className="mt-4 text-[11.5px] text-muted">
              {formatDateTime(station.observedAt)} ·{" "}
              {formatAge(station.observedAt, snapshot.now)}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-ink/40 px-3.5 py-3">
              <div>
                <p className="text-[11px] text-muted">
                  {station.trend.comparisonHours}-hour change
                </p>
                <p className="num mt-1 text-[12px] text-fog">
                  {station.trend.previous ?? "—"} → {station.trend.latest ?? "—"}
                </p>
              </div>
              <DeltaChip
                direction={station.trend.direction}
                delta={station.trend.delta}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line/70 pt-4">
              <Stat
                label="24h peak"
                value={station.trend.peak ? String(station.trend.peak.value) : "—"}
                hint={
                  station.trend.peak
                    ? `${formatTime(station.trend.peak.observedAt)} MYT`
                    : undefined
                }
              />
              <Stat
                label="24h low"
                value={low ? String(low.value) : "—"}
                hint={low ? `${formatTime(low.observedAt)} MYT` : undefined}
              />
              <Stat
                label="Readings"
                value={String(station.series.length)}
                hint="in window"
              />
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted">
                  Recent series
                </p>
                <h2 className="mt-1.5 text-[15px] font-medium text-fog">
                  Hourly API, Malaysia time
                </h2>
              </div>
              <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted">
                {series.length} points
              </span>
            </div>

            <div className="mt-4">
              <TrendChart points={series} color={style.hex} height={264} />
            </div>

            <p className="mt-3 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">
              {station.trend.reason}
            </p>
          </div>
        </div>

        {mismatch ? (
          <div className="mt-3 rounded-xl border border-moderate/25 bg-moderate/[0.06] px-4 py-3">
            <p className="text-[11px] leading-relaxed text-moderate/90">
              The source published this station as{" "}
              <span className="font-medium">{categoryStyle(station.category).label}</span>
              , while the numeric band for API {station.api} maps to{" "}
              <span className="font-medium">{derivedStyle.label}</span>. HazeWatch
              displays the source classification and keeps the raw value intact.
            </p>
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className="panel flex h-full flex-col p-5 sm:p-6">
            <p className="text-[11px] font-medium text-muted">
              HazeWatch analysis
            </p>
            <h2 className="mt-1.5 text-[15px] font-medium text-fog">
              How this reading is classified
            </h2>

            <p className="mt-3 text-[12.5px] leading-relaxed text-fog/75">
              {station.api === null
                ? "This station has no numeric reading in the latest hourly window, so no category is assigned."
                : `API ${station.api} falls in the ${style.label} band (${style.range}), using Malaysia's official APIMS scale.`}
            </p>

            <ul className="mt-4 space-y-2.5 text-[11.5px] leading-relaxed text-fog/65">
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-signal/70"
                />
                <span>
                  <span className="text-fog/90">Comparison:</span>{" "}
                  {station.trend.reason}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-signal/70"
                />
                <span>
                  <span className="text-fog/90">Rule:</span> a move of at least
                  10 API points over roughly six hours is treated as a trend.
                  Smaller moves are labelled stable.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-signal/70"
                />
                <span>
                  <span className="text-fog/90">Not a forecast:</span> this page
                  describes observed hours only. It does not project the next
                  reading.
                </span>
              </li>
            </ul>

            <div className="mt-auto pt-5">
              <div className="flex flex-wrap gap-2 border-t border-line/60 pt-3.5">
                <QuickLink href={`/methodology#categories`}>
                  Category boundaries
                </QuickLink>
                <QuickLink href="/history">National context</QuickLink>
              </div>
            </div>
          </section>

          <AiExplainer
            scope="station"
            stationId={station.externalId}
            initial={initialExplanation}
            aiEnabled={aiEnabled}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <p className="text-[11px] font-medium text-muted">
              Station record
            </p>
            <h2 className="mt-1.5 text-[15px] font-medium text-fog">
              Source and timing
            </h2>
            <dl className="mt-4 space-y-2.5">
              {[
                ["Station ID", station.externalId],
                ["State", station.stateName],
                [
                  "Coordinates",
                  `${formatCoord(station.latitude)}, ${formatCoord(station.longitude)}`,
                ],
                ["Observed at", formatDateTime(station.observedAt)],
                ["Index scheme", "Malaysia API (MY-API)"],
                [
                  "Published class",
                  station.sourceClass ?? "Not published for this hour",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-line/50 pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-[11px] text-muted">
                    {label}
                  </dt>
                  <dd className="text-right text-[11.5px] text-fog/85">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              Timestamps are normalised from APIMS Malaysia wall-clock values to
              UTC for storage and shown here in Malaysia time. The source&apos;s
              epoch field is not treated as the observation instant.
            </p>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted">
                  Nearest stations
                </p>
                <h2 className="mt-1.5 text-[15px] font-medium text-fog">
                  Compare the surrounding network
                </h2>
              </div>
              <Link
                href="/stations"
                className="inline-flex min-h-11 shrink-0 items-center text-[11px] text-muted hover:text-signal"
              >
                Index →
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-line/60">
              {nearby.map(({ station: neighbour, km }) => {
                const neighbourStyle = categoryStyle(neighbour.category);
                return (
                  <li key={neighbour.externalId}>
                    <Link
                      href={`/stations/${encodeURIComponent(neighbour.externalId)}`}
                      className="group flex items-center gap-3 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: neighbourStyle.hex }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-fog group-hover:text-signal">
                          {neighbour.name.split(",")[0]}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {neighbour.stateName} · {km.toFixed(0)} km away
                        </span>
                      </span>
                      <span
                        className="num text-[15px] font-medium"
                        style={{ color: neighbourStyle.hex }}
                      >
                        {neighbour.api ?? "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/stations"
            className="inline-flex min-h-11 items-center text-[11.5px] text-muted hover:text-fog"
          >
            ← All stations
          </Link>
          <p className="max-w-lg text-right text-[11px] leading-relaxed text-muted">
            Official forecast products for this period are published separately
            by MetMalaysia. HazeWatch does not derive numeric forecasts from map
            images.
          </p>
        </div>
      </section>
    </div>
  );
}
