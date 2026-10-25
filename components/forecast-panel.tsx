import type { ForecastStatus } from "@/lib/types";

function cycleLabel(cycleId: string | null): string {
  if (!cycleId) return "—";
  const [date, hour] = cycleId.split("_");
  if (!date || !hour) return cycleId;
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} · ${hour}`;
}

const POLLUTANT_LABELS: Record<string, string> = {
  PM25: "PM2.5",
  PM10: "PM10",
  O3: "O₃",
};

export function ForecastPanel({ status }: { status: ForecastStatus }) {
  return (
    <section className="panel flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-ember">
            Official forecast · separate source
          </p>
          <h2 className="mt-1.5 text-[15px] font-medium text-fog">
            MyCMAQ air-quality maps
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 text-[11px] font-medium text-ember">
          MetMalaysia
        </span>
      </div>

      {status.available ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line/70 bg-ink/40 px-3 py-2.5">
              <p className="text-[11px] text-muted">
                Latest cycle
              </p>
              <p className="num mt-1 text-[12.5px] text-fog">
                {cycleLabel(status.cycleId)}
              </p>
            </div>
            <div className="rounded-xl border border-line/70 bg-ink/40 px-3 py-2.5">
              <p className="text-[11px] text-muted">
                Last published frame
              </p>
              <p className="num mt-1 text-[12.5px] text-fog">
                {status.lastFrameLabel ?? "Not listed"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {status.pollutants.length > 0 ? (
              status.pollutants.map((pollutant) => (
                <span
                  key={pollutant}
                  className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] text-fog/80"
                >
                  {POLLUTANT_LABELS[pollutant] ?? pollutant}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted">
                Public map variables are not listed for this cycle.
              </span>
            )}
            {status.frameCount !== null ? (
              <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted">
                {status.frameCount} map frames
              </span>
            ) : null}
          </div>

          {status.error ? (
            <p className="rounded-lg border border-moderate/25 bg-moderate/[0.06] px-3 py-2 text-[11px] leading-relaxed text-moderate/90">
              The cycle is published, but its manifest could not be read:{" "}
              {status.error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-5">
          <p className="text-[12.5px] text-fog">Forecast maps are unavailable.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {status.error ?? "The MyCMAQ portal did not return a forecast cycle."}
          </p>
        </div>
      )}

      <a
        href={status.mapUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-ember/30 bg-ember/[0.08] px-3.5 py-1.5 text-[11.5px] font-medium text-ember transition-colors hover:bg-ember/[0.14]"
      >
        Open official forecast map
        <span aria-hidden="true" className="text-[11px]">
          ↗
        </span>
      </a>

      <div className="mt-auto pt-4">
        <p className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">
          These are official map products. HazeWatch has no verified numeric
          forecast feed, so numeric forecast timelines, forecast peaks and
          forecast-based alerts are switched off rather than estimated from
          images. Read the{" "}
          <a
            href="/methodology#forecast"
            className="text-fog/80 underline decoration-line underline-offset-2 hover:text-signal"
          >
            forecast limits
          </a>
          .
        </p>
      </div>
    </section>
  );
}
