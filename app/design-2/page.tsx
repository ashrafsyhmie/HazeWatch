import Link from "next/link";
import { StationExplorer } from "@/components/station-explorer";
import { DataUnavailable } from "@/components/data-unavailable";
import { CategoryBadge, FreshnessBadge, ModeNotice } from "@/components/ui";
import { PreferredStationCard } from "@/components/preferred-station";
import { CATEGORIES, categoryFromApi } from "@/lib/categories";
import { getSnapshot, SOURCES } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { toExplorerStations } from "@/lib/present";
import "./preview.css";

export const revalidate = 300;
export const metadata = { title: "Community observatory · Design 2" };

export default async function PastelOverview() {
  const snapshot = await getSnapshot().catch(() => null);
  if (!snapshot) return <DataUnavailable />;
  const stations = toExplorerStations(snapshot);
  const median = snapshot.national?.median ?? null;

  return (
    <div className="pastel-preview preview">
      <div className="canvas">
        <div className="previewBar">
          <span>Design 02 · Community observatory</span>
          <Link href="/">Compare original design →</Link>
        </div>

        <div className="titleRow">
          <div>
            <h1>Malaysia, in the clear.</h1>
            <p>A clearer picture of our air. Official readings, shared with everyone.</p>
          </div>
          <a href="#station-network" className="primary">Find your station <span aria-hidden="true">↗</span></a>
        </div>

        <div className="overview">
          <section className="snapshot" aria-labelledby="snapshot-heading">
            <div className="cardHeading">
              <h2 id="snapshot-heading">The national picture</h2>
              <FreshnessBadge freshness={snapshot.freshness} />
            </div>
            <div className="reading">
              <strong>{median ?? "—"}</strong>
              <div><span>Median Air Pollutant Index</span><CategoryBadge category={categoryFromApi(median)} /></div>
            </div>
            <p>Across {snapshot.coverage.reporting} stations reporting the same hour.</p>
            <div className="distribution" aria-label="Stations by official API category">
              {CATEGORIES.map(category => (
                <div key={category.key}>
                  <span style={{ backgroundColor: category.hex }} />
                  <span>{category.label}</span>
                  <strong>{snapshot.counts[category.key]}</strong>
                </div>
              ))}
            </div>
            <p className="timestamp">Observed {formatDateTime(snapshot.latestObservedAt)}. Missing readings are excluded.</p>
          </section>

          <section className="network" aria-labelledby="network-heading">
            <h2 id="network-heading">One connected network</h2>
            <p>Local observations. A nationwide perspective.</p>
            <div className="networkNumbers">
              <div><strong>{snapshot.coverage.reporting}<small> / {snapshot.coverage.total}</small></strong><span>stations in this snapshot</span></div>
              <div><strong>MYT</strong><span>one shared time zone</span></div>
            </div>
            <div className="networkNote">
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 17c6-8 12-8 18 0s12 8 22 0M4 29c6-8 12-8 18 0s12 8 22 0" /></svg>
              <p>Every reading has a place, a time, and a source.</p>
            </div>
            <Link href="/methodology">Meet the data behind the map →</Link>
          </section>
        </div>

        <ModeNotice mode={snapshot.mode} notice={snapshot.notice} />
        <section id="station-network" className="explorer" aria-labelledby="explorer-heading">
          <div className="sectionHeading">
            <div><h2 id="explorer-heading">A little closer to home</h2><p>Explore the official APIMS stations in your community.</p></div>
            <Link href="/stations">All stations →</Link>
          </div>
          <StationExplorer stations={stations} />
          <PreferredStationCard candidates={stations} />
        </section>

        <div className="contextGrid">
          <section className="changes" aria-labelledby="changes-heading">
            <div className="cardHeading"><h2 id="changes-heading">Where things are changing</h2><span>Past ~6 hours</span></div>
            <p>Observed rises of at least 10 API points. These are recent changes, not predictions.</p>
            {snapshot.insights.length ? (
              <ul>{snapshot.insights.map(insight => (
                <li key={insight.externalId}>
                  <Link href={`/stations/${encodeURIComponent(insight.externalId)}`}>
                    <span><strong>{insight.name.split(",")[0]}</strong><small>{insight.stateName} · {insight.previous} → {insight.latest} API</small></span>
                    <span className="delta">+{insight.delta}</span>
                  </Link>
                </li>
              ))}</ul>
            ) : <p className="empty">No worsening threshold detected in available comparisons. Gaps in history are not an all-clear.</p>}
          </section>
          <section className="method" aria-labelledby="method-heading">
            <h2 id="method-heading">Clarity comes from context.</h2>
            <p>Air quality is more than a single number. Follow the observations, look at the longer story, and know where each insight comes from.</p>
            <Link href="/history"><span>Explore national history</span><span aria-hidden="true">↗</span></Link>
            <a href={SOURCES[1].url} target="_blank" rel="noopener noreferrer"><span>Official MyCMAQ forecasts</span><span aria-hidden="true">↗</span></a>
            <Link href="/methodology"><span>Our sources &amp; methods</span><span aria-hidden="true">↗</span></Link>
          </section>
        </div>

        <div className="sourceNote">
          <p>Independent by design. Grounded in official data.</p>
          <span>DOE APIMS observations · All times Malaysia Time · HazeWatch is not an official warning service.</span>
        </div>
      </div>
    </div>
  );
}
