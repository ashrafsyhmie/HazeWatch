"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-24 text-center sm:px-8">
      <div className="panel px-6 py-12 sm:px-10">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-unhealthy/30 bg-unhealthy/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M12 8v5"
              stroke="#d95f5f"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.5" r="1" fill="#d95f5f" />
            <circle
              cx="12"
              cy="12"
              r="8.5"
              fill="none"
              stroke="#d95f5f"
              strokeOpacity="0.5"
              strokeWidth="1.4"
            />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-medium tracking-[-0.03em] text-fog">
          Something went wrong on this page.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted">
          No data was fabricated to fill the gap. Retry the page, or return to
          the overview while the source recovers.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-signal/30 bg-signal/[0.08] px-4 py-1.5 text-[12px] font-medium text-signal hover:bg-signal/[0.14]"
          >
            Retry
          </button>
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
