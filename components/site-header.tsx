"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/stations", label: "Stations" },
  { href: "/history", label: "History" },
  { href: "/methodology", label: "Method" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface-2">
              <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M4 12.5c3.6-4.6 7.2-4.6 10.8-1s7.2 3.6 10.8-1"
                  fill="none"
                  stroke="#b6e57a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M4 19c3.6-4.6 7.2-4.6 10.8-1s7.2 3.6 10.8-1"
                  fill="none"
                  stroke="#31536b"
                  strokeOpacity="0.55"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="25.5" r="1.6" fill="#b6e57a" />
              </svg>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight text-fog">
                HazeWatch
              </span>
              <span className="rounded border border-line px-1 py-0.5 text-[11px] font-medium text-muted">
                MY
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            <span className="text-[11px] text-muted">
              APIMS
            </span>
          </div>
        </div>

        <nav
          aria-label="Main"
          className="scroll-thin -mx-1 flex items-center gap-1 overflow-x-auto px-1"
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-white/[0.07] text-fog"
                    : "text-muted hover:bg-white/[0.04] hover:text-fog"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-good" />
            <span className="text-[11px] font-medium text-muted">
              APIMS · MYT
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
