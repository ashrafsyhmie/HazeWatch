import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-24 text-center sm:px-8">
      <div className="panel px-6 py-12 sm:px-10">
        <p className="num text-[11px] uppercase tracking-[0.2em] text-muted">
          404
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-fog">
          That station or page is not here.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted">
          The APIMS station identifier may have changed, or the link may be
          incomplete. The station index lists every currently published station.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/stations"
            className="rounded-full border border-signal/30 bg-signal/[0.08] px-4 py-1.5 text-[12px] font-medium text-signal hover:bg-signal/[0.14]"
          >
            Browse stations
          </Link>
          <Link
            href="/"
            className="rounded-full border border-line px-4 py-1.5 text-[12px] text-fog/85 hover:border-signal/40 hover:text-signal"
          >
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
