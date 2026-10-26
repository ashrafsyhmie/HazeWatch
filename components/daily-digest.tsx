import Link from "next/link";
import { categoryFromApi, categoryStyle } from "@/lib/categories";
import type { DailyDigest } from "@/lib/digest";
import { formatDay } from "@/lib/format";

export function DailyDigestCard({ digest }: { digest: DailyDigest }) {
  const { facts, summary } = digest;
  const peakCategory = facts.peakMedian
    ? categoryStyle(categoryFromApi(facts.peakMedian.api))
    : null;
  const mover = facts.movers[0];
  const scale = Math.max(facts.highest?.api ?? 0, facts.peakMedian?.api ?? 0, 1);

  return (
    <section className="joy-digest" aria-labelledby="digest-title">
      <div className="joy-digest-top">
        <p className="joy-digest-kicker">
          Daily summary · {formatDay(facts.day)}
        </p>
        <span className="joy-digest-tag">
          {digest.source === "gemini" ? "Gemini summary" : "Rule-based summary"}
        </span>
      </div>

      <h2 id="digest-title">{summary.headline}</h2>

      {facts.highest && facts.peakMedian && peakCategory ? (
        <div className="joy-digest-bars" aria-label={`On ${formatDay(facts.day)}, ${facts.highest.name} had the highest station API at ${facts.highest.api}; the national median peaked at ${facts.peakMedian.api} at ${facts.peakMedian.hour} MYT`} role="img">
          <div>
            <span title={facts.highest.name}>Highest station</span>
            <strong>{facts.highest.api}</strong>
            <div className="joy-digest-track"><span style={{ width: `${(facts.highest.api / scale) * 100}%`, backgroundColor: categoryStyle(categoryFromApi(facts.highest.api)).hex }} /></div>
          </div>
          <div>
            <span title={`${facts.peakMedian.hour} MYT`}>Median peak</span>
            <strong>{facts.peakMedian.api}</strong>
            <div className="joy-digest-track"><span style={{ width: `${(facts.peakMedian.api / scale) * 100}%`, backgroundColor: peakCategory.hex }} /></div>
          </div>
        </div>
      ) : <p className="joy-digest-text">Not enough stored readings to compare.</p>}

      <p className="joy-digest-coverage">
        {facts.stationsReporting} stations · {facts.hoursCollected} of {facts.hoursExpected} hours collected
        {mover ? ` · Largest change ${mover.delta > 0 ? "+" : ""}${mover.delta} at ${mover.name}` : ""}
      </p>

      <details className="joy-digest-details">
        <summary>Read the full summary</summary>
        <p>{summary.summary}</p>
      </details>

      <p className="joy-digest-note">
        {digest.source === "gemini" ? "Gemini" : "Rule-based"} · Observed data, not a forecast ·{" "}
        <Link href="/methodology">How this is made</Link>
      </p>
    </section>
  );
}
