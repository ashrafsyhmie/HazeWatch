import Link from "next/link";
import { AiExplainer } from "@/components/ai-explainer";
import { MonthlyChart, TrendChart } from "@/components/charts";
import { DataUnavailable } from "@/components/data-unavailable";
import { ForecastPanel } from "@/components/forecast-panel";
import { PreferredStationCard } from "@/components/preferred-station";
import { StationExplorer } from "@/components/station-explorer";
import {
  CategoryBadge,
  DeltaChip,
  FreshnessBadge,
  ModeNotice,
  QuickLink,
  SectionHeading,
  SourceLinks,
} from "@/components/ui";
import { CATEGORIES, categoryFromApi, categoryStyle } from "@/lib/categories";
import {
  getForecastStatus,
  getMonthlyHistory,
  getSnapshot,
  SOURCES,
} from "@/lib/data";
import { fallbackExplanation, factsForNational } from "@/lib/explain";
import { formatDateTime, formatMonth, formatTime } from "@/lib/format";
import {
  buildMonthlyRows,
  PARTICULATE_SERIES,
  toExplorerStations,
  toTrendSeries,
} from "@/lib/present";
import type { Snapshot } from "@/lib/types";

export const revalidate = 300;
export const dynamic = "force-static";


function shortName(name: string): string {
  return (name.split(",")[0] ?? name).trim();
}

function SnapshotStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted">
        {label}
      </p>
      <p className="num mt-1 truncate text-[15px] font-medium text-fog">{value}</p>
      {sub ? (
        <p className="mt-0.5 truncate text-[11px] text-muted">{sub}</p>
      ) : null}
    </div>
  );
}

