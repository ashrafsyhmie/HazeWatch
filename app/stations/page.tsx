import { DataUnavailable } from "@/components/data-unavailable";
import { StationExplorer } from "@/components/station-explorer";
import { NearestStation } from "@/components/nearest-station";
import {
  CategoryBadge,
  ModeNotice,
  QuickLink,
  SectionHeading,
  SourceLinks,
} from "@/components/ui";
import { categoryStyle } from "@/lib/categories";
import { getSnapshot, SOURCES } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { getSeaStations } from "@/lib/openaq";
import { summariseStates, toExplorerStations } from "@/lib/present";

export const revalidate = 300;


export const metadata = {
  title: "Stations",
  description:
    "Every APIMS air-quality station in Malaysia, mapped across Southeast Asia, plus third-party PM2.5 for major regional cities.",
};

export default async function StationsPage() {
  const [snapshot, seaStations] = await Promise.all([
    getSnapshot().catch(() => null),
    getSeaStations(),
  ]);
  if (!snapshot) {
    return <DataUnavailable />;
  }

  const explorer = toExplorerStations(snapshot);
  const states = summariseStates(snapshot);

  return (
    <div className="joy-page joy-stations pb-6">
      <section className="mx-auto w-full max-w-[1240px] px-5 pb-8 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-medium text-signal/80">
              Station index
            </p>
            <h1 className="mt-3 text-4xl font-medium tracking-[-0.045em] text-fog sm:text-[52px]">
              Every station,
              <span className="text-muted"> one hour.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted">
              The official APIMS network reports an hourly Air Pollutant Index.
              Search by station or state, inspect the map, then open a station
              for its reading, classification and recent series.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 lg:w-[360px]">
            <div className="panel px-3.5 py-3">
              <p className="text-[11px] text-muted">
                Stations
              </p>
              <p className="num mt-1.5 text-[20px] font-medium text-fog">
                {snapshot.coverage.total}
              </p>
            </div>
            <div className="panel px-3.5 py-3">
              <p className="text-[11px] text-muted">
                Reporting
              </p>
              <p className="num mt-1.5 text-[20px] font-medium text-fog">
                {snapshot.coverage.reporting}
              </p>
            </div>
            <div className="panel px-3.5 py-3">
              <p className="text-[11px] text-muted">
                Hour
              </p>
              <p className="num mt-1.5 truncate text-[20px] font-medium text-fog">
                {snapshot.latestObservedAt
                  ? formatDateTime(snapshot.latestObservedAt).replace(" MYT", "")
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ModeNotice notice={snapshot.notice} mode={snapshot.mode} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="joy-finder">
          <div className="mb-3"><NearestStation stations={explorer} /></div>
          <StationExplorer
            stations={explorer}
            seaStations={seaStations}
            mapTheme="pastel"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <SourceLinks sources={[SOURCES[0]]} compact />
          <p className="text-[11px] text-muted">
            Map covers Southeast Asia; coordinates are the stations&apos; published APIMS positions.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1240px] px-5 sm:px-8">
        <SectionHeading
          title="Across Southeast Asia"
          description="A closer look at the air in nearby cities. PM2.5 uses a different scale from Malaysia's API."
        />
        {seaStations.length > 0 ? (
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {seaStations.map((station) => (
              <article key={station.id} className="panel px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-fog">{station.city}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{station.country}</p>
                  </div>
                   <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                    PM2.5
                  </span>
                </div>
                <p className="num mt-3 text-[28px] font-medium leading-none text-fog">
                  {Math.round(station.pm25)}
                  <span className="ml-1 text-[11px] font-normal text-muted">µg/m³</span>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-line bg-surface-2/60 px-4 py-4 text-[12px] text-muted">
            No recent regional PM2.5 readings are available.
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Source:{" "}
          <a href="https://openaq.org/" target="_blank" rel="noreferrer noopener" className="text-signal">
            OpenAQ ↗
          </a>
          . Recent PM2.5 only · Separate from Malaysia&apos;s API.
        </p>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1240px] px-5 sm:px-8">
        <SectionHeading
          eyebrow="By state"
          title="The highest reading in each state"
          description="Only stations reporting the latest complete hour are compared. A state with no comparable reading shows a dash rather than an older value."
          action={<QuickLink href="/methodology">How categories work</QuickLink>}
        />
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {states.map((state) => {
            const style = categoryStyle(state.highest?.category ?? "unavailable");
            return (
              <div key={state.state} className="panel px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-[12.5px] font-medium text-fog">
                    {state.state}
                  </h3>
                  <span className="shrink-0 text-[11px] text-muted">
                    {state.reporting}/{state.total}
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <p
                    className="num text-[26px] font-semibold leading-none tracking-[-0.04em]"
                    style={{ color: style.hex }}
                  >
                    {state.highest?.api ?? "—"}
                  </p>
                  {state.highest ? (
                    <CategoryBadge
                      category={state.highest.category}
                      className="!px-2 !py-0.5 !text-[11px]"
                    />
                  ) : null}
                </div>

                <p className="mt-1.5 truncate text-[11px] text-muted">
                  {state.highest
                    ? state.highest.name.split(",")[0]
                    : "No comparable reading"}
                </p>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, ((state.highest?.api ?? 0) / 300) * 100)}%`,
                      backgroundColor: style.hex,
                      opacity: state.highest ? 0.8 : 0,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
