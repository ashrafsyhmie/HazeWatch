import Link from "next/link";
import { DataUnavailable } from "@/components/data-unavailable";
import { MonthlyChart } from "@/components/charts";
import { QuickLink, SectionHeading } from "@/components/ui";
import { getMonthlyHistory, SOURCES } from "@/lib/data";
import { formatMonth } from "@/lib/format";
import {
  buildMonthlyRows,
  GAS_SERIES,
  PARTICULATE_SERIES,
} from "@/lib/present";

export const revalidate = 3600;

export const metadata = {
  title: "National history",
  description:
    "Long-run national air pollution context from OpenDOSM, kept separate from station observations and forecasts.",
};

const ORDER = ["PM25", "PM10", "O3", "NO2", "SO2", "CO"];

export default async function HistoryPage() {
  const monthly = await getMonthlyHistory();

  if (monthly.points.length === 0) {
    return (
      <DataUnavailable
        title="Monthly history is unavailable"
        message={
          monthly.notice ??
          "OpenDOSM did not return the monthly air pollution catalogue. Station observations are unaffected."
        }
      />
    );
  }

  const { rows, latest } = buildMonthlyRows(monthly.points);
  const ordered = [...latest].sort(
    (a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key),
  );
  const months = [...new Set(monthly.points.map((point) => point.month))].sort();
  const first = months[0];
  const last = months.at(-1) as string;

  return (
    <div className="pb-6">
      <section className="mx-auto w-full max-w-[1240px] px-5 pb-8 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-signal/80">
              Long-run context
            </p>
            <h1 className="mt-3 text-4xl font-medium tracking-[-0.045em] text-fog sm:text-[52px]">
              National history,
              <span className="text-muted"> not station weather.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted">
              Monthly national concentrations from OpenDOSM. This is context for
              the long run — it is not a station reading, not an hourly index and
              not a forecast. Station observations live in the{" "}
              <Link
                href="/stations"
                className="text-fog/85 underline decoration-line underline-offset-2 hover:text-signal"
              >
                station index
              </Link>
              .
            </p>
          </div>

          <div className="panel w-full px-5 py-4 sm:w-[300px]">
            <p className="text-[9.5px] uppercase tracking-[0.16em] text-muted">
              Catalogue coverage
            </p>
            <p className="num mt-2 text-[15px] text-fog">
              {formatMonth(first)} — {formatMonth(last)}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              {months.length} monthly records · Malaysia
            </p>
            <a
              href={SOURCES[2].url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-muted hover:text-signal"
            >
              OpenDOSM source ↗
            </a>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {ordered.map((item) => (
            <div key={item.key} className="panel px-4 py-3.5">
              <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">
                {item.label}
              </p>
              <p className="num mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em] text-fog">
                {item.value}
              </p>
              <p className="mt-1.5 text-[9.5px] text-muted">
                {item.unit} · {formatMonth(item.month)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <SectionHeading
          eyebrow="Two scales"
          title="Particulates and gases, kept apart"
          description="PM2.5 and PM10 are measured in micrograms per cubic metre. Gases are reported in parts per million. They share a source but not a scale, so they get separate axes."
        />

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                  Particulates
                </p>
                <h2 className="mt-1.5 text-[15px] font-medium text-fog">
                  PM2.5 and PM10
                </h2>
              </div>
              <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] text-muted">
                µg/m³
              </span>
            </div>
            <div className="mt-4">
              <MonthlyChart
                rows={rows}
                series={PARTICULATE_SERIES}
                unit="µg/m³"
                height={300}
              />
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                  Gases
                </p>
                <h2 className="mt-1.5 text-[15px] font-medium text-fog">
                  O₃, NO₂, SO₂ and CO
                </h2>
              </div>
              <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] text-muted">
                ppm
              </span>
            </div>
            <div className="mt-4">
              <MonthlyChart
                rows={rows}
                series={GAS_SERIES}
                unit="ppm"
                height={300}
              />
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1240px] px-5 sm:px-8">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="panel p-5 sm:p-6">
            <h2 className="text-[13px] font-medium text-fog">What this page is</h2>
            <ul className="mt-3 space-y-2.5 text-[11.5px] leading-relaxed text-fog/70">
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-good"
                />
                Monthly national concentrations published by the Department of
                Statistics Malaysia through OpenDOSM.
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-good"
                />
                Useful for long-run context: seasonality, multi-year direction,
                and the difference between pollutant families.
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-good"
                />
                Licensed CC BY 4.0; attribution is kept in the footer and source
                link.
              </li>
            </ul>
          </div>

          <div className="panel p-5 sm:p-6">
            <h2 className="text-[13px] font-medium text-fog">
              What this page is not
            </h2>
            <ul className="mt-3 space-y-2.5 text-[11.5px] leading-relaxed text-fog/70">
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-unhealthy"
                />
                Not a station series. The catalogue has no station dimension, so
                it is never used as station history.
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-unhealthy"
                />
                Not comparable with the API. Concentrations are not converted to
                the Air Pollutant Index.
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-unhealthy"
                />
                Not a forecast. There is no projection or alert built from these
                monthly values.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-[10px] leading-relaxed text-muted">
            Gaps in a line are missing catalogue values, not zeroes. The chart
            never interpolates across a missing month.
          </p>
          <div className="flex gap-2">
            <QuickLink href="/methodology">Read the method</QuickLink>
            <QuickLink href="/stations">Station observations</QuickLink>
          </div>
        </div>
      </section>
    </div>
  );
}
