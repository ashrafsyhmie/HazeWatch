import Link from "next/link";

const SOURCES = [
  {
    label: "DOE — APIMS",
    href: "https://eqms.doe.gov.my/apims/main",
    note: "Observed air pollutant index",
  },
  {
    label: "MetMalaysia — MyCMAQ",
    href: "https://mycmaq.met.gov.my/",
    note: "Official forecast maps",
  },
  {
    label: "OpenDOSM",
    href: "https://open.dosm.gov.my/data-catalogue/air_pollution",
    note: "Monthly national history",
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line/80">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface-2">
              <svg viewBox="0 0 32 32" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 12.5c3.6-4.6 7.2-4.6 10.8-1s7.2 3.6 10.8-1"
                  fill="none"
                  stroke="#b6e57a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M4 19c3.6-4.6 7.2-4.6 10.8-1s7.2 3.6 10.8-1"
                  fill="none"
                  stroke="#31536b"
                  strokeOpacity="0.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight">HazeWatch</span>
          </div>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
            An independent view of Malaysia&apos;s official air-quality
            observations. Readings belong to their sources. HazeWatch&apos;s
            analysis is clearly labelled and never presented as an official
            forecast or warning.
          </p>
        </div>

        <div>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Official sources
          </h2>
          <ul className="mt-4 space-y-3">
            {SOURCES.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group block"
                >
                  <span className="text-[13px] text-fog/90 group-hover:text-signal">
                    {source.label} ↗
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-muted">
                    {source.note}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Understand the data
          </h2>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            <li>
              <Link href="/methodology" className="text-fog/90 hover:text-signal">
                Methodology &amp; limits
              </Link>
            </li>
            <li>
              <Link href="/stations" className="text-fog/90 hover:text-signal">
                All stations
              </Link>
            </li>
            <li>
              <Link href="/history" className="text-fog/90 hover:text-signal">
                National history
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            Not an official government service. In an emergency, follow DOE and
            MetMalaysia advisories.
          </p>
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-5 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} HazeWatch. Built for Malaysia.</p>
          <p>Times shown in Malaysia Time (UTC+8) unless labelled otherwise.</p>
        </div>
      </div>
    </footer>
  );
}
