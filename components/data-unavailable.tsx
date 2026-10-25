import Link from "next/link";

export function DataUnavailable({
  title = "Live observations are temporarily unavailable",
  message = "HazeWatch could not reach the APIMS network and has no recent stored snapshot to show. The station index, history and methodology pages remain available.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-[720px] px-5 py-24 text-center sm:px-8">
      <div className="panel px-6 py-12 sm:px-10">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M4 9c3-3.5 6-3.5 9 0s6 3.5 9 0"
              fill="none"
              stroke="#93a79e"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M4 15c3-3.5 6-3.5 9 0s6 3.5 9 0"
              fill="none"
              stroke="#93a79e"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-medium tracking-[-0.03em] text-fog">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-signal/30 bg-signal/[0.08] px-4 py-1.5 text-[12px] font-medium text-signal hover:bg-signal/[0.14]"
          >
            Try again
          </Link>
          <Link
            href="/methodology"
            className="rounded-full border border-line px-4 py-1.5 text-[12px] text-fog/85 hover:border-signal/40 hover:text-signal"
          >
            Read the method
          </Link>
        </div>
      </div>
    </section>
  );
}
