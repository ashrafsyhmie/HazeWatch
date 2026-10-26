import Link from "next/link";
import { StationExplorer } from "@/components/station-explorer";
import { MonthlyChart } from "@/components/charts";
import { DataUnavailable } from "@/components/data-unavailable";
import { DailyDigestCard } from "@/components/daily-digest";
import { ForecastPanel } from "@/components/forecast-panel";
import { CategoryBadge, FreshnessBadge, ModeNotice } from "@/components/ui";
import { PreferredStationCard } from "@/components/preferred-station";
import { CATEGORIES, categoryFromApi } from "@/lib/categories";
import { getForecastStatus, getMonthlyHistory, getSnapshot, SOURCES } from "@/lib/data";
import { getLatestDigest } from "@/lib/digest";
import { formatDateTime, formatMonth } from "@/lib/format";
import { getSeaStations } from "@/lib/openaq";
import { buildMonthlyRows, PARTICULATE_SERIES, toExplorerStations } from "@/lib/present";

const PLAIN_MEANING: Record<string, string> = {
  good: "Clean air. A good day to be outside.",
  moderate: "Most of us are fine. Sensitive groups can take it easier.",
  unhealthy: "Cut back on long or hard activity outdoors.",
  "very-unhealthy": "Stay indoors where you can, and keep windows closed.",
  hazardous: "Avoid going outside. Follow official health advice.",
};

function SkyArt() {
  return (
    <svg viewBox="0 0 520 300" aria-hidden="true" className="joy-art">
      <circle cx="404" cy="82" r="46" fill="#ffe6a8" />
      <circle cx="404" cy="82" r="66" fill="#ffe6a8" opacity=".35" />
      <g fill="#ffffff" opacity=".9">
        <ellipse cx="120" cy="78" rx="52" ry="26" />
        <ellipse cx="158" cy="86" rx="38" ry="20" />
        <ellipse cx="88" cy="88" rx="30" ry="16" />
      </g>
      <g fill="#ffffff" opacity=".65">
        <ellipse cx="310" cy="42" rx="40" ry="18" />
        <ellipse cx="344" cy="48" rx="28" ry="14" />
      </g>
      <path d="M0 214c72-42 132-42 196 0s130 40 200 0 110-38 124-30v116H0Z" fill="#cfe9d9" />
      <path d="M0 246c82-34 148-34 214 0s136 32 206 0 92-24 100-20v74H0Z" fill="#b9dfcb" />
      <g stroke="#2f5d4d" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".45">
        <path d="M74 236v-22M74 222l-9-8M74 228l8-7" />
        <path d="M448 252v-20M448 240l-8-7M448 246l7-6" />
      </g>
      <g fill="#f8d8c6">
        <rect x="186" y="232" width="34" height="26" rx="5" />
        <rect x="226" y="240" width="26" height="18" rx="5" />
        <path d="m180 232 23-16 23 16Z" fill="#eba98b" />
      </g>
    </svg>
  );
}

