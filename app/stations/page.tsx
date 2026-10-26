import { DataUnavailable } from "@/components/data-unavailable";
import { StationExplorer } from "@/components/station-explorer";
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
import { summariseStates, toExplorerStations } from "@/lib/present";
import type { Snapshot } from "@/lib/types";

export const revalidate = 300;


export const metadata = {
  title: "Stations",
  description:
    "Every APIMS air-quality station in Malaysia, with current readings, coordinates and recent history.",
};

export default async function StationsPage() {
  let snapshot: Snapshot;
  try {
    snapshot = await getSnapshot();
  } catch {
    return <DataUnavailable />;
  }

  const explorer = toExplorerStations(snapshot);
  const states = summariseStates(snapshot);

  return (
    <div className="pb-6">
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

      <section className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <StationExplorer
          stations={explorer}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <SourceLinks sources={[SOURCES[0]]} compact />
          <p className="text-[11px] text-muted">
            Coordinates are the stations&apos; published APIMS positions.
          </p>
        </div>
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
                      className="!px-2 !py-0.5 !text-[8.5px]"
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
