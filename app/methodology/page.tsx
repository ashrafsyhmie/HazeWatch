import { CATEGORIES } from "@/lib/categories";
import { getIngestionRuns, SOURCES } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const metadata = {
  title: "Method & limits",
  description:
    "How HazeWatch sources observations, classifies readings, calculates trends, uses Gemini and handles official forecasts.",
};

const INDEX = [
  { id: "layers", label: "Three layers" },
  { id: "categories", label: "API categories" },
  { id: "trends", label: "Trend rules" },
  { id: "timestamps", label: "Timestamps" },
  { id: "sources", label: "Sources" },
  { id: "forecast", label: "Forecast limits" },
  { id: "gemini", label: "Gemini" },
  { id: "maps", label: "Station map" },
  { id: "storage", label: "Storage & collection" },
  { id: "setup", label: "Setup" },
];

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line/70 pt-8 first:border-0 first:pt-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-fog">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[12.5px] leading-relaxed text-fog/70">
        {children}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "success"
      ? "border-good/25 bg-good/10 text-good"
      : status === "partial"
        ? "border-moderate/25 bg-moderate/10 text-moderate"
        : status === "failed"
          ? "border-unhealthy/25 bg-unhealthy/10 text-unhealthy"
          : "border-line bg-white/[0.03] text-muted";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] ${style}`}
    >
      {status}
    </span>
  );
}

export default async function MethodologyPage() {
  const runs = await getIngestionRuns(6);

  return (
    <div className="pb-6">
      <section className="mx-auto w-full max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-14">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-signal/80">
          Method &amp; limits
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-medium leading-[1.04] tracking-[-0.045em] text-fog sm:text-[52px]">
          What we know,
          <span className="text-muted"> how we know it, and what we refuse to guess.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          HazeWatch is an independent reader of official Malaysian data. This
          page documents the exact boundaries: what is observed, what is an
          official forecast, and what is our own analysis.
        </p>
      </section>

      <div className="mx-auto mt-10 grid w-full max-w-[1240px] gap-10 px-5 sm:px-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-muted">
              On this page
            </p>
            <ul className="mt-3 space-y-1.5">
              {INDEX.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-[11.5px] text-muted transition-colors hover:text-fog"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="space-y-10">
          <Section
            id="layers"
            eyebrow="01 · Separation"
            title="Three layers, never mixed"
          >
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-line/70 bg-surface-2/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-good">
                  Observation
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-fog/70">
                  Hourly API values published by DOE through APIMS, with station
                  coordinates and a source timestamp.
                </p>
              </div>
              <div className="rounded-xl border border-line/70 bg-surface-2/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ember">
                  Official forecast
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-fog/70">
                  MyCMAQ map products published by MetMalaysia. Linked as the
                  authoritative forecast, never re-drawn as our own.
                </p>
              </div>
              <div className="rounded-xl border border-line/70 bg-surface-2/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-signal">
                  HazeWatch insight
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-fog/70">
                  Deterministic trend comparisons and plain-language briefings,
                  explicitly labelled and limited to the observed window.
                </p>
              </div>
            </div>
            <p>
              The interface labels each layer at the point of display. HazeWatch
              does not assign official categories, does not issue official
              warnings, and does not convert a concentration into an API value.
            </p>
          </Section>

          <Section
            id="categories"
            eyebrow="02 · Classification"
            title="Malaysia's API bands, used as published"
          >
            <div className="overflow-hidden rounded-xl border border-line/70">
              <table className="w-full text-left text-[11.5px]">
                <thead className="bg-white/[0.03] text-[9.5px] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Band</th>
                    <th className="px-4 py-2.5 font-medium">API range</th>
                    <th className="px-4 py-2.5 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {CATEGORIES.map((category) => (
                    <tr key={category.key}>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 text-fog/90">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: category.hex }}
                          />
                          {category.label}
                        </span>
                      </td>
                      <td className="num px-4 py-2.5 text-muted">{category.range}</td>
                      <td className="px-4 py-2.5 text-muted">
                        {category.range === "Above 300"
                          ? "Hazardous"
                          : category.range === "201–300"
                            ? "Very unhealthy"
                            : category.range === "101–200"
                              ? "Unhealthy"
                              : category.range === "51–100"
                                ? "Moderate"
                                : "Good"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              When APIMS publishes a class label for the hour, HazeWatch displays
              that class. The numeric band is still computed and any mismatch is
              surfaced on the station page. We never substitute US AQI, PM2.5
              concentration thresholds or another country&apos;s scale for
              Malaysia&apos;s API.
            </p>
          </Section>

          <Section
            id="trends"
            eyebrow="03 · Analysis"
            title="Observed momentum, calculated with a fixed rule"
          >
            <ul className="space-y-2.5">
              <li>
                <span className="text-fog/90">Window:</span> the latest 24 hours
                of hourly readings for a station.
              </li>
              <li>
                <span className="text-fog/90">Comparison:</span> the latest
                reading against the reading closest to six hours earlier, within
                a 90-minute tolerance.
              </li>
              <li>
                <span className="text-fog/90">Threshold:</span> a change of at
                least ±10 API points is a trend. Smaller changes are stable. No
                history near the six-hour mark means the direction is
                insufficient.
              </li>
              <li>
                <span className="text-fog/90">Peak:</span> the highest observed
                value in the same 24-hour window, with its timestamp.
              </li>
            </ul>
            <p>
              These rules describe what already happened. They are not a
              statistical forecast, not a model, and not a prediction. A rise can
              reverse in the next hour, which is why every insight carries the
              observed timestamps.
            </p>
          </Section>

          <Section
            id="timestamps"
            eyebrow="04 · Time"
            title="Observation time is not retrieval time"
          >
            <ul className="space-y-2.5">
              <li>
                <span className="text-fog/90">Observed at:</span> the hour APIMS
                attributes to the reading. APIMS publishes Malaysia wall-clock
                values without an offset, so HazeWatch interprets that text as
                UTC+8 and stores a UTC instant.
              </li>
              <li>
                <span className="text-fog/90">Retrieved at:</span> when our
                collector received the row. This changes even when the
                observation does not.
              </li>
              <li>
                <span className="text-fog/90">Forecast cycle:</span> MyCMAQ cycle
                identifiers are stored and shown as published. Their LST labels
                are not silently converted into instants.
              </li>
              <li>
                <span className="text-fog/90">Display:</span> all interface times
                are Malaysia Time (UTC+8) unless explicitly marked otherwise.
              </li>
            </ul>
            <p>
              APIMS also returns an epoch field that behaves as if the wall clock
              were UTC. HazeWatch deliberately ignores it as an observation
              instant rather than inventing an eight-hour shift.
            </p>
          </Section>

          <Section
            id="sources"
            eyebrow="05 · Provenance"
            title="Official sources and their role"
          >
            <div className="space-y-3">
              {SOURCES.map((source) => (
                <div
                  key={source.id}
                  className="rounded-xl border border-line/70 bg-surface-2/50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-fog">
                      {source.name}
                    </p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[10px] text-muted hover:text-signal"
                    >
                      Source ↗
                    </a>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {source.attribution}
                  </p>
                </div>
              ))}
            </div>
            <p>
              ASMC hotspot and haze information is not ingested: its published
              terms restrict automated collection and reuse without permission.
              We link to official sources instead of copying them.
            </p>
          </Section>

          <Section
            id="forecast"
            eyebrow="06 · Forecast"
            title="Official maps, no invented numbers"
          >
            <p>
              MetMalaysia&apos;s MyCMAQ portal currently exposes forecast
              products as rendered map images and manifests. HazeWatch records
              the published cycle, retrieves the manifest to count available
              frames, and links to the official viewer.
            </p>
            <ul className="space-y-2.5">
              <li>
                <span className="text-fog/90">Enabled:</span> official map links,
                cycle identifiers, published pollutants and frame counts.
              </li>
              <li>
                <span className="text-fog/90">Disabled:</span> numeric forecast
                timelines, forecast peaks, station-level forecast values, and
                forecast-based alerts.
              </li>
              <li>
                <span className="text-fog/90">Why:</span> no verified
                machine-readable numeric feed is available. Reading pixels would
                be an estimate presented as data.
              </li>
            </ul>
            <p>
              MyCMAQ&apos;s LST frame labels are shown verbatim. Their numerical
              offset is not independently confirmed, so HazeWatch does not
              compare them with observation timestamps.
            </p>
          </Section>

          <Section
            id="gemini"
            eyebrow="07 · Explanation"
            title="Gemini explains; it does not decide"
          >
            <ul className="space-y-2.5">
              <li>
                The server builds a facts object from stored observations and
                calculated trends. Gemini receives only those facts.
              </li>
              <li>
                The response is constrained to a JSON schema and validated. Every
                number in the output must already appear in the supplied facts;
                otherwise the text is rejected.
              </li>
              <li>
                If Gemini is unconfigured, unreachable or fails validation, a
                deterministic rule-based briefing is shown instead. The label
                always tells you which one you are reading.
              </li>
              <li>
                Gemini never assigns a category, never creates a forecast and
                never receives the service-role or Maps keys. Requests are sent
                with <span className="num text-[11px]">store: false</span>.
              </li>
            </ul>
          </Section>

          <Section
            id="maps"
            eyebrow="08 · Maps"
            title="OpenFreeMap, with a usable fallback"
          >
            <p>
              The map uses MapLibre GL JS with OpenFreeMap tiles and the station
              coordinates published by APIMS. Markers show the current API value;
              selecting one opens the station name, state, observation time and a
              link to its detail page.
            </p>
            <p>
              No map API key is required. OpenFreeMap, OpenMapTiles and
              OpenStreetMap attribution stays visible on the map. If tiles or
              WebGL are unavailable, the searchable station list and selection
              panel remain usable. A dash means no reading, not zero.
            </p>
          </Section>

          <Section
            id="storage"
            eyebrow="09 · Persistence"
            title="Stored observations, idempotent collection"
          >
            <p>
              When Supabase is configured, observations are written with a
              uniqueness key of station, metric and observation time. Re-running
              collection updates the same row instead of duplicating it. Each
              source gets its own ingestion log with accepted and rejected
              counts, so one failing provider cannot hide another.
            </p>
            <p>
              Public tables have row-level security with read-only policies. The
              service-role key is used only on the server. Without Supabase
              credentials the app runs in a clearly labelled live-preview mode:
              it reads APIMS for the current window and archives nothing.
            </p>
            <p>
              A pinned station is stored in this browser&apos;s local storage.
              No account is created, no preference is sent to the server, and
              clearing site data removes it.
            </p>

            <div className="rounded-xl border border-line/70">
              <div className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  Recent collection runs
                </p>
                <p className="text-[9.5px] text-muted">Server-side log</p>
              </div>
              {runs.length === 0 ? (
                <p className="px-4 py-4 text-[11px] text-muted">
                  No stored collection runs are visible. This is expected
                  without Supabase configured, or before the first scheduled run.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10.5px]">
                    <thead className="bg-white/[0.02] text-[9px] uppercase tracking-[0.1em] text-muted">
                      <tr>
                        <th className="px-4 py-2 font-medium">Source</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Accepted</th>
                        <th className="px-3 py-2 font-medium">Rejected</th>
                        <th className="px-3 py-2 font-medium">Started</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/50">
                      {runs.map((run) => (
                        <tr key={run.id}>
                          <td className="px-4 py-2 text-fog/85">{run.sourceId}</td>
                          <td className="px-3 py-2">
                            <StatusPill status={run.status} />
                          </td>
                          <td className="num px-3 py-2 text-muted">{run.accepted}</td>
                          <td className="num px-3 py-2 text-muted">{run.rejected}</td>
                          <td className="num px-3 py-2 text-muted">
                            {formatDateTime(run.startedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>

          <Section
            id="setup"
            eyebrow="10 · Configuration"
            title="Environment and scheduled collection"
          >
            <p>
              Required for storage: <span className="num text-[11px]">NEXT_PUBLIC_SUPABASE_URL</span>,{" "}
              <span className="num text-[11px]">SUPABASE_SERVICE_ROLE_KEY</span> and{" "}
              <span className="num text-[11px]">CRON_SECRET</span>. Optional:{" "}
              <span className="num text-[11px]">GEMINI_API_KEY</span>,{" "}
              <span className="num text-[11px]">GEMINI_MODEL</span>.
              Maps work without credentials; provider settings live in lib/map.ts.
            </p>
            <p>
              Apply{" "}
              <span className="num text-[11px]">supabase/migrations/0001_init.sql</span>{" "}
              in the Supabase SQL editor, then schedule an authenticated request
              to <span className="num text-[11px]">/api/ingest</span> every hour.
              The endpoint accepts <span className="num text-[11px]">GET</span> or{" "}
              <span className="num text-[11px]">POST</span> with{" "}
              <span className="num text-[11px]">Authorization: Bearer &lt;CRON_SECRET&gt;</span>.
              The repository README covers Supabase Cron, Vercel Cron and map configuration.
            </p>
            <p>
              Credentials are never committed. The app remains usable without
              Google or Gemini configured; those layers degrade visibly rather
              than silently.
            </p>
          </Section>

          <Section
            id="limits"
            eyebrow="11 · Limits"
            title="Known limits and disclaimer"
          >
            <ul className="space-y-2.5">
              <li>
                APIMS endpoints are publicly reachable but undocumented. Their
                schema, rate limits and retention can change without notice.
              </li>
              <li>
                Missing or zero readings are treated as unavailable, never as
                clean air. Sentinel semantics are not confirmed.
              </li>
              <li>
                Stored history begins when collection begins. Early charts may be
                short, and the interface says so.
              </li>
              <li>
                HazeWatch is not an official government service and does not
                issue warnings. Follow DOE, MetMalaysia and local authorities for
                decisions.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