export default async function OverviewPage() {
  let snapshot: Snapshot;
  try {
    snapshot = await getSnapshot();
  } catch {
    return <DataUnavailable />;
  }

  const [forecast, monthly] = await Promise.all([
    getForecastStatus(),
    getMonthlyHistory(),
  ]);

  const explorer = toExplorerStations(snapshot);
  const pinnedCandidates = explorer.map((station) => ({
    id: station.id,
    name: station.name,
    shortName: station.shortName,
    state: station.state,
    api: station.api,
    category: station.category,
    time: station.time,
    freshness: station.freshness,
  }));
  const facts = factsForNational(snapshot);
  const initialExplanation = fallbackExplanation(facts);
  const aiEnabled = Boolean(process.env.GEMINI_API_KEY);

  const { rows: monthlyRows, latest } = buildMonthlyRows(monthly.points);
  const pm25 = latest.find((item) => item.key === "PM25");
  const recentMonths = monthlyRows.slice(-60);

  const reporting = snapshot.coverage.reporting;
  const total = snapshot.coverage.total;
  const median = snapshot.national?.median ?? null;
  const medianCategory = categoryFromApi(median);

  const highest = snapshot.comparable.reduce<(typeof snapshot.comparable)[number] | null>(
    (best, station) =>
      station.api !== null && (!best || (best.api ?? -1) < station.api)
        ? station
        : best,
    null,
  );

  const latestLabel = snapshot.latestObservedAt
    ? formatDateTime(snapshot.latestObservedAt)
    : "No complete hour";

  return (
    <div className="pb-6">
      <section className="mx-auto w-full max-w-[1240px] px-5 pb-6 pt-8 sm:px-8 sm:pt-10">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.92fr] md:items-stretch">
          <div>
            <h1 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.035em] text-fog sm:text-[32px]">
              Air quality across Malaysia
            </h1>
            <p className="mt-3 max-w-[520px] text-[13px] leading-relaxed text-muted sm:text-[14px]">
              Your national air-quality overview. Explore official station
              readings, follow recent trends, and see where conditions are changing.
            </p>

            <div className="mt-5">
              <SourceLinks sources={[SOURCES[0], SOURCES[1]]} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Latest observation: {latestLabel} · All times MYT
            </p>
          </div>

          <div className="panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-muted">
                National snapshot
              </p>
              <FreshnessBadge freshness={snapshot.freshness} />
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="num text-[44px] font-semibold leading-none tracking-[-0.05em] text-fog">
                  {median ?? "—"}
                </p>
                <p className="mt-2 max-w-[210px] text-[11px] leading-relaxed text-muted">
                  Median API across {reporting} reporting station
                  {reporting === 1 ? "" : "s"}
                </p>
              </div>
              <CategoryBadge category={medianCategory} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line/70 pt-3">
              <SnapshotStat label="Reporting" value={`${reporting}/${total}`} />
              <SnapshotStat
                label="Highest"
                value={highest?.api !== null && highest?.api !== undefined ? String(highest.api) : "—"}
                sub={highest ? shortName(highest.name) : undefined}
              />
              <SnapshotStat
                label="Observed"
                value={
                  snapshot.latestObservedAt
                    ? formatTime(snapshot.latestObservedAt)
                    : "—"
                }
                sub="MYT"
              />
            </div>

            <div className="mt-3">
              <div
                className="flex h-2 overflow-hidden rounded-full bg-white/[0.05]"
                role="img"
                aria-label="Distribution of stations by API category"
              >
                {CATEGORIES.map((category) => {
                  const count = snapshot.counts[category.key];
                  if (count === 0 || reporting === 0) return null;
                  return (
                    <span
                      key={category.key}
                      style={{
                        width: `${(count / reporting) * 100}%`,
                        backgroundColor: category.hex,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                {CATEGORIES.map((category) => (
                  <span
                    key={category.key}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: category.hex }}
                    />
                    {snapshot.counts[category.key]} {category.label}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {latestLabel}. Stations reporting a different hour are excluded
              from this snapshot, so the median is always like-for-like.
            </p>
          </div>
        </div>

      </section>

      <section id="stations" className="mx-auto w-full max-w-[1240px] scroll-mt-28 px-5 sm:px-8">
        <SectionHeading
          title="Air quality across Malaysia"
          description="Select any verified APIMS station to see its current reading, category, timestamp and recent movement. Filter by state or search by location."
          action={<QuickLink href="/stations">Full station index</QuickLink>}
        />
        <div className="mt-5">
          <StationExplorer stations={explorer} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <SourceLinks sources={[SOURCES[0]]} compact />
          <p className="text-[11px] text-muted">Published APIMS station coordinates · Updated {latestLabel}</p>
        </div>
        <div className="mt-4 empty:hidden">
          <PreferredStationCard candidates={pinnedCandidates} />
        </div>
        <div className="mt-4">
          <ModeNotice notice={snapshot.notice} mode={snapshot.mode} />
        </div>
      </section>

      <div className="mx-auto mt-5 w-full max-w-[1240px] px-5 sm:px-8">
        <a href="#trends" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ember/25 bg-ember/[0.06] px-5 py-4 transition-colors hover:border-ember/60">
          <div>
            <p className="text-sm font-medium text-ember">Conditions watch · Observed change</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {snapshot.insights.length > 0
                ? `${snapshot.insights.length} station${snapshot.insights.length === 1 ? "" : "s"} in the watch list rose at least 10 API points over about six hours.`
                : "No worsening threshold detected in available comparisons. Missing history is not an all-clear."}
            </p>
          </div>
          <span className="text-xs text-ember">Review trends →</span>
        </a>
      </div>

      <section id="trends" className="mx-auto mt-12 w-full max-w-[1240px] scroll-mt-36 px-5 sm:px-8">
        <SectionHeading
          title="What changed in the last six hours"
          description="HazeWatch compares each station's latest reading with the reading about six hours earlier. A move of at least 10 API points is treated as a trend; anything smaller is stable."
        />
        {highest ? (
          <div className="panel mt-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] text-muted">Station spotlight · Highest in this snapshot</p>
                <h3 className="mt-2 text-lg font-medium">{shortName(highest.name)} <span className="text-sm font-normal text-muted">· {highest.stateName}</span></h3>
                <p className="mt-1 text-xs text-muted">Latest {Math.min(highest.series.length, 24)} available readings · API · MYT</p>
              </div>
              <CategoryBadge category={highest.category} />
            </div>
            <div className="mt-5">
              <TrendChart points={toTrendSeries(highest)} color={categoryStyle(highest.category).hex} height={240} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-xs leading-relaxed text-muted">DOE APIMS · Updated {highest.observedAt ? formatDateTime(highest.observedAt) : "—"}. Available observations only; intervals may have gaps.</p>
              <QuickLink href={`/stations/${encodeURIComponent(highest.externalId)}`}>Station details</QuickLink>
            </div>
          </div>
        ) : null}
        <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-medium text-fog">
                 Worsening-condition watch
              </h3>
              <span className="text-[11px] text-muted">
                Last 6h
              </span>
            </div>

            {snapshot.insights.length === 0 ? (
              <div className="py-8">
                <p className="text-[13px] text-fog">
                  No station crossed the worsening threshold.
                </p>
                <p className="mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-muted">
                  Every reporting station either improved, held steady, or had
                  too little history for a six-hour comparison.
                </p>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-line/60">
                {snapshot.insights.map((insight) => (
                  <li key={insight.externalId}>
                    <Link
                      href={`/stations/${encodeURIComponent(insight.externalId)}`}
                      className="group flex items-center gap-3 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-fog group-hover:text-signal">
                          {shortName(insight.name)}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted">
                          {insight.stateName} · {insight.previous} → {insight.latest}
                        </span>
                      </span>
                      <DeltaChip direction="worsening" delta={insight.delta} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">
              This is an observation of recent change, not a forecast or an
              official warning. A rise can reverse in the next hour.
            </p>
          </div>

          <AiExplainer
            scope="national"
            initial={initialExplanation}
            aiEnabled={aiEnabled}
          />
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1240px] px-5 sm:px-8">
        <SectionHeading
          title="Official forecasts and long-run context"
          description="Two different products, kept separate on purpose: official MyCMAQ map forecasts and OpenDOSM's national monthly history."
        />
        <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
          <ForecastPanel status={forecast} />

          <section className="panel flex flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted">
                  National history · separate source
                </p>
                <h2 className="mt-1.5 text-[15px] font-medium text-fog">
                  Monthly particulate context
                </h2>
              </div>
              <span className="shrink-0 rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted">
                OpenDOSM
              </span>
            </div>

            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              Monthly national concentrations. Not station readings and not a
              forecast.
            </p>

            <div className="mt-4">
              <MonthlyChart
                rows={recentMonths}
                series={PARTICULATE_SERIES}
                unit="µg/m³"
                height={214}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line/60 pt-3">
              <div>
                <p className="text-[11px] text-muted">
                  Latest monthly PM2.5
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="num text-[19px] font-medium text-fog">
                    {pm25 ? pm25.value : "—"}
                  </span>
                  <span className="text-[11px] text-muted">µg/m³</span>
                  {pm25 ? (
                    <span className="text-[11px] text-muted">
                      {formatMonth(pm25.month)}
                    </span>
                  ) : null}
                </p>
              </div>
              <QuickLink href="/history">Open national history</QuickLink>
            </div>

            {monthly.notice ? (
              <p className="mt-3 text-[11px] leading-relaxed text-moderate/90">
                {monthly.notice}
              </p>
            ) : null}
          </section>
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1240px] px-5 sm:px-8">
        <div className="rounded-2xl border border-line/70 bg-surface/60 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[12.5px] font-medium text-fog">
                One index, three layers of certainty
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Observations come from DOE&apos;s APIMS feed. Official
                forecasts come from MetMalaysia&apos;s MyCMAQ maps.
                HazeWatch&apos;s trends and briefings are our own analysis —
                labelled, rule-based, and never mixed with the official index.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/methodology">Read the method</QuickLink>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <SourceLinks sources={snapshot.sources} compact />
            <p className="text-[11px] text-muted">Page checked {formatDateTime(snapshot.now)} · MYT</p>
          </div>
        </div>
      </section>
    </div>
  );
}