export default async function JoyOverview() {
  const [snapshot, digest, seaStations, forecast, monthly] = await Promise.all([
    getSnapshot().catch(() => null),
    getLatestDigest().catch(() => null),
    getSeaStations(),
    getForecastStatus(),
    getMonthlyHistory(),
  ]);
  if (!snapshot) return <DataUnavailable />;

  const stations = toExplorerStations(snapshot);
  const median = snapshot.national?.median ?? null;
  const stats = snapshot.national;
  const { rows: monthlyRows, latest } = buildMonthlyRows(monthly.points);
  const pm25 = latest.find((item) => item.key === "PM25");

  return (
    <div className="joy-root">
      <div className="joy-main">
        <div className="joy-intro">
          <h1 id="joy-title">Breathe easier.<br />Stay informed.</h1>
          <p>Understand the air around you with official hourly readings, linked forecast maps, and clear environmental context—all in one place.</p>
          <p>Explore conditions across Malaysia, check your local station, and see how air quality changes.</p>
        </div>

        <section className="joy-section joy-pinned" id="your-station" aria-labelledby="pinned-title">
          <div className="joy-section-head">
            <h2 id="pinned-title">Your station</h2>
          </div>
          <PreferredStationCard candidates={stations} showEmpty />
        </section>

        <section className="joy-section joy-finder-wrap" id="stations" aria-labelledby="finder-title">
          <div className="joy-section-head"><h2 id="finder-title">Explore the map</h2></div>
          <div className="joy-finder">
            <StationExplorer stations={stations} seaStations={seaStations} mapTheme="pastel" />
          </div>
        </section>

        <section className="joy-section joy-cities" aria-labelledby="cities-title">
          <div className="joy-section-head">
            <h2 id="cities-title">Across Southeast Asia</h2>
            <p>Check air quality in nearby cities.</p>
          </div>
          {seaStations.length ? (
            <div className="joy-city-grid">
              {seaStations.map((station) => (
                <article className="joy-city" key={station.id}>
                  <h3>{station.city}</h3>
                  <p>{station.country}</p>
                  <strong>{Math.round(station.pm25)} <small>µg/m³ PM2.5</small></strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="joy-empty">No recent regional readings. Malaysian stations remain available on the map.</p>
          )}
        </section>

        <section className="joy-hero joy-section" id="today" aria-labelledby="today-title">
          <div className="joy-hero-copy">
            <h2 id="today-title">Malaysia at a glance</h2>
            <p className="joy-lede">A national median across reporting APIMS stations, not a reading for your neighbourhood.</p>
            <Link href="/methodology" className="joy-link">How we read the air</Link>
          </div>
          <div className="joy-sky">
            <SkyArt />
            <div className="joy-sky-card">
              <div className="joy-sky-head">
                <span>Right now, nationwide</span>
                <FreshnessBadge freshness={snapshot.freshness} />
              </div>
              <div className="joy-sky-reading">
                <strong>{median ?? "—"}</strong>
                <div>
                  <span className="joy-sky-unit">API</span>
                  <CategoryBadge category={categoryFromApi(median)} />
                </div>
              </div>
              <p className="joy-sky-note">A typical reading across {snapshot.coverage.reporting} reporting stations.</p>
              <div className="joy-sky-stats">
                <div><strong>{stats?.min ?? "—"}</strong><span>lowest station</span></div>
                <div><strong>{median ?? "—"}</strong><span>national median</span></div>
                <div><strong>{stats?.max ?? "—"}</strong><span>highest station</span></div>
              </div>
              <p className="joy-asof">Observed {formatDateTime(snapshot.latestObservedAt)} · Malaysia Time</p>
            </div>
          </div>
        </section>

        <ModeNotice mode={snapshot.mode} notice={snapshot.notice} />

        <section className="joy-section" aria-labelledby="meaning-title">
          <div className="joy-section-head">
            <h2 id="meaning-title">What the numbers mean</h2>
            <p>Malaysia&rsquo;s official API bands. The words carry the meaning &mdash; colour is only a helper.</p>
          </div>
          <div className="joy-legend">
            {CATEGORIES.map((category) => (
              <article key={category.key} className="joy-legend-card" data-tone={category.key}>
                <span className="joy-dot" style={{ backgroundColor: category.hex }} aria-hidden="true" />
                <h3>{category.label}</h3>
                <p className="joy-range">API {category.range}</p>
                <p>{PLAIN_MEANING[category.key]}</p>
                <p className="joy-count"><strong>{snapshot.counts[category.key]}</strong>{" "}{snapshot.counts[category.key] === 1 ? "station" : "stations"}</p>
              </article>
            ))}
          </div>
        </section>

        {digest ? (
          <div className="joy-section joy-digest-wrap"><DailyDigestCard digest={digest} /></div>
        ) : null}

        <section className="joy-section" aria-labelledby="changes-title">
          <div className="joy-split">
            <div>
              <h2 id="changes-title">Where the air is shifting</h2>
              <p className="joy-sub">
                A few places rose by 10 API points or more in the last six
                hours. These are observed changes, not predictions.
              </p>
              {snapshot.insights.length ? (
                <ul className="joy-changes">
                  {snapshot.insights.map((insight) => (
                    <li key={insight.externalId}>
                      <Link href={`/stations/${encodeURIComponent(insight.externalId)}`}>
                        <span>
                          <strong>{insight.name.split(",")[0]}</strong>
                          <small>
                            {insight.stateName} · {insight.previous} →{" "}
                            {insight.latest} API
                          </small>
                        </span>
                        <span className="joy-delta">+{insight.delta}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="joy-empty">
                  No worsening threshold in the readings we can compare. A gap
                  in history is not an all-clear.
                </p>
              )}
            </div>

            <aside className="joy-source" aria-labelledby="source-title">
              <h2 id="source-title">You can check us</h2>
              <p>
                Every reading comes with a time and a place. Follow the trail
                back to the official source.
              </p>
              <ul>
                {SOURCES.map((source) => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <span>
                        {source.name}
                        <small>{source.attribution}</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
                <li>
                  <a href="https://openaq.org/" target="_blank" rel="noopener noreferrer">
                    <span>OpenAQ<small>Regional PM2.5 · third-party monitors</small></span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              </ul>
              <p className="joy-caveat">
                HazeWatch is an independent public project, not an official
                warning service. For health advice, follow the Ministry of
                Health.
              </p>
            </aside>
          </div>
        </section>

        <section className="joy-section" aria-labelledby="context-title">
          <div className="joy-section-head">
            <h2 id="context-title">Forecast and longer view</h2>
            <p>Official forecast maps and monthly national measurements, kept separate from hourly station readings.</p>
          </div>
          <div className="joy-context-grid">
            <ForecastPanel status={forecast} />
            <div className="panel p-5 sm:p-6">
              <h3>Malaysia&rsquo;s monthly particulates</h3>
              <p>National concentrations · µg/m³ · OpenDOSM</p>
              <MonthlyChart rows={monthlyRows.slice(-60)} series={PARTICULATE_SERIES} unit="µg/m³" height={220} />
              <p>Latest PM2.5: {pm25 ? `${pm25.value} µg/m³ · ${formatMonth(pm25.month)}` : "No reading"}</p>
              {monthly.notice ? <p>{monthly.notice}</p> : null}
              <Link href="/history" className="joy-link">Explore history →</Link>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
